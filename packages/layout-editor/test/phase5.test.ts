import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { emptyBuilderFile, serializeBuilderFile, validateBuilderFile } from '../src/builder.schema';
import { applyVisualEvent, dispatchSpineBindings, resolveVisual, spineFindings } from '../src/spine/adapter';
import { atlasHasPma, prepareSpineUpload } from '../src/spine/meta';
import { validateSpineSection } from '../src/spine/validate';
import { createEchoTracker } from '../src/plugin/echo';
import { applyUpload } from '../src/plugin/upload-apply';
import sharp from 'sharp';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const locked = path.join(repoRoot, 'apps/locked');

const pose = { x: 12, y: 34, scale: 1.5, anchor: [0.25, 0.75] as [number, number] };

describe('phase 5 spine adapter', () => {
	it('falls back to the static WebP with the same pose and does not throw', () => {
		const art = { slots: { symbol_H1: { src: 'art/symbol_H1/h1.webp', anchor: [0.5, 0.5] } } };
		const visual = resolveVisual({ id: 'symbol_H1', spine: {}, art, pose });
		expect(visual.kind).toBe('static');
		expect(visual.texture).toBe('art/symbol_H1/h1.webp');
		expect(visual.x).toBe(12);
		expect(visual.y).toBe(34);
		expect(visual.scale).toBe(1.5);
		expect(visual.anchor).toEqual([0.25, 0.75]);
		expect(applyVisualEvent(visual, { anim: 'win' })).toEqual({ applied: false, mode: 'noop', reason: 'static' });
		expect(spineFindings({}, art, ['symbol_H1']).some((issue) => issue.level === 'error')).toBe(false);
		expect(spineFindings({}, art, ['symbol_H1']).some((issue) => issue.code === 'static-fallback' && issue.level === 'ok')).toBe(true);
	});

	it('uses Spine when the export exists, and a later export replaces the static slot', () => {
		const art = { slots: { symbol_H1: { src: 'art/symbol_H1/h1.webp' } } };
		const before = resolveVisual({ id: 'symbol_H1', spine: {}, art, pose });
		expect(before.kind).toBe('static');
		const spine = {
			symbol_H1: {
				skeleton: 'spine/symbol_H1/h.json',
				atlas: 'spine/symbol_H1/h.atlas',
				version: '4.2.74',
				pma: false,
				animations: ['win', 'idle'],
			},
		};
		const after = resolveVisual({ id: 'symbol_H1', spine, art, pose });
		expect(after.kind).toBe('spine');
		expect(after.skeleton).toBe('spine/symbol_H1/h.json');
		expect(after.atlas).toBe('spine/symbol_H1/h.atlas');
		expect(after.x).toBe(before.x);
		expect(after.y).toBe(before.y);
		expect(after.scale).toBe(before.scale);
		expect(after.anchor).toEqual(before.anchor);
		expect(after.texture).toBe(before.texture);
		expect(applyVisualEvent(after, { anim: 'win' })).toMatchObject({ applied: true, mode: 'spine', anim: 'win' });
		expect(applyVisualEvent(after, { anim: 'nope' }).reason).toBe('unknown-anim');
	});

	it('treats a missing atlas as a static fallback', () => {
		const art = { slots: { screen_logo: { src: 'art/screen_logo/logo.webp' } } };
		const spine = { screen_logo: { skeleton: 'spine/screen_logo/logo.json', version: '4.2.1' } };
		const visual = resolveVisual({ id: 'screen_logo', spine, art, pose });
		expect(visual.kind).toBe('static');
		expect(visual.texture).toBe('art/screen_logo/logo.webp');
		expect(validateSpineSection(spine).filter((issue) => issue.level === 'error')).toEqual([]);
	});

	it('reads pma from the atlas only and rejects anything other than 4.2.x', () => {
		const atlas = 'page.png\nsize: 64, 64\npma: true\n';
		expect(atlasHasPma(atlas)).toBe(true);
		const prepared = prepareSpineUpload(
			JSON.stringify({
				skeleton: { spine: '4.2.22', premultipliedAlpha: true },
				premultipliedAlpha: true,
				bones: [{ name: 'root' }],
				animations: { idle: {} },
				skins: [{ name: 'default' }],
				events: { footstep: {} },
			}),
			atlas,
		);
		expect(prepared.meta.pma).toBe(true);
		expect(prepared.meta.version).toBe('4.2.22');
		expect(prepared.meta.animations).toEqual(['idle']);
		expect(prepared.skeletonText).not.toContain('premultipliedAlpha');
		const straight = prepareSpineUpload(
			JSON.stringify({ skeleton: { spine: '4.2.22', premultipliedAlpha: true }, bones: [] }),
			'page.png\nsize: 8, 8\n',
		);
		expect(straight.meta.pma).toBe(false);
		expect(() =>
			prepareSpineUpload(JSON.stringify({ skeleton: { spine: '4.3.0' }, bones: [] }), 'page.png\nsize: 8, 8\n'),
		).toThrow(/4\.2/);
		expect(prepareSpineUpload(JSON.stringify({ skeleton: { spine: '4.2.0' }, bones: [] }), 'big.png\nsize: 4096, 64\n').meta.warnings[0]).toMatch(/2048/);
	});

	it('rejects portrait placements, legacy events, and unknown anims, and keeps static fallback ok', () => {
		const spine = {
			placements: { character: { portrait: { x: 1 }, desktop: { x: 180, y: 520, scale: 0.35, anchor: [0.5, 1] } } },
			eventMap: [
				{ bookEvent: 'wildUpgrade', skeleton: 'spineboy', anim: 'idle', target: 'global' },
				{ bookEvent: 'reveal', skeleton: 'spineboy', anim: 'missing', target: 'global' },
			],
			spineboy: {
				skeleton: 'spine/spineboy/spineboy.json',
				atlas: 'spine/spineboy/spineboy-pma.atlas',
				version: '4.2.22',
				animations: ['idle'],
				pma: true,
			},
			premultipliedAlpha: true,
		};
		const messages = validateSpineSection(spine).filter((issue) => issue.level === 'error').map((issue) => issue.message);
		expect(messages.some((message) => message.includes('portrait'))).toBe(true);
		expect(messages.some((message) => message.includes('wildUpgrade'))).toBe(true);
		expect(messages.some((message) => message.includes('missing'))).toBe(true);
		expect(messages.some((message) => message.includes('premultipliedAlpha'))).toBe(true);
		const clean = {
			spineboy: {
				skeleton: 'spine/spineboy/spineboy.json',
				atlas: 'spine/spineboy/spineboy-pma.atlas',
				version: '4.2.22',
				animations: ['idle'],
				pma: true,
			},
			items: { character: { skeleton: 'spineboy' } },
			placements: { character: { desktop: { x: 180, y: 520, scale: 0.35, anchor: [0.5, 1] }, mobileL: { x: 10, y: 20, scale: 0.2, anchor: [0.5, 1] } } },
		};
		expect(validateSpineSection(clean).filter((issue) => issue.level === 'error')).toEqual([]);
		const mobile = resolveVisual({ id: 'character', spine: clean, art: {}, viewport: 'mobileS' });
		expect(mobile.kind).toBe('spine');
		expect(mobile.x).toBe(10);
		expect(mobile.y).toBe(20);
		const desktop = resolveVisual({ id: 'character', spine: clean, art: {}, viewport: 'desktop' });
		expect(desktop.x).toBe(180);
		expect(desktop.scale).toBe(0.35);
	});

	it('gates win bindings and no-ops a static target', () => {
		const spine = {
			eventMap: [
				{ bookEvent: 'setWin', skeleton: 'spineboy', anim: 'jump', target: 'global' },
				{ bookEvent: 'reveal', skeleton: 'symbol_H1', anim: 'land', target: 'eachRevealedSymbol' },
			],
			spineboy: {
				skeleton: 'spine/spineboy/spineboy.json',
				atlas: 'spine/spineboy/spineboy-pma.atlas',
				animations: ['jump'],
				version: '4.2.22',
			},
		};
		const art = { slots: { symbol_H1: { src: 'art/symbol_H1/h1.webp' } } };
		expect(dispatchSpineBindings({ type: 'setWin', index: 1, amount: 0 }, spine, art)[0]?.reason).toBe('win-gate');
		expect(dispatchSpineBindings({ type: 'setWin', index: 1, amount: 20 }, spine, art)[0]).toMatchObject({
			applied: true,
			mode: 'spine',
			anim: 'jump',
		});
		expect(dispatchSpineBindings({ type: 'reveal', index: 0 }, spine, art)[0]).toMatchObject({
			applied: false,
			mode: 'noop',
			reason: 'static',
		});
	});

	it('ships the spineboy fixture as Spine and the logo as static', () => {
		const builder = JSON.parse(fs.readFileSync(path.join(locked, 'src/game/builder.json'), 'utf8')) as {
			spine: Record<string, unknown>;
			art: Record<string, unknown>;
		};
		expect(validateBuilderFile(builder)).toEqual([]);
		const logo = resolveVisual({
			id: 'screen_logo',
			spine: builder.spine,
			art: builder.art,
			viewport: 'desktop',
			pose: { x: 0, y: -48, anchor: [0.5, 1], scale: 1 },
		});
		expect(logo.kind).toBe('static');
		expect(logo.texture).toMatch(/logo\.webp$/);
		const character = resolveVisual({ id: 'character', spine: builder.spine, art: builder.art, viewport: 'desktop' });
		expect(character.kind).toBe('spine');
		expect(character.pma).toBe(true);
		expect(character.version).toMatch(/^4\.2\./);
		expect(character.x).toBe(180);
		expect(character.anchor).toEqual([0.5, 1]);
		const atlas = fs.readFileSync(path.join(locked, 'src/assets/builder/spine/spineboy/spineboy-pma.atlas'), 'utf8');
		expect(atlas).not.toMatch(/\.png/);
		expect(atlas).toContain('spineboy-pma.webp');
		expect(atlas).toMatch(/pma:\s*true/);
		expect(fs.existsSync(path.join(locked, 'src/assets/builder/spine/spineboy/spineboy-pma.webp'))).toBe(true);
		const skeleton = fs.readFileSync(path.join(locked, 'src/assets/builder/spine/spineboy/spineboy.json'), 'utf8');
		expect(skeleton).not.toContain('premultipliedAlpha');
		const findings = spineFindings(builder.spine, builder.art, ['screen_logo', 'symbol_H1', 'character']);
		expect(findings.filter((issue) => issue.level === 'error')).toEqual([]);
		expect(findings.find((issue) => issue.id === 'screen_logo')?.code).toBe('static-fallback');
		expect(findings.find((issue) => issue.id === 'character')?.code).toBeUndefined();
	});
});

