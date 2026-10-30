/**
 * Drag + snap + layers (P0–P5): schema, grid geometry, layer order, write paths, migration,
 * snap options and the design-frame transform. Pure logic only (no PIXI, no DOM).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
	CELL_NUDGE_MAX,
	designLayoutType,
	emptyBuilderFile,
	itemToNodeProps,
	nodePatchToItem,
	resolveGrid,
	serializeBuilderFile,
	sortBuilderFile,
	validateBuilderFile,
	type BuilderFile,
} from '../src/builder.schema';
import { cellCenterX, cellRect, gridBounds, gridY, offsetRows, type GridGeometry } from '../src/layout/grid';
import {
	ABOVE_LAYERS_Z,
	DEFAULT_GROUP_IDS,
	groupOrder,
	groupZ,
	isFlagged,
	itemOrder,
	itemZ,
	mergeOrder,
	moveBefore,
	moveInOrder,
	toggleInList,
} from '../src/layout/layers';
import { designTransform, formulaFor, worldOf } from '../src/layout/guards';
import { DESIGN_FRAMES, applyDragLayersMigration, applyLayoutMigration } from '../src/layout/migrate';
import { centreDelta, constrainAxis, nudgeDelta, snapDrag } from '../src/layout/snap';
import { clearGrid, clearUiOverride, patchGrid, setUiOverride, updateLayers } from '../src/mutate';
import { clampUiOverride, type UiFile } from '../../ui-builder/src/ui.schema';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const sharedUi = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages/ui-builder/ui.json'), 'utf8')) as UiFile;

// Locked In: SYMBOL_SIZE 130, REEL_ROWS [3, 5, 5, 3]
const SIZE = 130;
const GEOM: GridGeometry = { cell: SIZE, rows: [3, 5, 5, 3] };
const defaults = { pitch: SIZE, reels: 4 };

describe('drag-layers schema', () => {
	it('accepts grid, layers, frame.design and item.offset; rejects bad values', () => {
		const file = emptyBuilderFile();
		file.layout.grid = {
			desktop: { origin: { x: 4 }, pitch: { x: 140 }, reels: [null, { dy: 12 }], cells: { r1c2: { dx: 3, dy: -4 } }, symbolScale: 0.9 },
		};
		file.layout.layers = { groups: ['frame', 'background'], order: { symbols: ['tumbleSymbols'] }, hidden: ['group:fx'], locked: ['boardFrame'] };
		file.layout.frame = { ...applyLayoutMigration(emptyBuilderFile()).layout.frame!, design: DESIGN_FRAMES };
		file.layout.viewports.desktop.items.waysPlaque = { parent: 'board', offset: true, x: 5 };
		expect(validateBuilderFile(file)).toEqual([]);

		const bad = structuredClone(file) as BuilderFile;
		bad.layout.grid!.desktop!.pitch = { x: 0 };
		bad.layout.grid!.desktop!.cells = { r1c2: { dx: CELL_NUDGE_MAX + 1 }, nope: { dx: 1 } };
		bad.layout.grid!.desktop!.symbolScale = 4;
		(bad.layout.grid as Record<string, unknown>).bogusKey = {};
		(bad.layout.layers as Record<string, unknown>).extra = 1;
		(bad.layout.viewports.desktop.items.waysPlaque as Record<string, unknown>).offset = 'yes';
		const errors = validateBuilderFile(bad).join('\n');
		expect(errors).toMatch(/pitch\.x must be > 0/);
		expect(errors).toMatch(/within ±16px/);
		expect(errors).toMatch(/"nope" must look like r0c0/);
		expect(errors).toMatch(/symbolScale must be in \(0, 3\]/);
		expect(errors).toMatch(/unknown viewport "bogusKey"/);
		expect(errors).toMatch(/layers: unknown field "extra"/);
		expect(errors).toMatch(/offset/);
	});

	it('keeps old builder.json files valid (no grid / layers / design)', () => {
		expect(validateBuilderFile(applyLayoutMigration(emptyBuilderFile()))).toEqual([]);
	});

	it('sorts grid/layers/design deterministically', () => {
		const file = emptyBuilderFile();
		file.layout.grid = { mobileL: { pitch: { y: 1, x: 2 } }, desktop: { symbolScale: 1.1, origin: { y: 2, x: 1 } } };
		file.layout.layers = { locked: ['b'], groups: ['ui'] };
		const once = serializeBuilderFile(file);
		expect(serializeBuilderFile(JSON.parse(once) as BuilderFile)).toBe(once);
		expect(Object.keys(sortBuilderFile(file).layout.grid!)).toEqual(['desktop', 'mobileL']);
	});

	it('maps w/h to width/height for art props and back', () => {
		expect(itemToNodeProps({ x: 1, w: 200, h: 100 })).toMatchObject({ x: 1, width: 200, height: 100 });
		expect(nodePatchToItem({ width: 210, height: 90 })).toMatchObject({ w: 210, h: 90 });
	});
});

describe('grid geometry', () => {
	const flat = resolveGrid('desktop', undefined, defaults);

	it('empty grid reproduces the old fixed formulas exactly', () => {
		for (let reel = 0; reel < 4; reel += 1) {
			const offsetY = ((5 - GEOM.rows[reel]!) / 2) * SIZE;
			expect(offsetRows(GEOM, reel) * SIZE).toBe(offsetY);
			expect(cellCenterX(flat, GEOM, reel)).toBe(SIZE * (reel + 0.5)); // getSymbolX
			for (let row = 0; row < GEOM.rows[reel]!; row += 1) {
				expect(cellRect(flat, GEOM, reel, row)).toMatchObject({ x: reel * SIZE, y: offsetY + row * SIZE, width: SIZE, height: SIZE });
				// ReelSymbol: symbolY ((row + 0.5) * SIZE) + getReelOffsetY
				expect(gridY(flat, GEOM, reel, (row + 0.5) * SIZE)).toBe((row + 0.5) * SIZE + offsetY);
			}
		}
		expect(gridBounds(flat, GEOM)).toEqual({ x: 0, y: 0, width: 4 * SIZE, height: 5 * SIZE });
	});

	it('applies origin, spacing, reel offsets and clamped cell nudges', () => {
		const grid = resolveGrid(
			'mobileM',
			{
				mobileL: { origin: { x: 10, y: 5 }, pitch: { x: 150 }, reels: [null, { dy: 20 }] },
				mobileM: { cells: { r1c0: { dx: 40, dy: -3 } } },
			},
			defaults,
		);
		expect(grid.cells.r1c0).toEqual({ dx: CELL_NUDGE_MAX, dy: -3 });
		expect(cellRect(grid, GEOM, 1, 0)).toMatchObject({ x: 10 + 150 + CELL_NUDGE_MAX, y: 5 + 20 - 3 });
		expect(cellRect(grid, GEOM, 2, 0)).toMatchObject({ x: 10 + 300, y: 5 });
		expect(cellRect(grid, GEOM, 0, 0).y).toBe(5 + SIZE); // 3-high reel keeps its centring
		// animated y between rows interpolates the nudge (row 0 → row 1 halfway)
		expect(gridY(grid, GEOM, 1, SIZE)).toBeCloseTo(5 + 20 + SIZE + -1.5);
		// desktop chain does not see the mobile values
		expect(resolveGrid('desktop', { mobileL: { pitch: { x: 150 } } }, defaults).pitch.x).toBe(SIZE);
	});
});

describe('layers', () => {
	it('default order is the old stacking order and z is stable', () => {
		expect(groupOrder(undefined)).toEqual(DEFAULT_GROUP_IDS);
		expect(DEFAULT_GROUP_IDS).toEqual(['background', 'frame', 'grid', 'symbols', 'fx', 'overlay', 'ui']);
		expect(groupZ(undefined, 'background')).toBe(10);
		expect(groupZ(undefined, 'ui')).toBe(70);
		expect(groupZ(undefined, 'ui')).toBeLessThan(ABOVE_LAYERS_Z);
	});

	it('merges stored order with new defaults and moves items', () => {
		expect(mergeOrder(['c', 'a', 'gone'], ['a', 'b', 'c'])).toEqual(['c', 'a', 'b']);
		// the panel always stores a full list (moveInOrder of the merged order)
		const layers = { groups: moveInOrder(DEFAULT_GROUP_IDS, 'frame', -1), order: { fx: ['fireRims', 'expandingWild'] } };
		expect(groupOrder(layers).slice(0, 3)).toEqual(['frame', 'background', 'grid']);
		// a group added later keeps its default slot next to its predecessor
		expect(groupOrder({ groups: ['frame', 'background'] }).slice(0, 3)).toEqual(['frame', 'background', 'grid']);
		expect(groupZ(layers, 'frame')).toBeLessThan(groupZ(layers, 'background'));
		expect(itemOrder(layers, 'fx', ['expandingWild', 'fireRims', 'scatter'])).toEqual(['fireRims', 'expandingWild', 'scatter']);
		expect(itemZ(layers, 'fx', 'scatter', ['expandingWild', 'fireRims', 'scatter'])).toBe(3);
		expect(moveInOrder(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c']);
		expect(moveInOrder(['a', 'b', 'c'], 'c', 5)).toEqual(['a', 'b', 'c']);
		expect(moveBefore(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
		expect(moveBefore(['a', 'b', 'c'], 'a', null)).toEqual(['b', 'c', 'a']);
	});

	it('hidden/locked flags work per item and per group', () => {
		const hidden = toggleInList(toggleInList(undefined, 'group:fx', true), 'logo', true);
		expect(isFlagged(hidden, 'fireRims', 'fx')).toBe(true);
		expect(isFlagged(hidden, 'logo')).toBe(true);
		expect(isFlagged(toggleInList(hidden, 'logo', false), 'logo')).toBe(false);
	});
});

describe('write paths', () => {
	it('patchGrid / clearGrid write only the target keys and clamp', () => {
		const file = emptyBuilderFile();
		patchGrid(file, ['mobileL'], { kind: 'pitch', axis: 'x', value: -5 });
		patchGrid(file, ['mobileL'], { kind: 'reel', reel: 2, axis: 'dy', value: 7 });
		patchGrid(file, ['mobileL'], { kind: 'cell', reel: 0, row: 1, axis: 'dx', value: -99 });
		patchGrid(file, ['mobileL'], { kind: 'symbolScale', value: 9 });
		expect(file.layout.grid?.mobileL).toEqual({ pitch: { x: 1 }, reels: [null, null, { dy: 7 }], cells: { r0c1: { dx: -CELL_NUDGE_MAX } }, symbolScale: 3 });
		expect(file.layout.grid?.desktop).toBeUndefined();
		expect(validateBuilderFile(file)).toEqual([]);
		clearGrid(file, ['mobileL']);
		expect(file.layout.grid).toBeUndefined();
	});

	it('UI drags write a game-only uiOverride (dx/dy) and never ui.json', () => {
		const file = emptyBuilderFile();
		const before = JSON.stringify(sharedUi);
		setUiOverride(file, 'controlBar.spin', ['desktop'], { dx: 12.34, dy: -5, scale: 1.1 });
		expect(file.ui?.uiOverrides['controlBar.spin']?.desktop).toEqual({ dx: 12.3, dy: -5, scale: 1.1 });
		expect(JSON.stringify(sharedUi)).toBe(before);
		// guard rails: offsets stay within one frame, buttons keep their tap size
		const clamped = clampUiOverride(sharedUi, 'controlBar.spin', 'desktop', { dx: 99999, dy: -99999 }).value;
		expect(clamped.dx).toBe(1200);
		expect(clamped.dy).toBe(-675);
		clearUiOverride(file, 'controlBar.spin', ['desktop']);
		expect(file.ui?.uiOverrides['controlBar.spin']).toBeUndefined();
	});

	it('updateLayers prunes empty fields', () => {
		const file = emptyBuilderFile();
		updateLayers(file, (layers) => {
			layers.hidden = ['logo'];
		});
		expect(file.layout.layers).toEqual({ hidden: ['logo'] });
		updateLayers(file, (layers) => {
			layers.hidden = [];
		});
		expect(file.layout.layers).toBeUndefined();
	});
});

describe('migration', () => {
	it('renames lockedWaysPlaque, marks offsets, frees the frame, adds design frames; idempotent', () => {
		const file = applyLayoutMigration(emptyBuilderFile());
		file.layout.viewports.mobileM.items.lockedWaysPlaque = { x: 8, y: -4 };
		const once = applyDragLayersMigration(file, DESIGN_FRAMES);
		expect(once.changes.length).toBeGreaterThan(0);
		const items = once.file.layout.viewports.mobileM.items;
		expect(items.lockedWaysPlaque).toBeUndefined();
		expect(items.waysPlaque).toMatchObject({ x: 8, y: -4, offset: true });
		expect(once.file.layout.viewports.desktop.items.boardFrame?.follow).toBeUndefined();
		expect(once.file.layout.frame?.design?.portrait).toEqual({ w: 800, h: 1422 });
		expect(validateBuilderFile(once.file)).toEqual([]);
		const snapshot = JSON.stringify(once.file);
		expect(applyDragLayersMigration(once.file, DESIGN_FRAMES).changes).toEqual([]);
		expect(JSON.stringify(once.file)).toBe(snapshot);
	});

	it('the committed Locked In builder.json is already migrated', () => {
		const onDisk = JSON.parse(fs.readFileSync(path.join(repoRoot, 'apps/locked/src/game/builder.json'), 'utf8')) as BuilderFile;
		expect(validateBuilderFile(onDisk)).toEqual([]);
		expect(applyDragLayersMigration(onDisk, DESIGN_FRAMES).changes).toEqual([]);
	});
});

describe('snap + nudge', () => {
	const frame = { w: 1200, h: 675 };
	const insets = { top: 20, right: 20, bottom: 20, left: 20 };

	it('snaps to the centre and respects the option toggles', () => {
		expect(snapDrag({ x: 603, y: 300 }, frame, insets, []).x).toBe(600);
		const off = snapDrag({ x: 603, y: 301 }, frame, insets, [], 6, 8, { centre: false, edges: false, safe: false, items: false, grid: false });
		expect(off).toMatchObject({ x: 603, y: 301 });
		const itemOnly = snapDrag({ x: 402, y: 333 }, frame, insets, [{ x: 400, y: 100, w: 50, h: 50 }], 6, 8, { centre: false, grid: false, safe: false, edges: false });
		expect(itemOnly.x).toBe(400);
		expect(itemOnly.guides.xKind).toBe('item');
	});

	it('Ctrl nudges 8px, Shift 10px; Shift-drag locks one axis; centre delta', () => {
		expect(nudgeDelta('ArrowLeft', false, true)).toEqual({ x: -8, y: 0 });
		expect(nudgeDelta('ArrowDown', true)).toEqual({ x: 0, y: 10 });
		expect(constrainAxis({ x: 12, y: -3 })).toEqual({ x: 12, y: 0 });
		expect(constrainAxis({ x: 2, y: -9 })).toEqual({ x: 0, y: -9 });
		expect(centreDelta({ x: 100, y: 100, w: 50, h: 20 }, { x: 600, y: 337.5 }, 'h')).toEqual({ x: 475, y: 0 });
		expect(centreDelta({ x: 100, y: 100, w: 50, h: 20 }, { x: 600, y: 337.5 }, 'both')).toEqual({ x: 475, y: 227.5 });
	});
});

describe('design-frame transform (guards in game units)', () => {
	it('matches utils-layout layoutType and contain-fits the main frame', () => {
		expect(designLayoutType(1200, 675)).toBe('desktop');
		expect(designLayoutType(375, 667)).toBe('portrait');
		expect(designLayoutType(667, 375)).toBe('landscape');
		expect(designLayoutType(1000, 1000)).toBe('tablet');
		const file = applyLayoutMigration(emptyBuilderFile());
		expect(designTransform('desktop', file.layout.frame)).toEqual({ s: 1, ox: 0, oy: 0 }); // no design = identity
		const t = designTransform('desktop', { ...file.layout.frame!, design: DESIGN_FRAMES });
		expect(t.s).toBeCloseTo(1200 / 1422);
		expect(t.oy).toBeCloseTo((675 - 800 * t.s) / 2);
	});

	it('board x/y are main px; offset items add scaled offsets to the formula', () => {
		const file = applyDragLayersMigration(applyLayoutMigration(emptyBuilderFile()), DESIGN_FRAMES).file;
		const fallback = formulaFor(file.layout.frame);
		const t = designTransform('desktop', file.layout.frame);
		file.layout.viewports.desktop.items.board = { x: 711, y: 400 };
		expect(worldOf('desktop', 'board', file, fallback)).toEqual({ x: 711 * t.s + t.ox, y: 400 * t.s + t.oy });
		const plaqueBefore = worldOf('desktop', 'waysPlaque', file, fallback);
		file.layout.viewports.desktop.items.waysPlaque = { ...file.layout.viewports.desktop.items.waysPlaque, x: 20 };
		expect(worldOf('desktop', 'waysPlaque', file, fallback).x).toBeCloseTo(plaqueBefore.x + 20 * t.s);
	});
});
