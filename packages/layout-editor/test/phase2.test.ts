import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
	emptyBuilderFile,
	resolveViewportItem,
	serializeBuilderFile,
	validateBuilderFile,
	type BuilderFile,
} from '../src/builder.schema';
import { createHistory } from '../src/editor/history';
import { exportAllowed, formulaFor, layoutFindings, worldOf } from '../src/layout/guards';
import { DESIGN_FRAMES, applyDragLayersMigration, applyLayoutMigration, boardOrigin, titleOrigin } from '../src/layout/migrate';
import { nudgeDelta, snapDrag } from '../src/layout/snap';
import { copyViewportItems, patchNodeItems } from '../src/mutate';
import type { UiFile } from '../../ui-builder/src/ui.schema';

const ZERO = { top: 0, right: 0, bottom: 0, left: 0 };
const repoRootForUi = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
// Step C: band, popups and preview insets live in the shared ui.json; findings take it as input.
const sharedUi = JSON.parse(
	fs.readFileSync(path.join(repoRootForUi, 'packages/ui-builder/ui.json'), 'utf8'),
) as UiFile;

function migrated(): BuilderFile {
	return applyLayoutMigration(emptyBuilderFile());
}

describe('phase 2 layout', () => {
	it('migrates BOARD_FRAME_LAYOUT onto the two chain roots and keeps centres as formulas', () => {
		const file = migrated();
		expect(validateBuilderFile(file)).toEqual([]);
		expect(file.layout.frame).toMatchObject({
			boardAnchor: [0.5, 0.5],
			plaqueLocalYFactor: 0.34,
			framePadFactor: 0.34,
			titleMinY: 28,
			titleYFactor: 0.07,
		});
		expect(resolveViewportItem('desktop', 'board', file.layout.viewports)).toEqual({});
		expect(resolveViewportItem('laptop', 'waysPlaque', file.layout.viewports).parent).toBe('board');
		expect(resolveViewportItem('popoutS', 'fireRims', file.layout.viewports).follow).toBe(true);
		expect(file.layout.viewports.laptop.items.waysPlaque).toBeUndefined();
		expect(resolveViewportItem('mobileM', 'waysPlaque', file.layout.viewports).parent).toBe('board');
		expect(file.layout.viewports.mobileM.items.waysPlaque).toBeUndefined();
		expect(resolveViewportItem('mobileS', 'gameTitle', file.layout.viewports).messageId).toBe('game.title');
		expect(boardOrigin('desktop')).toEqual({ x: 600, y: 337.5 });
		expect(titleOrigin('desktop')).toEqual({ x: 600, y: Math.max(28, 675 * 0.07) });
		expect(boardOrigin('mobileL')).toEqual({ x: 212.5, y: 406 });
	});

	it('stores only the override diff, so phone S and M inherit L', () => {
		const file = emptyBuilderFile();
		patchNodeItems(file, 'board', ['mobileL'], { x: 12, y: 40 });
		expect(resolveViewportItem('mobileM', 'board', file.layout.viewports)).toMatchObject({ x: 12, y: 40 });
		expect(resolveViewportItem('mobileS', 'board', file.layout.viewports)).toMatchObject({ x: 12, y: 40 });
		expect(file.layout.viewports.mobileM.items.board).toBeUndefined();
		expect(file.layout.viewports.mobileS.items.board).toBeUndefined();
		expect(Object.keys(file.layout.viewports.mobileL.items.board ?? {})).toEqual(['x', 'y']);
	});

	it('moves children when the parent moves and leaves their local offset stored', () => {
		const file = migrated();
		const before = worldOf('mobileL', 'waysPlaque', file, formulaFor(file.layout.frame));
		patchNodeItems(file, 'board', ['mobileL'], { x: before.x + 30, y: 406 });
		const local = resolveViewportItem('mobileL', 'waysPlaque', file.layout.viewports);
		expect(local.x).toBeUndefined();
		expect(local.parent).toBe('board');
		const after = worldOf('mobileL', 'waysPlaque', file, formulaFor(file.layout.frame));
		expect(after.x).toBeCloseTo(before.x + 30);
		expect(after.y).toBeCloseTo(before.y);
		expect(file.layout.viewports.mobileM.items.board).toBeUndefined();
		expect(worldOf('mobileM', 'waysPlaque', file, formulaFor(file.layout.frame)).x).toBeCloseTo(before.x + 30);
	});

	it('snaps to the centre, the safe edge, another item, then the 8px grid', () => {
		expect(snapDrag({ x: 604, y: 10 }, { w: 1200, h: 675 }, ZERO, []).guides.x).toBe(600);
		const safe = snapDrag({ x: 4, y: 100 }, { w: 1200, h: 675 }, { top: 47, right: 0, bottom: 34, left: 0 }, []);
		expect(safe.x).toBe(0);
		const other = snapDrag({ x: 202, y: 50 }, { w: 1200, h: 675 }, ZERO, [{ x: 200, y: 0, w: 40, h: 40 }]);
		expect(other.x).toBe(200);
		const grid = snapDrag({ x: 23, y: 23 }, { w: 1200, h: 675 }, ZERO, []);
		expect(grid.x).toBe(24);
		expect(grid.y).toBe(24);
		expect(grid.guides.x).toBeUndefined();
	});

	it('nudges 1px and 10px', () => {
		expect(nudgeDelta('ArrowRight', false)).toEqual({ x: 1, y: 0 });
		expect(nudgeDelta('ArrowUp', true)).toEqual({ x: 0, y: -10 });
	});

	it('turns the desktop control-bar overlap red and blocks export, and still allows a clean file', () => {
		const blocked = emptyBuilderFile();
		patchNodeItems(blocked, 'hud', ['desktop'], { x: 100, y: 600 });
		blocked.layout.viewports.desktop.items.hud!.w = 40;
		blocked.layout.viewports.desktop.items.hud!.h = 20;
		const blockedFindings = layoutFindings(blocked, () => ({ x: 0, y: 0 }), 'en', sharedUi);
		expect(blockedFindings.some((finding) => finding.code === 'control-bar' && finding.level === 'red')).toBe(true);
		expect(exportAllowed(blockedFindings)).toBe(false);

		const clean = emptyBuilderFile();
		patchNodeItems(clean, 'hud', ['desktop'], { x: 100, y: 100 });
		clean.layout.viewports.desktop.items.hud!.w = 40;
		clean.layout.viewports.desktop.items.hud!.h = 20;
		expect(exportAllowed(layoutFindings(clean, () => ({ x: 0, y: 0 }), 'en', sharedUi))).toBe(true);
	});

	it('flags safe area, missing message ids, overflow, tap targets, and popups that need a scrollbar', () => {
		const file = emptyBuilderFile();
		patchNodeItems(file, 'badge', ['mobileL'], { x: 10, y: 8 });
		file.layout.viewports.mobileL.items.badge!.kind = 'button';
		file.layout.viewports.mobileL.items.badge!.w = 20;
		file.layout.viewports.mobileL.items.badge!.h = 20;
		file.layout.viewports.mobileL.items.caption = { kind: 'text', fontSize: 10, w: 40, h: 16, x: 80, y: 200 };
		file.layout.viewports.desktop.items.gameTitle = {
			kind: 'text',
			messageId: 'game.title',
			fontSize: 28,
			w: 80,
			h: 36,
			x: 400,
			y: 80,
		};
		const findings = layoutFindings(file, () => ({ x: 0, y: 0 }), 'fi', sharedUi);
		expect(findings.some((finding) => finding.code === 'safe-area' && finding.id === 'badge')).toBe(true);
		expect(findings.some((finding) => finding.code === 'text-id' && finding.id === 'caption')).toBe(true);
		expect(findings.some((finding) => finding.code === 'text-size')).toBe(true);
		expect(findings.some((finding) => finding.code === 'tap-target' && finding.viewport === 'mobileL')).toBe(true);
		expect(findings.some((finding) => finding.code === 'text-overflow' && finding.level === 'amber')).toBe(true);

		const popups = migrated();
		const popupFindings = layoutFindings(popups, undefined, 'en', sharedUi);
		expect(popupFindings.some((finding) => finding.code === 'popup-scroll' && finding.id === 'betMenu')).toBe(true);
		expect(popupFindings.some((finding) => finding.code === 'control-bar' && finding.id === 'waysPlaque')).toBe(true);
		expect(exportAllowed(popupFindings)).toBe(false);
	});

	it('rejects a literal message id and keeps undo after a save snapshot', () => {
		const file = emptyBuilderFile();
		file.layout.viewports.desktop.items.label = { kind: 'text', messageId: 'LOCKED IN' };
		expect(validateBuilderFile(file).join('\n')).toMatch(/Lingui/);
		const roundTrip = JSON.parse(serializeBuilderFile(migrated())) as BuilderFile;
		expect(validateBuilderFile(roundTrip)).toEqual([]);

		let value = { x: 1 };
		const history = createHistory({
			snapshot: () => value,
			restore: (next) => {
				value = next;
			},
		});
		history.record(() => {
			value = { x: 2 };
		});
		const saved = JSON.stringify(value);
		expect(saved).toBe('{"x":2}');
		history.undo();
		expect(value.x).toBe(1);
		expect(saved).toBe('{"x":2}');
	});

	it('matches the committed demo builder.json', () => {
		// drag-layers P0: the committed file also carries the (idempotent) drag/layers migration.
		const file = applyDragLayersMigration(migrated(), DESIGN_FRAMES).file;
		file.$schema = '../../../../packages/layout-editor/builder.schema.json';
		file.art = { mark: { src: 'art/mark/mark.webp' } };
		const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
		const onDisk = JSON.parse(
			fs.readFileSync(path.join(repoRoot, 'apps/locked/src/game/builder.json'), 'utf8'),
		) as BuilderFile;
		// Step C moved the popups to ui.json (values preserved there) and added the landscape keys.
		const expected = JSON.parse(serializeBuilderFile(file)).layout;
		const migratedPopups = expected.popups;
		delete expected.popups;
		expect(onDisk.layout).toEqual(expected);
		expect(sharedUi.popups).toMatchObject(migratedPopups);
	});

	it('copies one viewport onto another without flattening the rest of the chain', () => {
		const file = emptyBuilderFile();
		patchNodeItems(file, 'board', ['desktop'], { x: 11 });
		copyViewportItems(file, 'desktop', 'mobileL');
		expect(file.layout.viewports.mobileL.items.board).toMatchObject({ x: 11 });
		expect(file.layout.viewports.laptop.items.board).toBeUndefined();
		expect(resolveViewportItem('laptop', 'board', file.layout.viewports).x).toBe(11);
	});
});
