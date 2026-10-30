/**
 * builder.json (v1).
 *
 * One file per game: apps/<game>/src/game/builder.json.
 * Sections: layout (UI), art, spine, audio, events.
 * Each panel writes only its own section.
 *
 * layout.viewports has the seven Stake keys plus three mobile-landscape keys
 * (step C, specs/ui_split_and_orientation.md). There is no `"*"` bucket.
 * Only overrides are stored. Items are in that key's design-frame pixels.
 *
 * Shared chrome (control-bar band, popups, modals, …) lives in packages/ui-builder/ui.json.
 * The game pins a ui.json version in the `ui` section and may add explicit `uiOverrides`.
 */
import type { NodeProps } from './layout.schema';
import { spineSectionErrors } from './spine/validate';

export const VIEWPORT_KEYS = [
	'desktop',
	'laptop',
	'popoutL',
	'popoutS',
	'mobileL',
	'mobileM',
	'mobileS',
	'mobileL_land',
	'mobileM_land',
	'mobileS_land',
] as const;

/** Mobile landscape keys (step C). Optional in older files; missing ones are read as empty. */
export const MOBILE_LANDSCAPE_KEYS = ['mobileL_land', 'mobileM_land', 'mobileS_land'] as const;

export type ViewportKey = (typeof VIEWPORT_KEYS)[number];

/** 'landscape' = desktop family (desktop/laptop/popouts). 'mobileLandscape' = phone held sideways. */
export type ViewportFamily = 'landscape' | 'portrait' | 'mobileLandscape';

export type ViewportSpec = {
	w: number;
	h: number;
	/** Immediate fallback. null = root of the chain. */
	fallback: ViewportKey | null;
	family: ViewportFamily;
	/** Starting control-bar band, stored only on the roots. Descendants inherit. */
	controlBar: number | null;
};

export const VIEWPORTS: Record<ViewportKey, ViewportSpec> = {
	desktop: { w: 1200, h: 675, fallback: null, family: 'landscape', controlBar: 110 },
	laptop: { w: 1024, h: 576, fallback: 'desktop', family: 'landscape', controlBar: null },
	popoutL: { w: 800, h: 450, fallback: 'desktop', family: 'landscape', controlBar: null },
	popoutS: { w: 400, h: 225, fallback: 'popoutL', family: 'landscape', controlBar: null },
	mobileL: { w: 425, h: 812, fallback: null, family: 'portrait', controlBar: 180 },
	mobileM: { w: 375, h: 667, fallback: 'mobileL', family: 'portrait', controlBar: null },
	mobileS: { w: 320, h: 568, fallback: 'mobileM', family: 'portrait', controlBar: null },
	// Mobile landscape: swapped sizes. Inheritance per SlotMath Dev sign-off:
	// mobileL_land -> mobileL; mobileM_land -> mobileL_land; mobileS_land -> mobileM_land.
	// Band starts at 110 (spec "Mobile landscape band starts at 110"); the live value is in ui.json.
	mobileL_land: { w: 812, h: 425, fallback: 'mobileL', family: 'mobileLandscape', controlBar: 110 },
	mobileM_land: { w: 667, h: 375, fallback: 'mobileL_land', family: 'mobileLandscape', controlBar: null },
	mobileS_land: { w: 568, h: 320, fallback: 'mobileM_land', family: 'mobileLandscape', controlBar: null },
};

/** Largest to smallest. Orientation picks the family; fit picks the key. */
export const LANDSCAPE_KEYS: readonly ViewportKey[] = ['desktop', 'laptop', 'popoutL', 'popoutS'];
export const PORTRAIT_KEYS: readonly ViewportKey[] = ['mobileL', 'mobileM', 'mobileS'];
export const MOBILE_LANDSCAPE_FAMILY: readonly ViewportKey[] = ['mobileL_land', 'mobileM_land', 'mobileS_land'];

export type PointerKind = 'coarse' | 'fine';

/** Portrait mobile key <-> its landscape twin (editor toggle). Desktop-family keys map to themselves. */
export const ORIENTATION_TWIN: Partial<Record<ViewportKey, ViewportKey>> = {
	mobileL: 'mobileL_land',
	mobileM: 'mobileM_land',
	mobileS: 'mobileS_land',
	mobileL_land: 'mobileL',
	mobileM_land: 'mobileM',
	mobileS_land: 'mobileS',
};

export function isMobileLandscapeKey(key: ViewportKey): boolean {
	return VIEWPORTS[key].family === 'mobileLandscape';
}

export function isMobileKey(key: ViewportKey): boolean {
	return VIEWPORTS[key].family !== 'landscape';
}

export const PIN_VALUES = ['top', 'bottom', 'center', 'none'] as const;
export type Pin = (typeof PIN_VALUES)[number];

/** Stored item. anchor is 0–1. x/y are design-frame pixels of that viewport, or local pixels when parent is set. */
export type LayoutItem = {
	x?: number;
	y?: number;
	scale?: number;
	anchor?: [number, number];
	visible?: boolean;
	z?: number;
	pin?: Pin;
	/** This item's x/y are local to the parent item. Dragging the parent moves it. */
	parent?: string;
	/** Not picked on its own. Fire rims use this so they stay locked to the board. */
	follow?: boolean;
	/**
	 * x/y are an offset from the item's computed (formula) position, not absolute. Runtime
	 * wrappers such as the logo and the WAYS plaque store offsets; the guards add them to the formula.
	 */
	offset?: boolean;
	w?: number;
	h?: number;
	kind?: ItemKind;
	/** Lingui message id (`game.title`). A literal string is rejected. */
	messageId?: string;
	fontSize?: number;
};

