/**
 * Runtime API used by game code. Ships to production (no editor code).
 *
 *   const layout = useLayout('board', () => ({ x, y, scale: 1 }));
 *   <Container {...layout.props} />
 *
 *   const { x, y } = resolveLayout('board', () => ({ x, y }));
 *
 * Merge order: formula defaults, then each ancestor viewport's item (oldest
 * first), then the active key. There is no `"*"` bucket. Tunables use the
 * same chain.
 */
import { onDestroy } from 'svelte';
import { getContextLayout } from 'utils-layout';

import { itemToNodeProps, resolveGrid, resolveTunable, resolveViewportItem, type ResolvedGrid } from './builder.schema';
import { NEUTRAL_PROPS, type NodePropKey, type NodeProps } from './layout.schema';
import { groupZ, isFlagged, itemZ } from './layout/layers';
import type { GridGeometry } from './layout/grid';
import { layoutRegistry, type RegisterNodeOptions, type TunableDefinition } from './registry';
import { activeUi, activeViewport, bindViewport, isViewportBound, layoutStore, readTunable } from './store.svelte';
import { clampUiOverride } from '../../ui-builder/src/ui.schema';

export type ResolvedLayoutProps<D extends NodeProps> = D & NodeProps;
export type LabeledLayoutProps<D extends NodeProps> = ResolvedLayoutProps<D> & { label: string };

export function ensureViewportBound() {
	if (isViewportBound()) return;
	const context = getContextLayout();
	if (!context) return;
	bindViewport(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		return { width: canvas.width, height: canvas.height };
	});
}

export function resolveNodeProps<D extends NodeProps>(id: string, base: D): ResolvedLayoutProps<D> {
	const key = activeViewport();
	const item = resolveViewportItem(key, id, layoutStore.data.layout.viewports);
	const merged: NodeProps = { ...base, ...itemToNodeProps(item) };

	const touched = layoutRegistry.getTouched(id);
	const resetKeys = new Set<NodePropKey>(touched ?? []);
	for (const viewport of Object.values(layoutStore.data.layout.viewports)) {
		const stored = viewport.items[id];
		if (!stored) continue;
		for (const prop of Object.keys(itemToNodeProps(stored))) resetKeys.add(prop as NodePropKey);
	}
	const definition = layoutRegistry.nodes.get(id);
	// item w/h are text-box sizes for most items; only nodes that opt in get width/height props.
	for (const prop of ['width', 'height'] as const) {
		if (!definition?.editable.includes(prop) && !(prop in base)) delete merged[prop];
	}
	for (const prop of resetKeys) {
		if (prop === 'width' || prop === 'height') continue;
		if (merged[prop] === undefined) (merged as Record<string, unknown>)[prop] = NEUTRAL_PROPS[prop];
	}
	// Editor-only eye. import.meta.env.DEV is statically false in production, so this is dropped.
	if (import.meta.env.DEV && isFlagged(layoutStore.data.layout.layers?.hidden, id, definition?.group)) {
		merged.visible = false;
	}
	return merged as ResolvedLayoutProps<D>;
}

/** Render order of a layer group container on the stage (builder.json layout.layers.groups). */
export function layerGroupZ(group: string): number {
	return groupZ(layoutStore.data.layout.layers, group);
}

/** Render order of an item inside its group container (builder.json layout.layers.order). */
export function layerItemZ(group: string, id: string, defaults?: readonly string[]): number {
	return itemZ(layoutStore.data.layout.layers, group, id, defaults ?? layoutRegistry.layerDefaults[group] ?? []);
}

/** Game setup: default item order per layer group (bottom to top). */
export function defineLayers(defaults: Record<string, readonly string[]>) {
	layoutRegistry.defineLayerDefaults(defaults);
}

/** Game setup: reel grid shape, so the editor overlay and inspector use the same geometry. */
export function defineGrid(geometry: GridGeometry) {
	layoutRegistry.defineGrid(geometry);
}

/** Editor-only eye for a whole group (dev builds only). */
export function layerGroupVisible(group: string): boolean {
	if (!import.meta.env.DEV) return true;
	return !isFlagged(layoutStore.data.layout.layers?.hidden, `group:${group}`);
}

/** Reel grid for the active viewport key (builder.json layout.grid). */
export function readGrid(defaults: { pitch: number; reels: number }): ResolvedGrid {
	return resolveGrid(activeViewport(), layoutStore.data.layout.grid, defaults);
}

export type UiItemProps = { x: number; y: number; scale: number; visible: boolean; zIndex?: number; label: string };

/**
 * Shared UI item (ui.json id). The game's explicit uiOverrides (dx/dy/scale/visible/z) are applied
 * as an offset from the shared layout position, clamped by the ui.json guard rails.
 */
export function useUiItem(id: string, options?: RegisterNodeOptions) {
	ensureViewportBound();
	const release = layoutRegistry.mountNode(id, () => ({ x: 0, y: 0 }), {
		group: 'ui',
		mode: 'offset',
		editable: ['x', 'y', 'scale', 'visible'],
		...options,
	});
	onDestroy(release);
	const props = $derived.by((): UiItemProps => {
		const key = activeViewport();
		const ui = activeUi();
		// Only the game's own override: the shared layout already places the item (ui.json x/y/scale
		// are applied by new-ui-pixi itself), so this is a pure offset on top of it.
		const own = layoutStore.data.ui?.uiOverrides?.[id]?.[key] ?? {};
		const value = ui ? clampUiOverride(ui, id, key, own).value : own;
		const out: UiItemProps = {
			x: value.dx ?? 0,
			y: value.dy ?? 0,
			scale: value.scale ?? 1,
			visible: value.visible ?? true,
			label: id,
		};
		if (value.z !== undefined) out.zIndex = value.z;
		if (import.meta.env.DEV && isFlagged(layoutStore.data.layout.layers?.hidden, id, 'ui')) out.visible = false;
		return out;
	});
	return {
		id,
		get props() {
			return props;
		},
	};
}

export function useLayout<D extends NodeProps>(
	id: string,
	defaults: () => D,
	options?: RegisterNodeOptions,
) {
	ensureViewportBound();
	const release = layoutRegistry.mountNode(id, defaults, options);
	onDestroy(release);
	const props = $derived({ ...resolveNodeProps(id, defaults()), label: id } as LabeledLayoutProps<D>);
	return {
		id,
		get props() {
			return props;
		},
	};
}

export function resolveLayout<D extends NodeProps>(
	id: string,
	defaults: () => D,
	options?: RegisterNodeOptions,
): ResolvedLayoutProps<D> {
	layoutRegistry.defineNode(id, defaults, options);
	return resolveNodeProps(id, defaults());
}

export function tunable(id: string, fallback: number): number {
	return readTunable(id, fallback);
}

export function defineTunable(id: string, definition: Omit<TunableDefinition, 'id'>): () => number {
	layoutRegistry.defineTunable({ id, ...definition });
	return () => resolveTunable(activeViewport(), id, layoutStore.data.layout.tunables, definition.default);
}
