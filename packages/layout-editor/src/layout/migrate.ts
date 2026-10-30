/**
 * Phase 2 layout-constants migration (M12).
 *
 * BOARD_FRAME_LAYOUT used to be hard-coded next to the board draw. Those
 * numbers now live on builder.json `layout.frame`. x/y are not baked per
 * viewport: the formula still centres the board in whichever Stake key is
 * the design frame, so phone S/M keep inheriting from L.
 */
import { VIEWPORTS, type BuilderFile, type FrameLayout, type PopupEntry, type ViewportKey } from '../builder.schema';

export const BOARD_FRAME_LAYOUT: FrameLayout = {
	boardAnchor: [0.5, 0.5],
	titleYFactor: 0.07,
	titleMinY: 28,
	plaqueLocalYFactor: 0.34,
	framePadFactor: 0.34,
};

const POPUP_IDS = ['betMenu', 'menu', 'autospin', 'bonusPage'] as const;

function popup(contentHeight: number, mobileScroll: boolean): PopupEntry {
	return {
		contentHeight,
		viewports: {
			desktop: { maxHeight: 520, padding: 16, scrollbar: true },
			mobileL: { maxHeight: 480, padding: 12, scrollbar: mobileScroll },
		},
	};
}

/** Structural children and Lingui-ready text. Written on the two chain roots only. */
export function applyLayoutMigration(file: BuilderFile): BuilderFile {
	file.layout.frame = {
		boardAnchor: [...BOARD_FRAME_LAYOUT.boardAnchor],
		titleYFactor: BOARD_FRAME_LAYOUT.titleYFactor,
		titleMinY: BOARD_FRAME_LAYOUT.titleMinY,
		plaqueLocalYFactor: BOARD_FRAME_LAYOUT.plaqueLocalYFactor,
		framePadFactor: BOARD_FRAME_LAYOUT.framePadFactor,
	};
	for (const root of ['desktop', 'mobileL'] as const) {
		const items = file.layout.viewports[root].items;
		items.boardFrame = { parent: 'board', follow: true };
		items.fireRims = { parent: 'board', follow: true };
		items.waysPlaque = {
			parent: 'board',
			kind: 'text',
			messageId: 'ways.plaque',
			fontSize: 14,
			w: 160,
			h: 32,
		};
		items.gameTitle = {
			kind: 'text',
			messageId: 'game.title',
			fontSize: 28,
			w: 280,
			anchor: [0.5, 1],
		};
	}
	file.layout.popups = {
		betMenu: popup(560, false),
		menu: popup(400, true),
		autospin: popup(360, true),
		bonusPage: popup(640, false),
	};
	return file;
}

export function boardOrigin(key: ViewportKey, frame: FrameLayout = BOARD_FRAME_LAYOUT): { x: number; y: number } {
	const spec = VIEWPORTS[key];
	return { x: spec.w * frame.boardAnchor[0], y: spec.h * frame.boardAnchor[1] };
}

export function titleOrigin(key: ViewportKey, frame: FrameLayout = BOARD_FRAME_LAYOUT): { x: number; y: number } {
	const spec = VIEWPORTS[key];
	return { x: spec.w / 2, y: Math.max(frame.titleMinY, spec.h * frame.titleYFactor) };
}

export const POPUP_NAMES = POPUP_IDS;

/** Locked In main-layout design frames per layout type (utils-layout mainSizesMap). */
export const DESIGN_FRAMES: NonNullable<FrameLayout['design']> = {
	desktop: { w: 1422, h: 800 },
	tablet: { w: 1000, h: 1000 },
	landscape: { w: 1600, h: 900 },
	portrait: { w: 800, h: 1422 },
};

/** Runtime ids renamed so builder.json and the game agree (drag-layers P0). */
export const RENAMED_IDS: Record<string, string> = { lockedWaysPlaque: 'waysPlaque' };

/**
 * Drag-layers P0 migration. Idempotent; keeps every existing value.
 * - `lockedWaysPlaque` (runtime offset wrapper) → `waysPlaque`; its x/y are offsets (`offset: true`).
 * - `gameLogo` x/y are offsets too.
 * - `boardFrame` stops following the board so the frame can be placed on its own (still board-local).
 * - `layout.frame.design` records the game's design frames so the guards can convert board px.
 */
export function applyDragLayersMigration(
	file: BuilderFile,
	design?: NonNullable<FrameLayout['design']>,
): { file: BuilderFile; changes: string[] } {
	const changes: string[] = [];
	for (const [key, entry] of Object.entries(file.layout.viewports)) {
		const items = entry.items;
		for (const [from, to] of Object.entries(RENAMED_IDS)) {
			const old = items[from];
			if (!old) continue;
			items[to] = { ...(items[to] ?? {}), ...old };
			delete items[from];
			changes.push(`${key}: ${from} → ${to}`);
		}
		for (const id of ['waysPlaque', 'gameLogo']) {
			const item = items[id];
			if (item && (item.x !== undefined || item.y !== undefined || key === 'desktop' || key === 'mobileL') && !item.offset) {
				item.offset = true;
				changes.push(`${key}: ${id}.offset = true`);
			}
		}
		const frameItem = items.boardFrame;
		if (frameItem?.follow) {
			delete frameItem.follow;
			changes.push(`${key}: boardFrame no longer follows (draggable, still parent board)`);
		}
	}
	if (design && file.layout.frame && !file.layout.frame.design) {
		file.layout.frame.design = JSON.parse(JSON.stringify(design));
		changes.push('layout.frame.design added');
	}
	return { file, changes };
}
