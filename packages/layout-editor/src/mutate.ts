/**
 * Pure builder.json mutations. The editor writes these; it never writes PIXI.
 */
import {
	CELL_NUDGE_MAX,
	VIEWPORT_KEYS,
	nodePatchToItem,
	type BuilderFile,
	type GridLayout,
	type LayerConfig,
	type UiOverrideValue,
	type ViewportKey,
	type LayoutItem,
} from './builder.schema';
import type { NodeProps } from './layout.schema';

export type { NodeProps };

export type WriteScope = 'key' | 'all';

/** 'all' ("All sizes") includes the three mobile landscape keys (step C sign-off). */
export function keysForScope(scope: WriteScope, active: ViewportKey): ViewportKey[] {
	return scope === 'all' ? [...VIEWPORT_KEYS] : [active];
}

function ensureItem(file: BuilderFile, key: ViewportKey, id: string): LayoutItem {
	const items = file.layout.viewports[key].items;
	const item = (items[id] ??= {});
	return item;
}

export function patchItems(
	file: BuilderFile,
	id: string,
	keys: ViewportKey[],
	patch: Partial<LayoutItem>,
): void {
	for (const key of keys) {
		const item = ensureItem(file, key, id);
		Object.assign(item, patch);
	}
}

export function patchNodeItems(
	file: BuilderFile,
	id: string,
	keys: ViewportKey[],
	patch: NodeProps,
): void {
	patchItems(file, id, keys, nodePatchToItem(patch));
}

export function clearItems(
	file: BuilderFile,
	id: string,
	keys: ViewportKey[],
	props?: (keyof LayoutItem)[],
): void {
	for (const key of keys) {
		const items = file.layout.viewports[key].items;
		const item = items[id];
		if (!item) continue;
		if (!props) {
			delete items[id];
			continue;
		}
		for (const prop of props) delete item[prop];
		if (Object.keys(item).length === 0) delete items[id];
	}
}

export function setControlBar(file: BuilderFile, key: ViewportKey, value: number): void {
	(file.layout.reserved.controlBar ??= {})[key] = value;
}

export function clearControlBar(file: BuilderFile, key: ViewportKey): void {
	if (file.layout.reserved.controlBar) delete file.layout.reserved.controlBar[key];
}

/**
 * Step C: the band is shared (ui.json). A game changes it only through an explicit
 * `ui.uiOverrides["controlBar.band"][key].h`, for one key (no chain fan-out), clamped at read time.
 */
export function setBandOverride(file: BuilderFile, key: ViewportKey, value: number, pin = '1.0.0'): void {
	file.ui ??= { pin, uiOverrides: {} };
	const perKey = (file.ui.uiOverrides['controlBar.band'] ??= {});
	perKey[key] = { ...(perKey[key] ?? {}), h: value };
}

export function clearBandOverride(file: BuilderFile, key: ViewportKey): void {
	const perKey = file.ui?.uiOverrides?.['controlBar.band'];
	if (!perKey) return;
	delete perKey[key];
	if (Object.keys(perKey).length === 0) delete file.ui!.uiOverrides['controlBar.band'];
}

export function setTunableValue(
	file: BuilderFile,
	id: string,
	keys: ViewportKey[],
	value: number,
): void {
	const entry = (file.layout.tunables[id] ??= {});
	for (const key of keys) entry[key] = value;
}

/** Copy stored item overrides from one viewport onto another. Inheritance is not flattened. */
export function copyViewportItems(file: BuilderFile, from: ViewportKey, to: ViewportKey): void {
	file.layout.viewports[to].items = JSON.parse(
		JSON.stringify(file.layout.viewports[from].items),
	) as BuilderFile['layout']['viewports'][ViewportKey]['items'];
}

/**
 * Game-only UI override (builder.json `ui.uiOverrides[id][key]`). The shared ui.json is never
 * touched. Numbers are rounded to 0.1px.
 */
