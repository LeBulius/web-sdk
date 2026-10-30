import * as PIXI from 'pixi.js';
import type { LoadedSprite } from 'pixi-svelte';

let punched: PIXI.Texture | null = null;

const isCanvasImage = (value: unknown): value is CanvasImageSource =>
	value instanceof HTMLImageElement ||
	value instanceof ImageBitmap ||
	value instanceof HTMLCanvasElement ||
	(typeof OffscreenCanvas !== 'undefined' && value instanceof OffscreenCanvas);

/** Drop the opaque-black well fills so symbols can sit behind the steel grid. */
export const punchedBoardTexture = (texture: LoadedSprite) => {
	if (punched) return punched;

	const resource = (texture.source as { resource?: unknown }).resource;
	if (!isCanvasImage(resource)) return texture;

	const width = Math.round(texture.orig.width);
	const height = Math.round(texture.orig.height);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) return texture;

	ctx.drawImage(resource, 0, 0, width, height);
	const image = ctx.getImageData(0, 0, width, height);
	const data = image.data;
	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] < 8) continue;
		const lum = data[i] + data[i + 1] + data[i + 2];
		if (lum < 48) data[i + 3] = 0;
	}
	ctx.putImageData(image, 0, 0);
	punched = PIXI.Texture.from(canvas);
	return punched;
};