export const ITEM_KINDS = ['node', 'text', 'button'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ITEM_KEYS = [
	'x',
	'y',
	'scale',
	'anchor',
	'visible',
	'z',
	'pin',
	'parent',
	'follow',
	'offset',
	'w',
	'h',
	'kind',
	'messageId',
	'fontSize',
] as const;

export type Insets = { top: number; right: number; bottom: number; left: number };

/** Numbers that used to live in constants.ts as BOARD_FRAME_LAYOUT. */
export type FrameLayout = {
	boardAnchor: [number, number];
	titleYFactor: number;
	titleMinY: number;
	plaqueLocalYFactor: number;
	framePadFactor: number;
	/**
	 * The game's design frames (utils-layout mainSizesMap) per layout type. When present, items
	 * stored in the game's main-layout space (the board) are converted to Stake viewport px by the
	 * guards, so the editor's findings match where the game draws. Absent = identity.
	 */
	design?: Partial<Record<DesignLayoutType, { w: number; h: number }>>;
};

export const DESIGN_LAYOUT_TYPES = ['desktop', 'tablet', 'landscape', 'portrait'] as const;
export type DesignLayoutType = (typeof DESIGN_LAYOUT_TYPES)[number];

/** Max per-cell nudge (px, board space). Julius: small per-cell nudges, no free per-cell y. */
export const CELL_NUDGE_MAX = 16;

/** Reel grid geometry in board-local px (see apps/<game>/src/game/grid.ts). Only overrides are stored. */
export type GridLayout = {
	/** Shift of the whole grid inside the board. Default {x:0, y:0}. */
	origin?: { x?: number; y?: number };
	/** Cell spacing (pitch). Default = the game's SYMBOL_SIZE. */
	pitch?: { x?: number; y?: number };
	/** Per-reel offset, index = reel. null/missing = 0. */
	reels?: Array<{ dx?: number; dy?: number } | null>;
	/** Per-cell nudge, key `r{reel}c{row}` (row = visible row from the top, 0-based). Clamped to ±CELL_NUDGE_MAX. */
	cells?: Record<string, { dx?: number; dy?: number }>;
	/** Symbol art scale inside its cell (1 = the game's default fit). */
	symbolScale?: number;
};

export type ResolvedGrid = {
	origin: { x: number; y: number };
	pitch: { x: number; y: number };
	reels: { dx: number; dy: number }[];
	cells: Record<string, { dx: number; dy: number }>;
	symbolScale: number;
};

/**
 * Layer panel metadata. `groups` and `order` are read by the game (render order).
 * `hidden` and `locked` are editor-only: the runtime applies `hidden` in dev builds only.
 */
export type LayerConfig = {
	/** Group ids, bottom to top. Missing groups keep their default slot. */
	groups?: string[];
	/** Items per group, bottom to top. Missing items keep their default slot. */
	order?: Record<string, string[]>;
	/** Editor-only eye (item or group ids). */
	hidden?: string[];
	/** Editor-only lock (item or group ids). */
	locked?: string[];
};

export type PopupViewport = {
	maxHeight?: number;
	padding?: number;
	scrollbar?: boolean;
};

export type PopupEntry = {
	contentHeight?: number;
	viewports?: Partial<Record<ViewportKey, PopupViewport>>;
};

export type ViewportEntry = {
	w: number;
	h: number;
	items: Record<string, LayoutItem>;
};

export type ControlBarMap = Partial<Record<ViewportKey, number>>;

export type TunableMap = Record<string, Partial<Record<ViewportKey, number>>>;

export type LayoutSection = {
	viewports: Record<ViewportKey, ViewportEntry>;
	tunables: TunableMap;
	/**
	 * Legacy (step B). Step C moved the control-bar band to ui.json `guardRails.controlBar`
	 * and the preview insets to ui.json `guardRails.previewInsets`. Kept optional so old files
	 * still load; builder:check warns when a game still carries them.
	 */
	reserved: { controlBar?: ControlBarMap; safeArea?: Partial<Record<ViewportKey, Insets>> };
	/** Migrated BOARD_FRAME_LAYOUT. Absent until Phase 2 migration. */
	frame?: FrameLayout;
	/** Legacy (step B). Step C moved the popups to ui.json `popups`. */
	popups?: Record<string, PopupEntry>;
	/** Reel grid per viewport key, with the normal fallback chain. */
	grid?: Partial<Record<ViewportKey, GridLayout>>;
	/** Layer panel: group/item render order (runtime) + editor-only eye/lock. */
	layers?: LayerConfig;
};

/** Game side of the shared UI layer: the pinned ui.json version and explicit overrides. */
/** dx/dy: offset (local px) from the shared layout position, written by on-canvas drag of a UI item. */
export type UiOverrideValue = {
	x?: number;
	y?: number;
	dx?: number;
	dy?: number;
	scale?: number;
	visible?: boolean;
	z?: number;
	h?: number;
};
export type GameUiSection = {
	/** ui.json version this game is built against (packages/ui-builder/releases/<pin>.json). */
	pin: string;
	/** uiOverrides[itemId][viewportKey]. Clamped by the ui.json guard rails at read time. */
	uiOverrides: Record<string, Partial<Record<ViewportKey, UiOverrideValue>>>;
};

export const BUILDER_SECTIONS = ['layout', 'art', 'spine', 'audio', 'events', 'ui'] as const;
/** Sections every builder.json must have. `ui` is optional so step-B files still validate. */
export const REQUIRED_SECTIONS = ['layout', 'art', 'spine', 'audio', 'events'] as const;
export type BuilderSection = (typeof BUILDER_SECTIONS)[number];

export type BuilderFile = {
	$schema?: string;
	version: 1;
	layout: LayoutSection;
	art: Record<string, unknown>;
	spine: Record<string, unknown>;
	audio: Record<string, unknown>;
	events: Record<string, unknown>;
	ui?: GameUiSection;
};

export function emptyLayoutSection(): LayoutSection {
	const viewports = {} as Record<ViewportKey, ViewportEntry>;
	for (const key of VIEWPORT_KEYS) {
		const spec = VIEWPORTS[key];
		viewports[key] = { w: spec.w, h: spec.h, items: {} };
	}
	return {
		viewports,
		tunables: {},
		// Step C: the band moved to ui.json (guardRails.controlBar). Games no longer store it.
		reserved: { controlBar: {} },
	};
}

export function emptyBuilderFile(): BuilderFile {
	return {
		version: 1,
		layout: emptyLayoutSection(),
		art: {},
		spine: {},
		audio: { version: 1 },
		events: {},
	};
}

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Oldest ancestor first, including the key itself. */
export function ancestorChain(key: ViewportKey): ViewportKey[] {
	const stack: ViewportKey[] = [];
	const seen = new Set<ViewportKey>();
	let current: ViewportKey | null = key;
	while (current && !seen.has(current)) {
		seen.add(current);
		stack.push(current);
		current = VIEWPORTS[current].fallback;
	}
	return stack.reverse();
}

/**
 * Orientation rule (SlotMath Dev sign-off, step C):
 * h > w → mobile portrait; w > h with a coarse pointer → mobile landscape; otherwise the
 * desktop family. `pointer` defaults to 'fine', so callers that don't pass it keep the
 * step-B behaviour (e.g. a desktop 844×390 window is still popoutS).
 */
export function viewportFamily(width: number, height: number, pointer: PointerKind = 'fine'): ViewportFamily {
	if (height > width) return 'portrait';
	if (width > height && pointer === 'coarse') return 'mobileLandscape';
	return 'landscape';
}

/**
 * Within the family, the largest key whose w and h both fit. If none fit, the smallest
 * key (the renderer then scales). A dev size-picker override wins over the window.
 */
export function pickViewport(width: number, height: number, pointer: PointerKind = 'fine'): ViewportKey {
	const kind = viewportFamily(width, height, pointer);
	const family =
		kind === 'portrait' ? PORTRAIT_KEYS : kind === 'mobileLandscape' ? MOBILE_LANDSCAPE_FAMILY : LANDSCAPE_KEYS;
	for (const key of family) {
		const spec = VIEWPORTS[key];
		if (spec.w <= width && spec.h <= height) return key;
	}
	return family[family.length - 1]!;
}

export function resolveActiveViewport(
	width: number,
	height: number,
	override: ViewportKey | null,
	pointer: PointerKind = 'fine',
): ViewportKey {
	if (override) return override;
	return pickViewport(width, height, pointer);
}

export function controlBarBand(key: ViewportKey, reserved: ControlBarMap | undefined): number | undefined {
	const chain = ancestorChain(key);
	for (let index = chain.length - 1; index >= 0; index -= 1) {
		const value = reserved?.[chain[index]!];
		if (typeof value === 'number') return value;
	}
	return undefined;
}

/** Merge stored overrides along the chain. Does not apply formula defaults. */
export function resolveViewportItem(
	key: ViewportKey,
	id: string,
	viewports: LayoutSection['viewports'],
): LayoutItem {
	const merged: LayoutItem = {};
	for (const step of ancestorChain(key)) {
		const item = viewports[step]?.items?.[id];
		if (item) Object.assign(merged, item);
	}
	return merged;
}

export function resolveTunable(
	key: ViewportKey,
	id: string,
	tunables: TunableMap,
	fallback: number,
): number {
	const entry = tunables[id];
	if (!entry) return fallback;
	const chain = ancestorChain(key);
	for (let index = chain.length - 1; index >= 0; index -= 1) {
		const value = entry[chain[index]!];
		if (typeof value === 'number') return value;
	}
	return fallback;
}

export function letterbox(
	design: { w: number; h: number },
	frame: { w: number; h: number },
): { scale: number; x: number; y: number } {
	const scale = Math.min(frame.w / design.w, frame.h / design.h) || 1;
	return {
		scale,
		x: (frame.w - design.w * scale) / 2,
		y: (frame.h - design.h * scale) / 2,
	};
}

/** Screen pixel → design-frame pixel. Window size cancels out at the frame centre. */
export function screenToDesign(
	design: { w: number; h: number },
	frame: { w: number; h: number },
	screen: { x: number; y: number },
): { x: number; y: number } {
	const box = letterbox(design, frame);
	return {
		x: (screen.x - box.x) / box.scale,
		y: (screen.y - box.y) / box.scale,
	};
}

export function itemToNodeProps(item: LayoutItem | undefined): NodeProps {
	if (!item) return {};
	const props: NodeProps = {};
	if (item.x !== undefined) props.x = item.x;
	if (item.y !== undefined) props.y = item.y;
	if (item.scale !== undefined) props.scale = item.scale;
	if (item.anchor) props.anchor = { x: item.anchor[0], y: item.anchor[1] };
	if (item.visible !== undefined) props.visible = item.visible;
	if (item.z !== undefined) props.zIndex = item.z;
	if (item.w !== undefined) props.width = item.w;
	if (item.h !== undefined) props.height = item.h;
	return props;
}

export function nodePatchToItem(patch: NodeProps): Partial<LayoutItem> {
	const item: Partial<LayoutItem> = {};
	if (patch.x !== undefined) item.x = patch.x;
	if (patch.y !== undefined) item.y = patch.y;
	if (patch.scale !== undefined) {
		item.scale = typeof patch.scale === 'number' ? patch.scale : patch.scale.x;
	}
	if (patch.visible !== undefined) item.visible = patch.visible;
	if (patch.anchor !== undefined) {
		if (typeof patch.anchor === 'number') item.anchor = [patch.anchor, patch.anchor];
		else item.anchor = [patch.anchor.x, patch.anchor.y];
	}
	if (patch.zIndex !== undefined) item.z = patch.zIndex;
	if (patch.width !== undefined) item.w = patch.width;
	if (patch.height !== undefined) item.h = patch.height;
	return item;
}

const ASSET_EXT = /\.(webp|png|jpe?g|m4a|ogg|atlas|json|wav)$/i;

export function looksLikeAssetPath(value: string): boolean {
	return value.includes('/') || ASSET_EXT.test(value);
}

export function assetPathError(value: string): string | null {
	if (value.endsWith('.wav') || value.endsWith('.WAV')) {
		return '.wav files belong in assets-src, not builder.json';
	}
	if (value.startsWith('/') || value.startsWith('\\')) return 'path must be relative (no leading /)';
	if (value.startsWith('src/') || value.startsWith('src\\')) return 'path must not start with src/';
	if (value.startsWith('static/') || value.startsWith('static\\')) return 'path must not start with static/';
	if (value.split(/[/\\]/).includes('..')) return 'path must not contain ..';
	return null;
}

function rejectStar(key: string, path: string, errors: string[]): void {
	if (key === '*') errors.push(`${path}: "*" is not allowed`);
}

function validateItem(item: unknown, path: string, errors: string[]): void {
	if (!isRecord(item)) {
		errors.push(`${path} must be an object`);
		return;
	}
	for (const [key, value] of Object.entries(item)) {
		rejectStar(key, `${path}.${key}`, errors);
		const propPath = `${path}.${key}`;
		switch (key) {
			case 'x':
			case 'y':
			case 'scale':
			case 'z':
				if (!isFiniteNumber(value)) errors.push(`${propPath} must be a number`);
				break;
			case 'visible':
				if (typeof value !== 'boolean') errors.push(`${propPath} must be boolean`);
				break;
			case 'anchor': {
				if (!Array.isArray(value) || value.length !== 2 || !value.every(isFiniteNumber)) {
					errors.push(`${propPath} must be [ax, ay]`);
					break;
				}
				const [ax, ay] = value as [number, number];
				if (ax < 0 || ax > 1 || ay < 0 || ay > 1) {
					errors.push(`${propPath} must be inside 0–1`);
				}
				break;
			}
			case 'pin':
				if (typeof value !== 'string' || !(PIN_VALUES as readonly string[]).includes(value)) {
					errors.push(`${propPath} must be top|bottom|center|none`);
				}
				break;
			case 'parent':
				if (typeof value !== 'string' || !/^[A-Za-z][\w-]*$/.test(value)) {
					errors.push(`${propPath} must be an item id`);
				}
				break;
			case 'follow':
			case 'offset':
				if (typeof value !== 'boolean') errors.push(`${propPath} must be boolean`);
				break;
			case 'w':
			case 'h':
			case 'fontSize':
				if (!isFiniteNumber(value) || value < 0) errors.push(`${propPath} must be a number >= 0`);
				break;
			case 'kind':
				if (typeof value !== 'string' || !(ITEM_KINDS as readonly string[]).includes(value)) {
					errors.push(`${propPath} must be node|text|button`);
				}
				break;
			case 'messageId':
				if (typeof value !== 'string' || !/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/i.test(value)) {
					errors.push(`${propPath} must be a Lingui id such as game.title`);
				}
				break;
			default:
				errors.push(`${propPath}: unknown item field`);
		}
	}
}

function validateInsets(value: unknown, path: string, errors: string[]): void {
	if (!isRecord(value)) {
		errors.push(`${path} must be an object`);
		return;
	}
	for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
		if (!isFiniteNumber(value[edge]) || (value[edge] as number) < 0) {
			errors.push(`${path}.${edge} must be a number >= 0`);
		}
	}
}

