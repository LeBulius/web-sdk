/**
 * Photoshop-style layer groups. Pure; ships to production because the game reads the
 * render order (groups and item order) from builder.json `layout.layers`.
 * `hidden` / `locked` are editor-only: the runtime applies `hidden` in dev builds only.
 */
import type { LayerConfig } from '../builder.schema';

/** Group ids, bottom to top, matching today's Locked In render order (names: editor/layer-groups.ts). */
export const DEFAULT_GROUP_IDS: readonly string[] = ['background', 'frame', 'grid', 'symbols', 'fx', 'overlay', 'ui'];

/** zIndex step between group containers on the stage. Unmanaged stage children stay at 0 or 1000+. */
export const GROUP_Z_STEP = 10;
export const ABOVE_LAYERS_Z = 1000;

/** Merge a stored order with the defaults: stored ids first (known ones), then missing defaults in their slot. */
export function mergeOrder(stored: readonly string[] | undefined, defaults: readonly string[]): string[] {
	if (!stored?.length) return [...defaults];
	const known = new Set(defaults);
	const out = stored.filter((id, index) => known.has(id) && stored.indexOf(id) === index);
	defaults.forEach((id, index) => {
		if (out.includes(id)) return;
		// insert above every default predecessor already placed (keeps it over what it covered before)
		let at = 0;
		for (let back = index - 1; back >= 0; back -= 1) {
			at = Math.max(at, out.indexOf(defaults[back]!) + 1);
		}
		out.splice(at, 0, id);
	});
	return out;
}

export function groupOrder(layers: LayerConfig | undefined): string[] {
	return mergeOrder(layers?.groups, DEFAULT_GROUP_IDS);
}

export function groupZ(layers: LayerConfig | undefined, group: string): number {
	const index = groupOrder(layers).indexOf(group);
	return (index === -1 ? 0 : index + 1) * GROUP_Z_STEP;
}

export function itemOrder(layers: LayerConfig | undefined, group: string, defaults: readonly string[]): string[] {
	return mergeOrder(layers?.order?.[group], defaults);
}

/** zIndex of an item inside its group container (1-based so 0 stays "unmanaged"). */
export function itemZ(layers: LayerConfig | undefined, group: string, id: string, defaults: readonly string[]): number {
	const index = itemOrder(layers, group, defaults).indexOf(id);
	return index === -1 ? 0 : index + 1;
}

/** Move `id` by `delta` slots (positive = up / later = drawn on top). Returns a new list. */
export function moveInOrder(order: readonly string[], id: string, delta: number): string[] {
	const out = [...order];
	const from = out.indexOf(id);
	if (from === -1) return out;
	const to = Math.max(0, Math.min(out.length - 1, from + delta));
	out.splice(from, 1);
	out.splice(to, 0, id);
	return out;
}

/** Move `id` so it sits right before `before` (or last when `before` is null). */
export function moveBefore(order: readonly string[], id: string, before: string | null): string[] {
	const out = order.filter((entry) => entry !== id);
	const at = before === null ? out.length : out.indexOf(before);
	out.splice(at === -1 ? out.length : at, 0, id);
	return out;
}

export function toggleInList(list: readonly string[] | undefined, id: string, on: boolean): string[] {
	const set = new Set(list ?? []);
	if (on) set.add(id);
	else set.delete(id);
	return [...set].sort();
}

/** Editor-only flags: an item is hidden/locked when it or its group is. */
export function isFlagged(list: readonly string[] | undefined, id: string, group?: string): boolean {
	if (!list?.length) return false;
	return list.includes(id) || (group !== undefined && list.includes(`group:${group}`));
}
