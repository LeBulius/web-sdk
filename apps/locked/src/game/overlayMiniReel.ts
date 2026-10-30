import * as PIXI from 'pixi.js';
import type { Position } from './types';
import { WILD_CHOOSER_VALUES, WILD_MULT_STRIP_VALUES, WILD_MULT_WINDOW } from './constants';
import { DISPLAY_FONT_FAMILY } from './outfitFont';

export type WildChooserResult = (typeof WILD_CHOOSER_VALUES)[number];

/**
 * Build a repeating strip that lands on `stopValue`.
 * The stop index is derived only from the book value — never rolled here.
 */
export const buildStopStrip = <T>(pool: readonly T[], stopValue: T, cycles: number) => {
	const strip: T[] = [];
	for (let i = 0; i < cycles; i += 1) {
		strip.push(...pool);
	}
	strip.push(...pool);

	let stopIndex = -1;
	for (let i = strip.length - 1; i >= 0; i -= 1) {
		if (strip[i] === stopValue) {
			stopIndex = i;
			break;
		}
	}

	if (stopIndex < 0) {
		strip.push(stopValue);
		stopIndex = strip.length - 1;
	}

	// Extra faces above the window so the mask is never empty while spinning down.
	strip.push(...pool);
	return { strip, stopIndex };
};

export const chooserAssetKey = (result: WildChooserResult) =>
	result === 'VS' ? 'vsChooser' : 'wChooser';

export const multiplierPool = (): number[] => [...WILD_MULT_STRIP_VALUES];

const multiplierTextures = new Map<number, PIXI.Texture>();

/** Canvas-backed sprite faces — PIXI.Text is not composited inside masked overlay reels. */
export const multiplierTexture = (value: number) => {
	const cached = multiplierTextures.get(value);
	if (cached) return cached;

	const size = Math.max(64, Math.ceil(WILD_MULT_WINDOW.size));
	const canvas = document.createElement('canvas');
	canvas.width = size * 2;
	canvas.height = size * 2;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		const empty = PIXI.Texture.EMPTY;
		multiplierTextures.set(value, empty);
		return empty;
	}

	ctx.scale(2, 2);
	ctx.font = `700 ${Math.floor(size * 0.42)}px "${DISPLAY_FONT_FAMILY}", sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.lineJoin = 'round';
	ctx.miterLimit = 2;
	const label = `x${value}`;
	const x = size / 2;
	const y = size / 2;
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 6;
	ctx.strokeText(label, x, y);
	ctx.fillStyle = '#111111';
	ctx.fillText(label, x, y);

	const texture = PIXI.Texture.from(canvas);
	multiplierTextures.set(value, texture);
	return texture;
};

export const cellKey = (position: Position) => `${position.reel}:${position.row}`;
