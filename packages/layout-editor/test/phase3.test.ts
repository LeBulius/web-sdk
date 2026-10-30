import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
	artUploadIssues,
	frameKeyError,
	gpuBytes,
	imageWarnings,
	localeIssues,
	memoryWarning,
	missingMobileWarnings,
	rimRect,
	sampleHashIssue,
	spritesheetIssues,
	type ArtCatalogue,
} from '../src/art/validate';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function catalogue(): ArtCatalogue {
	return JSON.parse(
		fs.readFileSync(path.join(repoRoot, 'apps/locked/src/game/art-slots.json'), 'utf8'),
	) as ArtCatalogue;
}

describe('phase 3 art', () => {
	it('rejects a rotated spritesheet and a numbered stem on a slot that does not allow it', () => {
		const slots = catalogue();
		const rotated = artUploadIssues(
			'symbol_H1',
			[
				{
					filename: 'spritesheet.json',
					data: Buffer.from(
						JSON.stringify({
							frames: { H1: { rotated: true, filename: 'H1.png' } },
							meta: { image: 'H1.png' },
						}),
					),
				},
			],
			slots,
		);
		expect(rotated.some((issue) => issue.level === 'error' && /rotated/i.test(issue.message))).toBe(true);

		const numbered = artUploadIssues(
			'symbol_H1',
			[{ filename: 'H1_0000_.png', data: Buffer.from('png') }],
			slots,
		);
		expect(numbered.some((issue) => /_0000_/.test(issue.message))).toBe(true);
		expect(frameKeyError('H1_0000_', 'H1_0000_.png', false)).toMatch(/numbered/);
		expect(frameKeyError('H1', 'H1.png', false)).toBeNull();
		expect(
			spritesheetIssues({ frames: { other: { filename: 'H1.png' } } }, slots.slots.find((slot) => slot.id === 'symbol_H1')),
		).toEqual([expect.objectContaining({ level: 'error' })]);
	});

	it('requires all 16 press-to-continue locales and rejects a known sample hash', () => {
		const slots = catalogue();
		expect(slots.locales).toHaveLength(16);
		const missing = localeIssues(['en.png', 'de.png'], slots.locales ?? []);
		expect(missing[0]?.message).toMatch(/missing locale/);
		const hash = createHash('sha256').update('sample-asset').digest('hex');
		expect(sampleHashIssue(hash, [hash])?.level).toBe('error');
		expect(sampleHashIssue(hash, [])).toBeNull();
	});

	it('warns on huge textures, unused alpha, a hard fringe, missing mobile art, and the phone budget', () => {
		expect(imageWarnings({ width: 5000, height: 10, hasAlpha: false, opaque: true, edgeOpaque: false })[0]?.message).toMatch(
			/4096/,
		);
		expect(imageWarnings({ width: 8, height: 8, hasAlpha: true, opaque: true, edgeOpaque: true })[0]?.message).toMatch(
			/opaque/,
		);
		expect(imageWarnings({ width: 8, height: 8, hasAlpha: true, opaque: false, edgeOpaque: true })[0]?.message).toMatch(
			/fringe/,
		);
		const slots = catalogue();
		const present = new Set(['background_base']);
		expect(missingMobileWarnings(slots, present)[0]?.message).toMatch(/background_base_mobile/);
		const over = gpuBytes([{ w: 9000, h: 9000 }]);
		expect(memoryWarning(over)?.level).toBe('warning');
		expect(memoryWarning(gpuBytes([{ w: 64, h: 36 }]))).toBeNull();
	});

	it('keeps a fire rim inside the cell by the default 2px lock', () => {
		expect(rimRect({ x: 0, y: 0, w: 40, h: 40 })).toEqual({ x: 2, y: 2, w: 36, h: 36 });
		expect(rimRect({ x: 0, y: 0, w: 40, h: 40 }, 0)).toEqual({ x: 0, y: 0, w: 40, h: 40 });
	});

	it('ships demo background, board, and logo as webp with png originals kept out of the output tree', () => {
		const builder = JSON.parse(
			fs.readFileSync(path.join(repoRoot, 'apps/locked/src/game/builder.json'), 'utf8'),
		) as { art: { slots: Record<string, { src?: string }>; moods: Record<string, string>; placeholders?: boolean } };
		expect(builder.art.placeholders).toBe(true);
		expect(builder.art.moods.degen).toBe('background_degen');
		for (const id of ['background_base', 'background_degen', 'background_degen_mobile', 'board_frame', 'screen_logo']) {
			const src = builder.art.slots[id]?.src;
			expect(src, id).toMatch(/\.webp$/);
			expect(fs.existsSync(path.join(repoRoot, 'apps/locked/src/assets/builder', src!))).toBe(true);
		}
		const output = path.join(repoRoot, 'apps/locked/src/assets/builder');
		const walk = (dir: string): string[] =>
			fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
				const next = path.join(dir, entry.name);
				return entry.isDirectory() ? walk(next) : [next];
			});
		expect(walk(output).some((file) => file.endsWith('.png'))).toBe(false);
		expect(fs.existsSync(path.join(repoRoot, 'apps/locked/assets-src/art/screen_logo/logo.png'))).toBe(true);
		expect(fs.existsSync(path.join(repoRoot, 'apps/locked/assets-src/art/background_degen/degen.png'))).toBe(true);
	});
});