function validatePopups(popups: unknown, errors: string[]): void {
	if (!isRecord(popups)) {
		errors.push('layout.popups must be an object');
		return;
	}
	for (const [id, entry] of Object.entries(popups)) {
		rejectStar(id, `layout.popups.${id}`, errors);
		if (!isRecord(entry)) {
			errors.push(`layout.popups.${id} must be an object`);
			continue;
		}
		if (entry.contentHeight !== undefined && !isFiniteNumber(entry.contentHeight)) {
			errors.push(`layout.popups.${id}.contentHeight must be a number`);
		}
		if (entry.viewports === undefined) continue;
		if (!isRecord(entry.viewports)) {
			errors.push(`layout.popups.${id}.viewports must be an object`);
			continue;
		}
		for (const [key, spec] of Object.entries(entry.viewports)) {
			if (!(VIEWPORT_KEYS as readonly string[]).includes(key)) {
				errors.push(`layout.popups.${id}.viewports: unknown viewport "${key}"`);
			}
			if (!isRecord(spec)) continue;
			if (spec.maxHeight !== undefined && !isFiniteNumber(spec.maxHeight)) {
				errors.push(`layout.popups.${id}.viewports.${key}.maxHeight must be a number`);
			}
			if (spec.padding !== undefined && !isFiniteNumber(spec.padding)) {
				errors.push(`layout.popups.${id}.viewports.${key}.padding must be a number`);
			}
			if (spec.scrollbar !== undefined && typeof spec.scrollbar !== 'boolean') {
				errors.push(`layout.popups.${id}.viewports.${key}.scrollbar must be boolean`);
			}
		}
	}
}

