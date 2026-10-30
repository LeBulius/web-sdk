/**
 * layout-editor: reel grid placement. Origin, cell spacing, per-reel offsets and small per-cell
 * nudges come from builder.json layout.grid (edited in the builder's Layers → Grid). With no grid
 * data every helper returns exactly the old fixed formula (cell = SYMBOL_SIZE, 3-high reels
 * centred on the 5-high ones), so production output is unchanged until a value is saved.
 */
import {
	cellCenterX,
	cellRect,
	gridY,
	readGrid,
	reelLeft,
	reelTop,
	type GridGeometry,
} from 'layout-editor';

import { REEL_ROWS, SYMBOL_SIZE } from './constants';

export const GRID_GEOMETRY: GridGeometry = { cell: SYMBOL_SIZE, rows: REEL_ROWS };

/** Active-viewport grid (reactive: reads the builder store). */
export const activeGrid = () => readGrid({ pitch: SYMBOL_SIZE, reels: REEL_ROWS.length });

/** Symbol centre x. `row` (visible row, 0-based) adds that cell's nudge. */
export const gridSymbolX = (reel: number, row?: number) =>
	cellCenterX(activeGrid(), GRID_GEOMETRY, reel, row);

/** Symbol centre y from a reel-local y in the old units ((row + 0.5) * SYMBOL_SIZE). */
export const gridSymbolY = (reel: number, localY: number) =>
	gridY(activeGrid(), GRID_GEOMETRY, reel, localY);

/** Cell centre for a visible row (0-based). */
export const gridCellCenter = (reel: number, row: number) => {
	const rect = cellRect(activeGrid(), GRID_GEOMETRY, reel, row);
	return { x: rect.cx, y: rect.cy };
};

/** Board-local cell rectangle (pitch cell, top-left) for a visible row (0-based). */
export const gridCellRect = (reel: number, row: number) => {
	const { x, y, width, height } = cellRect(activeGrid(), GRID_GEOMETRY, reel, row);
	return { x, y, width, height };
};

/** Top-left of a reel column (no cell nudges). */
export const gridReelOrigin = (reel: number) => {
	const grid = activeGrid();
	return { x: reelLeft(grid, reel), y: reelTop(grid, GRID_GEOMETRY, reel) };
};

/** Symbol art scale inside its cell (1 = native). */
export const gridSymbolScale = () => activeGrid().symbolScale;
