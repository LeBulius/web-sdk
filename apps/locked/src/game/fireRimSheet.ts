import * as PIXI from 'pixi.js';

import { FIRE_RIM_COLS, FIRE_RIM_ROWS } from './constants';
import { cellKey } from './overlayMiniReel';
import { stateGame } from './stateGame.svelte';
import type { Position } from './types';

const sliced = new WeakMap<object, PIXI.Texture[]>();

/** Native fire sheet. Frames are 443.5px; we use equal 443 cells then crop. */
const SHEET_W = 1774;
const SHEET_H = 887;
const CELL = 443;
const CROP = 430;

/**
 * Opaque-content center inside each 443 cell (left→right, top→bottom).
 * The ring drifts ~10px across the sheet; cropping around these keeps it registered.
 */
const CONTENT_CENTER: ReadonlyArray<readonly [number, number]> = [
	[228.5, 227],
	[223, 226.5],
	[220.5, 226.5],
	[217, 226],
	[228, 216],
	[224, 215.5],
	[220.5, 216.5],
	[217.5, 216.5],
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const registeredFrame = (index: number, cellX: number, cellY: number) => {
	const [cx, cy] = CONTENT_CENTER[index] ?? [CELL / 2, CELL / 2];
	const x = clamp(Math.round(cellX + cx - CROP / 2), cellX, cellX + CELL - CROP);
	const y = clamp(Math.round(cellY + cy - CROP / 2), cellY, cellY + CELL - CROP);
	return new PIXI.Rectangle(x, y, CROP, CROP);
};

/** Slice the 4×2 hollow fire-rim sheet into playback order (left→right, top→bottom). */
export const sliceFireRimSheet = (sheet: PIXI.Texture): PIXI.Texture[] => {
	const cached = sliced.get(sheet.source);
	if (cached?.length) return cached;
	if (!sheet.width || !sheet.height) return [];

	const registered =
		Math.round(sheet.width) === SHEET_W && Math.round(sheet.height) === SHEET_H;
	const cellW = registered ? CELL : Math.floor(sheet.width / FIRE_RIM_COLS);
	const cellH = registered ? CELL : Math.floor(sheet.height / FIRE_RIM_ROWS);

	const frames: PIXI.Texture[] = [];
	for (let row = 0; row < FIRE_RIM_ROWS; row += 1) {
		for (let col = 0; col < FIRE_RIM_COLS; col += 1) {
			const index = row * FIRE_RIM_COLS + col;
			const cellX = col * cellW;
			const cellY = row * cellH;
			const frame = registered
				? registeredFrame(index, cellX, cellY)
				: new PIXI.Rectangle(cellX, cellY, cellW, cellH);
			frames.push(
				new PIXI.Texture({
					source: sheet.source,
					frame,
				}),
			);
		}
	}

	sliced.set(sheet.source, frames);
	return frames;
};

/** Replace the live overlay; cells that drop out fade for FIRE_RIM_FADE_MS. */
export const setFireFrames = (next: Position[]) => {
	const nextKeys = new Set(next.map(cellKey));
	const seen = new Set<string>();
	const leaving: Position[] = [];
	for (const pos of [...stateGame.fireFrames, ...stateGame.fireFramesLeaving]) {
		const key = cellKey(pos);
		if (nextKeys.has(key) || seen.has(key)) continue;
		seen.add(key);
		leaving.push(pos);
	}
	stateGame.fireFramesLeaving = leaving;
	stateGame.fireFrames = next;
};