function validateFrame(frame: unknown, errors: string[]): void {
	if (!isRecord(frame)) {
		errors.push('layout.frame must be an object');
		return;
	}
	const anchor = frame.boardAnchor;
	if (!Array.isArray(anchor) || anchor.length !== 2 || !anchor.every(isFiniteNumber)) {
		errors.push('layout.frame.boardAnchor must be [ax, ay]');
	} else {
		const [ax, ay] = anchor as [number, number];
		if (ax < 0 || ax > 1 || ay < 0 || ay > 1) errors.push('layout.frame.boardAnchor must be inside 0–1');
	}
	for (const key of ['titleYFactor', 'titleMinY', 'plaqueLocalYFactor', 'framePadFactor'] as const) {
		if (!isFiniteNumber(frame[key])) errors.push(`layout.frame.${key} must be a number`);
	}
	if (frame.design !== undefined) {
		if (!isRecord(frame.design)) errors.push('layout.frame.design must be an object');
		else {
			for (const [type, size] of Object.entries(frame.design)) {
				if (!(DESIGN_LAYOUT_TYPES as readonly string[]).includes(type)) {
					errors.push(`layout.frame.design: unknown layout type "${type}"`);
				}
				if (!isRecord(size) || !isFiniteNumber(size.w) || !isFiniteNumber(size.h) || size.w <= 0 || size.h <= 0) {
					errors.push(`layout.frame.design.${type} must be {w, h} > 0`);
				}
			}
		}
	}
	for (const key of Object.keys(frame)) {
		if (!['boardAnchor', 'titleYFactor', 'titleMinY', 'plaqueLocalYFactor', 'framePadFactor', 'design'].includes(key)) {
			errors.push(`layout.frame: unknown field "${key}"`);
		}
	}
}

