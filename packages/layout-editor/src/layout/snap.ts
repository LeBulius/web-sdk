/**
 * Snap a design-frame point to centre lines, safe-area edges, other items, then an 8px grid.
 * Each target family can be switched off (layer panel snap toggles). Alt in the overlay skips all.
 */
import { snapAxis } from '../editor/snapping';
import type { Insets } from '../builder.schema';
import type { Box } from './guards';

export const SNAP_THRESHOLD = 6;
export const SNAP_GRID = 8;

export type SnapGuides = { x?: number; y?: number; xKind?: SnapKind; yKind?: SnapKind };
export type SnapKind = 'centre' | 'edge' | 'safe' | 'item' | 'grid';
export type SnapOptions = { centre?: boolean; edges?: boolean; safe?: boolean; items?: boolean; grid?: boolean };

const ALL: Required<SnapOptions> = { centre: true, edges: true, safe: true, items: true, grid: true };

export function snapDrag(
	point: { x: number; y: number },
	frame: { w: number; h: number },
	insets: Insets,
	others: Box[],
	threshold = SNAP_THRESHOLD,
	grid = SNAP_GRID,
	options: SnapOptions = ALL,
): { x: number; y: number; guides: SnapGuides } {
	const on = { ...ALL, ...options };
	const xs: { value: number; kind: SnapKind }[] = [];
	const ys: { value: number; kind: SnapKind }[] = [];
	if (on.centre) {
		xs.push({ value: frame.w / 2, kind: 'centre' });
		ys.push({ value: frame.h / 2, kind: 'centre' });
	}
	if (on.edges) {
		xs.push({ value: 0, kind: 'edge' }, { value: frame.w, kind: 'edge' });
		ys.push({ value: 0, kind: 'edge' }, { value: frame.h, kind: 'edge' });
	}
	if (on.safe) {
		xs.push({ value: insets.left, kind: 'safe' }, { value: frame.w - insets.right, kind: 'safe' });
		ys.push({ value: insets.top, kind: 'safe' }, { value: frame.h - insets.bottom, kind: 'safe' });
	}
	if (on.items) {
		for (const box of others) {
			xs.push({ value: box.x, kind: 'item' }, { value: box.x + box.w / 2, kind: 'item' }, { value: box.x + box.w, kind: 'item' });
			ys.push({ value: box.y, kind: 'item' }, { value: box.y + box.h / 2, kind: 'item' }, { value: box.y + box.h, kind: 'item' });
		}
	}
	const step = on.grid ? grid : undefined;
	const x = snapAxis(point.x, xs.map((target) => target.value), threshold, step);
	const y = snapAxis(point.y, ys.map((target) => target.value), threshold, step);
	const kindOf = (list: typeof xs, guide?: number) =>
		guide === undefined ? undefined : list.find((target) => target.value === guide)?.kind;
	return {
		x: x.value,
		y: y.value,
		guides: { x: x.guide, y: y.guide, xKind: kindOf(xs, x.guide), yKind: kindOf(ys, y.guide) },
	};
}

/** Arrow keys: 1px, Shift 10px, Ctrl/Cmd one grid step (8px). */
export function nudgeDelta(key: string, shift: boolean, grid = false): { x: number; y: number } | null {
	const step = grid ? SNAP_GRID : shift ? 10 : 1;
	if (key === 'ArrowLeft') return { x: -step, y: 0 };
	if (key === 'ArrowRight') return { x: step, y: 0 };
	if (key === 'ArrowUp') return { x: 0, y: -step };
	if (key === 'ArrowDown') return { x: 0, y: step };
	return null;
}

/** Shift while dragging: keep only the dominant axis of the move. */
export function constrainAxis(delta: { x: number; y: number }): { x: number; y: number } {
	return Math.abs(delta.x) >= Math.abs(delta.y) ? { x: delta.x, y: 0 } : { x: 0, y: delta.y };
}

/** Delta that puts a box's centre on a target (centre buttons). Axis 'h' = horizontal centre. */
export function centreDelta(box: Box, target: { x: number; y: number }, axis: 'h' | 'v' | 'both'): { x: number; y: number } {
	return {
		x: axis === 'v' ? 0 : target.x - (box.x + box.w / 2),
		y: axis === 'h' ? 0 : target.y - (box.y + box.h / 2),
	};
}