describe('phase 5 spine upload', () => {
	it('rejects a non-4.2 export, keeps pma off the skeleton, and warns on a huge page', async () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spine-upload-'));
		const builderPath = path.join(root, 'src/game/builder.json');
		fs.mkdirSync(path.dirname(builderPath), { recursive: true });
		const builder = emptyBuilderFile();
		fs.writeFileSync(builderPath, serializeBuilderFile(builder));
		const png = await sharp({
			create: { width: 2, height: 1, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 1 } },
		})
			.png()
			.toBuffer();
		const bad = await applyUpload({
			root,
			section: 'spine',
			key: 'late',
			files: [
				{ filename: 'late.atlas', data: Buffer.from('late.png\nsize: 2, 1\n') },
				{ filename: 'late.json', data: Buffer.from(JSON.stringify({ skeleton: { spine: '4.3.1' }, bones: [] })) },
				{ filename: 'late.png', data: png },
			],
			sharp: sharp as never,
			builder,
			builderPath,
			echo: createEchoTracker(),
		});
		expect(bad.status).toBe(400);
		expect(bad.body.error).toMatch(/4\.2/);
		expect(fs.existsSync(path.join(root, 'src/assets/builder/spine/late'))).toBe(false);

		const ok = await applyUpload({
			root,
			section: 'spine',
			key: 'hero',
			files: [
				{ filename: 'hero.atlas', data: Buffer.from('hero.png\nsize: 3000, 16\npma: true\n') },
				{
					filename: 'hero.json',
					data: Buffer.from(
						JSON.stringify({
							skeleton: { spine: '4.2.74', premultipliedAlpha: true },
							bones: [{ name: 'root' }],
							animations: { idle: {} },
						}),
					),
				},
				{ filename: 'hero.png', data: png },
			],
			sharp: sharp as never,
			builder,
			builderPath,
			echo: createEchoTracker(),
		});
		expect(ok.status, JSON.stringify(ok.body)).toBe(200);
		expect(String(ok.body.warning)).toMatch(/2048/);
		const written = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/builder/spine/hero/hero.json'), 'utf8')) as {
			skeleton: { premultipliedAlpha?: boolean };
		};
		expect(written.skeleton.premultipliedAlpha).toBeUndefined();
		const saved = JSON.parse(fs.readFileSync(builderPath, 'utf8')) as { spine: { hero: { pma: boolean; version: string; animations: string[] } } };
		expect(saved.spine.hero.pma).toBe(true);
		expect(saved.spine.hero.version).toBe('4.2.74');
		expect(saved.spine.hero.animations).toEqual(['idle']);
		expect(JSON.stringify(saved.spine.hero)).not.toContain('premultipliedAlpha');
	});
});