const CELL_KEY = /^r(\d+)c(\d+)$/;

function validateXY(value: unknown, path: string, fields: readonly string[], errors: string[]): void {
	if (!isRecord(value)) {
		errors.push(`${path} must be an object`);
		return;
	}
	for (const [field, entry] of Object.entries(value)) {
		if (!fields.includes(field)) errors.push(`${path}.${field}: unknown field`);
		else if (!isFiniteNumber(entry)) errors.push(`${path}.${field} must be a number`);
	}
}

export function validateGrid(grid: unknown, errors: string[]): void {
	if (!isRecord(grid)) {
		errors.push('layout.grid must be an object');
		return;
	}
	for (const [key, entry] of Object.entries(grid)) {
		const path = `layout.grid.${key}`;
		rejectStar(key, path, errors);
		if (!(VIEWPORT_KEYS as readonly string[]).includes(key)) errors.push(`layout.grid: unknown viewport "${key}"`);
		if (!isRecord(entry)) {
			errors.push(`${path} must be an object`);
			continue;
		}
		for (const [field, value] of Object.entries(entry)) {
			switch (field) {
				case 'origin':
					validateXY(value, `${path}.origin`, ['x', 'y'], errors);
					break;
				case 'pitch':
					validateXY(value, `${path}.pitch`, ['x', 'y'], errors);
					if (isRecord(value)) {
						for (const axis of ['x', 'y'] as const) {
							const pitch = value[axis];
							if (isFiniteNumber(pitch) && pitch <= 0) errors.push(`${path}.pitch.${axis} must be > 0`);
						}
					}
					break;
				case 'reels':
					if (!Array.isArray(value)) errors.push(`${path}.reels must be an array`);
					else value.forEach((reel, index) => reel !== null && validateXY(reel, `${path}.reels[${index}]`, ['dx', 'dy'], errors));
					break;
				case 'cells':
					if (!isRecord(value)) {
						errors.push(`${path}.cells must be an object`);
						break;
					}
					for (const [cell, nudge] of Object.entries(value)) {
						if (!CELL_KEY.test(cell)) errors.push(`${path}.cells: "${cell}" must look like r0c0`);
						validateXY(nudge, `${path}.cells.${cell}`, ['dx', 'dy'], errors);
						if (isRecord(nudge)) {
							for (const axis of ['dx', 'dy'] as const) {
								const amount = nudge[axis];
								if (isFiniteNumber(amount) && Math.abs(amount) > CELL_NUDGE_MAX) {
									errors.push(`${path}.cells.${cell}.${axis} must be within ±${CELL_NUDGE_MAX}px (nudge only)`);
								}
							}
						}
					}
					break;
				case 'symbolScale':
					if (!isFiniteNumber(value) || value <= 0 || value > 3) errors.push(`${path}.symbolScale must be in (0, 3]`);
					break;
				default:
					errors.push(`${path}.${field}: unknown field`);
			}
		}
	}
}

export function validateLayers(layers: unknown, errors: string[]): void {
	if (!isRecord(layers)) {
		errors.push('layout.layers must be an object');
		return;
	}
	const isIdList = (value: unknown) => Array.isArray(value) && value.every((entry) => typeof entry === 'string' && entry.length > 0);
	for (const [field, value] of Object.entries(layers)) {
		if (field === 'groups' || field === 'hidden' || field === 'locked') {
			if (!isIdList(value)) errors.push(`layout.layers.${field} must be a list of ids`);
		} else if (field === 'order') {
			if (!isRecord(value)) errors.push('layout.layers.order must be an object');
			else {
				for (const [group, ids] of Object.entries(value)) {
					if (!isIdList(ids)) errors.push(`layout.layers.order.${group} must be a list of ids`);
				}
			}
		} else errors.push(`layout.layers: unknown field "${field}"`);
	}
}