export function setUiOverride(
	file: BuilderFile,
	id: string,
	keys: ViewportKey[],
	patch: UiOverrideValue,
	pin = '1.0.0',
): void {
	file.ui ??= { pin, uiOverrides: {} };
	const perKey = (file.ui.uiOverrides[id] ??= {});
	for (const key of keys) {
		const next: UiOverrideValue = { ...(perKey[key] ?? {}) };
		for (const [field, value] of Object.entries(patch) as [keyof UiOverrideValue, number | boolean | undefined][]) {
			if (value === undefined) continue;
			(next as Record<string, unknown>)[field] = typeof value === 'number' ? Math.round(value * 10) / 10 : value;
		}
		perKey[key] = next;
	}
}

export function clearUiOverride(file: BuilderFile, id: string, keys: ViewportKey[]): void {
	const perKey = file.ui?.uiOverrides?.[id];
	if (!perKey) return;
	for (const key of keys) {
		const entry = perKey[key];
		if (!entry) continue;
		delete entry.dx;
		delete entry.dy;
		delete entry.scale;
		delete entry.visible;
		if (Object.keys(entry).length === 0) delete perKey[key];
	}
	if (Object.keys(perKey).length === 0) delete file.ui!.uiOverrides[id];
}

export const cellKey = (reel: number, row: number) => `r${reel}c${row}`;

export type GridPatch =
	| { kind: 'origin' | 'pitch'; axis: 'x' | 'y'; value: number }
	| { kind: 'reel'; reel: number; axis: 'dx' | 'dy'; value: number }
	| { kind: 'cell'; reel: number; row: number; axis: 'dx' | 'dy'; value: number }
	| { kind: 'symbolScale'; value: number };

/** Write one grid field on each key. Cell nudges are clamped to ±CELL_NUDGE_MAX. */
export function patchGrid(file: BuilderFile, keys: ViewportKey[], patch: GridPatch): void {
	const grid = (file.layout.grid ??= {});
	for (const key of keys) {
		const entry: GridLayout = (grid[key] ??= {});
		if (patch.kind === 'origin' || patch.kind === 'pitch') {
			const value = patch.kind === 'pitch' ? Math.max(1, patch.value) : patch.value;
			entry[patch.kind] = { ...(entry[patch.kind] ?? {}), [patch.axis]: value };
		} else if (patch.kind === 'reel') {
			const reels = (entry.reels ??= []);
			while (reels.length <= patch.reel) reels.push(null);
			reels[patch.reel] = { ...(reels[patch.reel] ?? {}), [patch.axis]: patch.value };
		} else if (patch.kind === 'cell') {
			const cells = (entry.cells ??= {});
			const id = cellKey(patch.reel, patch.row);
			const value = Math.max(-CELL_NUDGE_MAX, Math.min(CELL_NUDGE_MAX, patch.value));
			cells[id] = { ...(cells[id] ?? {}), [patch.axis]: value };
		} else {
			entry.symbolScale = Math.max(0.05, Math.min(3, patch.value));
		}
	}
}

export function clearGrid(file: BuilderFile, keys: ViewportKey[]): void {
	if (!file.layout.grid) return;
	for (const key of keys) delete file.layout.grid[key];
	if (Object.keys(file.layout.grid).length === 0) delete file.layout.grid;
}

export function updateLayers(file: BuilderFile, update: (layers: LayerConfig) => void): void {
	const layers = (file.layout.layers ??= {});
	update(layers);
	for (const field of ['groups', 'hidden', 'locked'] as const) {
		if (layers[field] && layers[field]!.length === 0) delete layers[field];
	}
	if (layers.order && Object.keys(layers.order).length === 0) delete layers.order;
	if (Object.keys(layers).length === 0) delete file.layout.layers;
}

export function clearTunableValue(file: BuilderFile, id: string, keys: ViewportKey[]): void {
	const entry = file.layout.tunables[id];
	if (!entry) return;
	for (const key of keys) delete entry[key];
	if (Object.keys(entry).length === 0) delete file.layout.tunables[id];
}
