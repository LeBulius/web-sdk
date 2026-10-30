/**
 * Reel-grid geometry shared by the game (cell/symbol placement) and the editor overlay
 * (selection boxes), so both always agree. Pure; ships to production.
 *
 * Board-local px. Default (empty builder.json grid) reproduces the old fixed formula:
 * cell (reel, row) top-left = (reel * size, (offsetRows(reel) + row) * size).
 */
import type { ResolvedGrid } from '../builder.schema';

export type GridGeometry = {
	/** Cell size (the game's SYMBOL_SIZE). Pitch defaults to it. */
	cell: number;
	/** Visible rows per reel, e.g. [3, 5, 5, 3]. */
	rows: readonly number[];
};

export const maxRows = (geometry: GridGeometry) => Math.max(...geometry.rows);

/** Rows above a short reel so it sits centred on the tallest one. */
export const offsetRows = (geometry: GridGeometry, reel: number) =>
	(maxRows(geometry) - (geometry.rows[reel] ?? maxRows(geometry))) / 2;

const nudge = (grid: ResolvedGrid, reel: number, row: number) => grid.cells[`r${reel}c${row}`] ?? { dx: 0, dy: 0 };

/** Left edge of a reel column (no cell nudge). */
export function reelLeft(grid: ResolvedGrid, reel: number): number {
	return grid.origin.x + reel * grid.pitch.x + (grid.reels[reel]?.dx ?? 0);
}

/** Top of a reel's first visible row (no cell nudge). */
export function reelTop(grid: ResolvedGrid, geometry: GridGeometry, reel: number): number {
	return grid.origin.y + (grid.reels[reel]?.dy ?? 0) + offsetRows(geometry, reel) * grid.pitch.y;
}

/** Cell rectangle; row = visible row from the top (0-based). */
export function cellRect(grid: ResolvedGrid, geometry: GridGeometry, reel: number, row: number) {
	const n = nudge(grid, reel, row);
	const x = reelLeft(grid, reel) + n.dx;
	const y = reelTop(grid, geometry, reel) + row * grid.pitch.y + n.dy;
	return { x, y, width: geometry.cell, height: geometry.cell, cx: x + geometry.cell / 2, cy: y + geometry.cell / 2 };
}

/** Cell centre x. Row is optional (reel-level callers get the reel column centre). */
export function cellCenterX(grid: ResolvedGrid, geometry: GridGeometry, reel: number, row?: number): number {
	const dx = row === undefined ? 0 : nudge(grid, reel, row).dx;
	return reelLeft(grid, reel) + geometry.cell / 2 + dx;
}

/**
 * Map a reel-local y in the old units (`(row + 0.5) * cell`, used by the reel/tumble state
 * machines, also while animating) onto the grid. Cell nudges are interpolated between rows.
 */
export function gridY(grid: ResolvedGrid, geometry: GridGeometry, reel: number, localY: number): number {
	const index = localY / geometry.cell - 0.5;
	const rows = geometry.rows[reel] ?? maxRows(geometry);
	const lo = Math.floor(index);
	const t = index - lo;
	const dyAt = (row: number) => (row < 0 || row >= rows ? 0 : nudge(grid, reel, row).dy);
	const dy = dyAt(lo) * (1 - t) + dyAt(lo + 1) * t;
	return reelTop(grid, geometry, reel) + index * grid.pitch.y + geometry.cell / 2 + dy;
}

/** Bounding box of every visible cell (board-local), for the frame/grid overlay. */
export function gridBounds(grid: ResolvedGrid, geometry: GridGeometry) {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	geometry.rows.forEach((rows, reel) => {
		for (let row = 0; row < rows; row += 1) {
			const rect = cellRect(grid, geometry, reel, row);
			minX = Math.min(minX, rect.x);
			minY = Math.min(minY, rect.y);
			maxX = Math.max(maxX, rect.x + rect.width);
			maxY = Math.max(maxY, rect.y + rect.height);
		}
	});
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