/** Grid for a key: chain-merged overrides on top of the game's defaults. Pure; ships to production. */
export function resolveGrid(
	key: ViewportKey,
	grid: LayoutSection['grid'],
	defaults: { pitch: number; reels: number },
): ResolvedGrid {
	const out: ResolvedGrid = {
		origin: { x: 0, y: 0 },
		pitch: { x: defaults.pitch, y: defaults.pitch },
		reels: Array.from({ length: defaults.reels }, () => ({ dx: 0, dy: 0 })),
		cells: {},
		symbolScale: 1,
	};
	if (!grid) return out;
	for (const step of ancestorChain(key)) {
		const entry = grid[step];
		if (!entry) continue;
		if (entry.origin) Object.assign(out.origin, entry.origin);
		if (entry.pitch) Object.assign(out.pitch, entry.pitch);
		entry.reels?.forEach((reel, index) => {
			if (!reel || index >= out.reels.length) return;
			out.reels[index] = { ...out.reels[index]!, ...reel } as { dx: number; dy: number };
		});
		for (const [cell, nudge] of Object.entries(entry.cells ?? {})) {
			const clamp = (value: number | undefined) =>
				Math.max(-CELL_NUDGE_MAX, Math.min(CELL_NUDGE_MAX, value ?? 0));
			const prev = out.cells[cell] ?? { dx: 0, dy: 0 };
			out.cells[cell] = {
				dx: nudge.dx !== undefined ? clamp(nudge.dx) : prev.dx,
				dy: nudge.dy !== undefined ? clamp(nudge.dy) : prev.dy,
			};
		}
		if (entry.symbolScale !== undefined) out.symbolScale = entry.symbolScale;
	}
	return out;
}

/** utils-layout's layoutType() rule for a canvas size (ratio first, then the short side). */
export function designLayoutType(width: number, height: number): DesignLayoutType {
	const ratio = width / (height || 1);
	if (ratio > 0.8 && ratio < 1.3) return 'tablet';
	if (ratio <= 0.8) return 'portrait';
	return Math.min(width, height) <= 480 ? 'landscape' : 'desktop';
}

function validateOpenSection(value: unknown, path: string, errors: string[]): void {
	if (!isRecord(value)) {
		errors.push(`${path} must be an object`);
		return;
	}
	const walk = (node: unknown, nodePath: string) => {
		if (typeof node === 'string') {
			if (!looksLikeAssetPath(node)) return;
			const problem = assetPathError(node);
			if (problem) errors.push(`${nodePath}: ${problem}`);
			return;
		}
		if (Array.isArray(node)) {
			node.forEach((entry, index) => walk(entry, `${nodePath}[${index}]`));
			return;
		}
		if (!isRecord(node)) return;
		for (const [key, entry] of Object.entries(node)) {
			rejectStar(key, `${nodePath}.${key}`, errors);
			walk(entry, `${nodePath}.${key}`);
		}
	};
	walk(value, path);
}

export function validateLayoutSection(layout: unknown): string[] {
	const errors: string[] = [];
	if (!isRecord(layout)) return ['layout must be an object'];
	const viewports = layout.viewports;
	if (!isRecord(viewports)) {
		errors.push('layout.viewports must be an object');
	} else {
		const keys = Object.keys(viewports);
		for (const key of keys) {
			rejectStar(key, `layout.viewports.${key}`, errors);
			if (!(VIEWPORT_KEYS as readonly string[]).includes(key)) {
				errors.push(`layout.viewports: unknown viewport "${key}"`);
			}
		}
		for (const key of VIEWPORT_KEYS) {
			if ((MOBILE_LANDSCAPE_KEYS as readonly string[]).includes(key)) continue;
			if (!(key in viewports)) errors.push(`layout.viewports: missing "${key}"`);
		}
		for (const key of VIEWPORT_KEYS) {
			const entry = viewports[key];
			if (!isRecord(entry)) continue;
			const spec = VIEWPORTS[key];
			if (entry.w !== spec.w || entry.h !== spec.h) {
				errors.push(`layout.viewports.${key}: size must be ${spec.w}×${spec.h}`);
			}
			if (!isRecord(entry.items)) {
				errors.push(`layout.viewports.${key}.items must be an object`);
				continue;
			}
			for (const [id, item] of Object.entries(entry.items)) {
				rejectStar(id, `layout.viewports.${key}.items.${id}`, errors);
				validateItem(item, `layout.viewports.${key}.items.${id}`, errors);
			}
		}
	}

	if (!isRecord(layout.tunables)) {
		errors.push('layout.tunables must be an object');
	} else {
		for (const [id, entry] of Object.entries(layout.tunables)) {
			rejectStar(id, `layout.tunables.${id}`, errors);
			if (!isRecord(entry)) {
				errors.push(`layout.tunables.${id} must be an object`);
				continue;
			}
			for (const [key, value] of Object.entries(entry)) {
				rejectStar(key, `layout.tunables.${id}.${key}`, errors);
				if (!(VIEWPORT_KEYS as readonly string[]).includes(key)) {
					errors.push(`layout.tunables.${id}: unknown viewport "${key}"`);
				}
				if (!isFiniteNumber(value)) errors.push(`layout.tunables.${id}.${key} must be a number`);
			}
		}
	}

	const reserved = layout.reserved;
	if (!isRecord(reserved) || (reserved.controlBar !== undefined && !isRecord(reserved.controlBar))) {
		errors.push('layout.reserved must be an object (controlBar, if present, an object)');
	} else {
		for (const key of Object.keys(reserved)) {
			if (key !== 'controlBar' && key !== 'safeArea') {
				errors.push(`layout.reserved: unknown field "${key}"`);
			}
		}
		for (const [key, value] of Object.entries((reserved.controlBar ?? {}) as Record<string, unknown>)) {
			rejectStar(key, `layout.reserved.controlBar.${key}`, errors);
			if (!(VIEWPORT_KEYS as readonly string[]).includes(key)) {
				errors.push(`layout.reserved.controlBar: unknown viewport "${key}"`);
			}
			if (!isFiniteNumber(value)) errors.push(`layout.reserved.controlBar.${key} must be a number`);
		}
		if (reserved.safeArea !== undefined) {
			if (!isRecord(reserved.safeArea)) errors.push('layout.reserved.safeArea must be an object');
			else {
				for (const [key, value] of Object.entries(reserved.safeArea)) {
					if (!(VIEWPORT_KEYS as readonly string[]).includes(key)) {
						errors.push(`layout.reserved.safeArea: unknown viewport "${key}"`);
					}
					validateInsets(value, `layout.reserved.safeArea.${key}`, errors);
				}
			}
		}
	}
	for (const key of Object.keys(layout)) {
		if (!['viewports', 'tunables', 'reserved', 'frame', 'popups', 'grid', 'layers'].includes(key)) {
			errors.push(`layout: unknown field "${key}"`);
		}
	}
	if (layout.frame !== undefined) validateFrame(layout.frame, errors);
	if (layout.popups !== undefined) validatePopups(layout.popups, errors);
	if (layout.grid !== undefined) validateGrid(layout.grid, errors);
	if (layout.layers !== undefined) validateLayers(layout.layers, errors);
	return errors;
}

