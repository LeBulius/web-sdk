/**
 * WebP conversion (M2).
 *
 * Lossless when any pixel is not fully opaque (`stats().isOpaque === false`),
 * not merely when an alpha channel exists. Opaque images are lossy q90.
 * Lossless always uses exact: true so RGB under alpha 0 is kept.
 * Atlas pages are always lossless + exact, with no extra premultiply.
 */

export type SharpChain = {
	stats: () => Promise<{ isOpaque: boolean }>;
	webp: (options: { quality?: number; lossless?: boolean; exact?: boolean }) => {
		toBuffer: () => Promise<Buffer>;
	};
};

export type SharpFactory = (input: Buffer) => SharpChain;

async function importSharp(): Promise<{ default: SharpFactory }> {
	// sharp 0.35.0 exports omit the "types" condition, so bundler resolution has no declarations.
	// @ts-expect-error TS7016 — see comment above. The value is only loaded inside configureServer.
	const mod = (await import('sharp')) as { default: SharpFactory };
	return mod;
}

export type WebpResult = {
	data: Buffer;
	lossless: boolean;
	bytesBefore: number;
	bytesAfter: number;
	warning?: string;
};

export async function loadSharpModule(
	importer: () => Promise<{ default: SharpFactory }> = importSharp,
): Promise<SharpFactory> {
	try {
		const mod = await importer();
		return mod.default;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`sharp missing: ${message}`);
	}
}

export async function convertToWebp(
	sharp: SharpFactory,
	input: Buffer,
	mode: 'auto' | 'lossless',
): Promise<WebpResult> {
	const opaque = mode === 'lossless' ? false : (await sharp(input).stats()).isOpaque === true;
	const lossless = mode === 'lossless' || !opaque;
	const data = await sharp(input)
		.webp(lossless ? { lossless: true, exact: true } : { quality: 90 })
		.toBuffer();
	const warning = data.length > input.length ? 'WebP is larger than the source' : undefined;
	return {
		data,
		lossless,
		bytesBefore: input.length,
		bytesAfter: data.length,
		warning,
	};
}

/** VP8L chunk ⇒ lossless. VP8 ⇒ lossy. Matches what `webpinfo` reports. */
export function webpIsLossless(buf: Buffer): boolean {
	if (buf.length < 12) return false;
	if (buf.toString('ascii', 0, 4) !== 'RIFF') return false;
	if (buf.toString('ascii', 8, 12) !== 'WEBP') return false;
	let offset = 12;
	while (offset + 8 <= buf.length) {
		const tag = buf.toString('ascii', offset, offset + 4);
		const size = buf.readUInt32LE(offset + 4);
		if (tag === 'VP8L') return true;
		if (tag === 'VP8 ') return false;
		const padded = size + (size % 2);
		offset += 8 + padded;
	}
	return false;
}