export function validateBuilderFile(input: unknown): string[] {
	if (!isRecord(input)) return ['root must be an object'];
	const errors: string[] = [];
	if (input.version !== 1) errors.push('version must be 1');
	for (const section of REQUIRED_SECTIONS) {
		if (!(section in input)) errors.push(`missing section "${section}"`);
	}
	for (const key of Object.keys(input)) {
		rejectStar(key, key, errors);
		if (key === '$schema' || key === 'version') continue;
		if (!(BUILDER_SECTIONS as readonly string[]).includes(key)) {
			errors.push(`unknown section "${key}"`);
		}
	}
	if ('layout' in input) errors.push(...validateLayoutSection(input.layout));
	for (const section of ['art', 'spine', 'audio', 'events'] as const) {
		if (section in input) validateOpenSection(input[section], section, errors);
	}
	if ('spine' in input) errors.push(...spineSectionErrors(input.spine));
	if ('ui' in input) validateGameUiSection(input.ui, errors);
	return errors;
}

const UI_OVERRIDE_FIELDS = ['x', 'y', 'dx', 'dy', 'scale', 'visible', 'z', 'h'] as const;

/** Shape only. Item ids and clamping are checked against ui.json by packages/ui-builder. */
function validateGameUiSection(ui: unknown, errors: string[]): void {
	if (!isRecord(ui)) {
		errors.push('ui must be an object');
		return;
	}
	for (const key of Object.keys(ui)) {
		if (key !== 'pin' && key !== 'uiOverrides') errors.push(`ui: unknown field "${key}"`);
	}
	if (typeof ui.pin !== 'string' || !/^\d+\.\d+\.\d+$/.test(ui.pin)) {
		errors.push('ui.pin must be a ui.json version such as 1.0.0');
	}
	if (ui.uiOverrides === undefined) return;
	if (!isRecord(ui.uiOverrides)) {
		errors.push('ui.uiOverrides must be an object');
		return;
	}
	for (const [id, perKey] of Object.entries(ui.uiOverrides)) {
		rejectStar(id, `ui.uiOverrides.${id}`, errors);
		if (!isRecord(perKey)) {
			errors.push(`ui.uiOverrides.${id} must be an object`);
			continue;
		}
		for (const [key, value] of Object.entries(perKey)) {
			rejectStar(key, `ui.uiOverrides.${id}.${key}`, errors);
			if (!(VIEWPORT_KEYS as readonly string[]).includes(key)) {
				errors.push(`ui.uiOverrides.${id}: unknown viewport "${key}"`);
			}
			if (!isRecord(value)) {
				errors.push(`ui.uiOverrides.${id}.${key} must be an object`);
				continue;
			}
			for (const [field, entry] of Object.entries(value)) {
				if (!(UI_OVERRIDE_FIELDS as readonly string[]).includes(field)) {
					errors.push(`ui.uiOverrides.${id}.${key}.${field}: unknown field`);
				} else if (field === 'visible' ? typeof entry !== 'boolean' : !isFiniteNumber(entry)) {
					errors.push(`ui.uiOverrides.${id}.${key}.${field} has the wrong type`);
				}
			}
		}
	}
}

/** Fill in viewport entries a step-B file does not have yet (the three landscape keys). */
export function normalizeBuilderFile(file: BuilderFile): BuilderFile {
	const viewports = (file.layout.viewports ?? {}) as Partial<LayoutSection['viewports']>;
	for (const key of VIEWPORT_KEYS) {
		if (!viewports[key]) viewports[key] = { w: VIEWPORTS[key].w, h: VIEWPORTS[key].h, items: {} };
	}
	file.layout.viewports = viewports as LayoutSection['viewports'];
	file.layout.reserved ??= {};
	return file;
}

function sortRecord<T extends Record<string, unknown>>(obj: T): T {
	return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))) as T;
}

function sortItem(item: LayoutItem): LayoutItem {
	const sorted: LayoutItem = {};
	for (const key of ITEM_KEYS) {
		if (item[key] !== undefined) (sorted as Record<string, unknown>)[key] = item[key];
	}
	return sorted;
}

export function sortBuilderFile(input: BuilderFile): BuilderFile {
	const file = normalizeBuilderFile(JSON.parse(JSON.stringify(input)) as BuilderFile);
	const viewports = {} as LayoutSection['viewports'];
	for (const key of VIEWPORT_KEYS) {
		const entry = file.layout.viewports[key];
		const items = sortRecord(
			Object.fromEntries(
				Object.entries(entry.items).map(([id, item]) => [id, sortItem(item)]),
			) as Record<string, LayoutItem>,
		);
		viewports[key] = { w: entry.w, h: entry.h, items };
	}
	let controlBar: ControlBarMap | undefined;
	if (file.layout.reserved.controlBar && Object.keys(file.layout.reserved.controlBar).length > 0) {
		controlBar = {};
		for (const key of VIEWPORT_KEYS) {
			const value = file.layout.reserved.controlBar[key];
			if (typeof value === 'number') controlBar[key] = value;
		}
	}
	let safeArea: LayoutSection['reserved']['safeArea'];
	if (file.layout.reserved.safeArea) {
		safeArea = {};
		for (const key of VIEWPORT_KEYS) {
			const insets = file.layout.reserved.safeArea[key];
			if (insets) safeArea[key] = { top: insets.top, right: insets.right, bottom: insets.bottom, left: insets.left };
		}
	}
	const tunables: TunableMap = {};
	for (const id of Object.keys(file.layout.tunables).sort()) {
		const entry = file.layout.tunables[id] ?? {};
		const sorted: Partial<Record<ViewportKey, number>> = {};
		for (const key of VIEWPORT_KEYS) {
			if (typeof entry[key] === 'number') sorted[key] = entry[key];
		}
		tunables[id] = sorted;
	}
	const layout: LayoutSection = {
		viewports,
		tunables,
		reserved: {
			...(controlBar ? { controlBar } : {}),
			...(safeArea ? { safeArea } : {}),
		},
	};
	if (file.layout.frame) {
		const frame = file.layout.frame;
		layout.frame = {
			boardAnchor: [frame.boardAnchor[0], frame.boardAnchor[1]],
			titleYFactor: frame.titleYFactor,
			titleMinY: frame.titleMinY,
			plaqueLocalYFactor: frame.plaqueLocalYFactor,
			framePadFactor: frame.framePadFactor,
		};
		if (frame.design) {
			const design: NonNullable<FrameLayout['design']> = {};
			for (const type of DESIGN_LAYOUT_TYPES) {
				const size = frame.design[type];
				if (size) design[type] = { w: size.w, h: size.h };
			}
			layout.frame.design = design;
		}
	}
	if (file.layout.popups) {
		layout.popups = sortRecord(
			Object.fromEntries(
				Object.entries(file.layout.popups).map(([id, entry]) => {
					const viewports = {} as NonNullable<PopupEntry['viewports']>;
					for (const key of VIEWPORT_KEYS) {
						const spec = entry.viewports?.[key];
						if (!spec) continue;
						const next: PopupViewport = {};
						if (spec.maxHeight !== undefined) next.maxHeight = spec.maxHeight;
						if (spec.padding !== undefined) next.padding = spec.padding;
						if (spec.scrollbar !== undefined) next.scrollbar = spec.scrollbar;
						viewports[key] = next;
					}
					const sorted: PopupEntry = {};
					if (entry.contentHeight !== undefined) sorted.contentHeight = entry.contentHeight;
					if (Object.keys(viewports).length > 0) sorted.viewports = viewports;
					return [id, sorted];
				}),
			) as Record<string, PopupEntry>,
		);
	}
	if (file.layout.grid) {
		const grid: NonNullable<LayoutSection['grid']> = {};
		for (const key of VIEWPORT_KEYS) {
			const entry = file.layout.grid[key];
			if (!entry) continue;
			const next: GridLayout = {};
			if (entry.origin) next.origin = sortXY(entry.origin, ['x', 'y']);
			if (entry.pitch) next.pitch = sortXY(entry.pitch, ['x', 'y']);
			if (entry.reels) next.reels = entry.reels.map((reel) => (reel ? sortXY(reel, ['dx', 'dy']) : null));
			if (entry.cells) {
				next.cells = Object.fromEntries(
					Object.keys(entry.cells)
						.sort()
						.map((cell) => [cell, sortXY(entry.cells![cell]!, ['dx', 'dy'])]),
				);
			}
			if (entry.symbolScale !== undefined) next.symbolScale = entry.symbolScale;
			grid[key] = next;
		}
		layout.grid = grid;
	}
	if (file.layout.layers) {
		const source = file.layout.layers;
		const layers: LayerConfig = {};
		if (source.groups) layers.groups = [...source.groups];
		if (source.order) {
			layers.order = Object.fromEntries(
				Object.keys(source.order)
					.sort()
					.map((group) => [group, [...source.order![group]!]]),
			);
		}
		if (source.hidden) layers.hidden = [...new Set(source.hidden)].sort();
		if (source.locked) layers.locked = [...new Set(source.locked)].sort();
		layout.layers = layers;
	}
	return {
		...(file.$schema ? { $schema: file.$schema } : {}),
		version: 1,
		layout,
		art: sortRecord(file.art),
		spine: sortRecord(file.spine),
		audio: sortRecord(file.audio),
		events: sortRecord(file.events),
		...(file.ui ? { ui: sortGameUi(file.ui) } : {}),
	};
}

function sortXY<T extends Record<string, number | undefined>>(value: T, fields: string[]): T {
	const out: Record<string, number> = {};
	for (const field of fields) if (value[field] !== undefined) out[field] = value[field] as number;
	return out as T;
}

function sortGameUi(ui: GameUiSection): GameUiSection {
	const overrides: GameUiSection['uiOverrides'] = {};
	for (const id of Object.keys(ui.uiOverrides ?? {}).sort()) {
		const perKey = ui.uiOverrides[id] ?? {};
		const sorted: Partial<Record<ViewportKey, UiOverrideValue>> = {};
		for (const key of VIEWPORT_KEYS) {
			const value = perKey[key];
			if (!value) continue;
			const next: UiOverrideValue = {};
			for (const field of UI_OVERRIDE_FIELDS) {
				if (value[field] !== undefined) (next as Record<string, unknown>)[field] = value[field];
			}
			sorted[key] = next;
		}
		overrides[id] = sorted;
	}
	return { pin: ui.pin, uiOverrides: overrides };
}

export function serializeBuilderFile(file: BuilderFile): string {
	return JSON.stringify(sortBuilderFile(file), null, '\t') + '\n';
}

/** Canonical JSON of one section, used for hashes and byte-identity checks. */
export function canonicalSection(file: BuilderFile, section: BuilderSection): string {
	const sorted = sortBuilderFile(file);
	return JSON.stringify(sorted[section] ?? null);
}
