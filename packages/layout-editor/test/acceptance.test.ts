import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';
import sharp from 'sharp';
import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import {
	VIEWPORT_KEYS,
	VIEWPORTS,
	ancestorChain,
	canonicalSection,
	controlBarBand,
	emptyBuilderFile,
	pickViewport,
	resolveActiveViewport,
	resolveViewportItem,
	screenToDesign,
	serializeBuilderFile,
	validateBuilderFile,
	type BuilderFile,
	type ViewportKey,
} from '../src/builder.schema';
import { clearBandOverride, keysForScope, patchNodeItems, setBandOverride, setControlBar } from '../src/mutate';
import { gameBand, uiBand, type UiFile } from '../../ui-builder/src/ui.schema';
import { createHistory } from '../src/editor/history';
import { eventNamesFromMathMarkdown, isLegacyFeEvent, validateBindings } from '../src/events/catalogue';
import { createEchoTracker } from '../src/plugin/echo';
import { handleBuilderHotUpdate } from '../src/plugin/hot';
import { isDevRequestAllowed } from '../src/plugin/host';
import { hashSections, sectionHash } from '../src/plugin/hash';
import { pruneBuilderOutputs } from '../src/plugin/prune';
import { layoutEditorPlugin } from '../src/vite-plugin-layout';
import { loadSharpModule, webpIsLossless } from '../src/plugin/webp';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const mathEventsPath = path.join(repoRoot, 'apps/locked/MATH_EVENTS.md');

const CASES: { window: [number, number]; key: ViewportKey }[] = [
	{ window: [1300, 700], key: 'desktop' },
	{ window: [1920, 1080], key: 'desktop' },
	{ window: [1100, 600], key: 'laptop' },
	{ window: [1024, 576], key: 'laptop' },
	{ window: [800, 800], key: 'popoutL' },
	{ window: [500, 300], key: 'popoutS' },
	{ window: [200, 100], key: 'popoutS' },
	{ window: [430, 932], key: 'mobileL' },
	{ window: [400, 700], key: 'mobileM' },
	{ window: [320, 568], key: 'mobileS' },
	{ window: [300, 500], key: 'mobileS' },
	{ window: [844, 390], key: 'popoutS' },
	{ window: [1024, 1366], key: 'mobileL' },
];

describe('viewports and inheritance', () => {
	it('picks the Stake key for every acceptance window', () => {
		for (const row of CASES) {
			expect(pickViewport(row.window[0], row.window[1]), String(row.window)).toBe(row.key);
		}
	});

	it('lets the editor size picker override any window', () => {
		expect(resolveActiveViewport(1920, 1080, 'popoutL')).toBe('popoutL');
		expect(resolveActiveViewport(320, 568, 'popoutL')).toBe('popoutL');
	});

	it('resolves desktop overrides down the landscape chain, then a popoutL override', () => {
		const file = emptyBuilderFile();
		patchNodeItems(file, 'board', ['desktop'], { x: 10, y: 20 });
		for (const key of ['desktop', 'laptop', 'popoutL', 'popoutS'] as const) {
			expect(resolveViewportItem(key, 'board', file.layout.viewports)).toMatchObject({ x: 10, y: 20 });
		}
		for (const key of ['mobileL', 'mobileM', 'mobileS'] as const) {
			expect(resolveViewportItem(key, 'board', file.layout.viewports)).toEqual({});
		}
		patchNodeItems(file, 'board', ['popoutL'], { x: 30 });
		expect(resolveViewportItem('popoutS', 'board', file.layout.viewports)).toMatchObject({ x: 30, y: 20 });
		expect(resolveViewportItem('desktop', 'board', file.layout.viewports)).toMatchObject({ x: 10, y: 20 });
		expect(resolveViewportItem('laptop', 'board', file.layout.viewports)).toMatchObject({ x: 10, y: 20 });
	});

	it('resolves the portrait chain the same way', () => {
		const file = emptyBuilderFile();
		patchNodeItems(file, 'board', ['mobileL'], { x: 4, y: 8 });
		for (const key of ['mobileL', 'mobileM', 'mobileS'] as const) {
			expect(resolveViewportItem(key, 'board', file.layout.viewports)).toMatchObject({ x: 4, y: 8 });
		}
		patchNodeItems(file, 'board', ['mobileM'], { y: 9 });
		expect(resolveViewportItem('mobileS', 'board', file.layout.viewports)).toMatchObject({ x: 4, y: 9 });
		expect(resolveViewportItem('mobileL', 'board', file.layout.viewports)).toMatchObject({ x: 4, y: 8 });
		expect(ancestorChain('popoutS')).toEqual(['desktop', 'popoutL', 'popoutS']);
		expect(ancestorChain('mobileS')).toEqual(['mobileL', 'mobileM', 'mobileS']);
	});

	it('writes a drag to the active key, or to all seven keys, and never to "*"', () => {
		const file = emptyBuilderFile();
		const one = keysForScope('key', 'laptop');
		expect(one).toEqual(['laptop']);
		patchNodeItems(file, 'board', one, { x: 11, y: 22 });
		expect(file.layout.viewports.laptop.items.board).toMatchObject({ x: 11, y: 22 });
		expect(file.layout.viewports.desktop.items.board).toBeUndefined();
		patchNodeItems(file, 'board', keysForScope('all', 'laptop'), { x: 3, y: 4 });
		for (const key of VIEWPORT_KEYS) {
			expect(file.layout.viewports[key].items.board).toMatchObject({ x: 3, y: 4 });
		}
		expect(JSON.stringify(file)).not.toContain('"*"');
		const withStar = structuredClone(file) as BuilderFile & { layout: { viewports: Record<string, unknown> } };
		withStar.layout.viewports['*'] = { w: 1, h: 1, items: {} };
		expect(validateBuilderFile(withStar).join('\n')).toMatch(/\*/);
	});
});

describe('control bar and units', () => {
	// Step C: the band moved from builder.json layout.reserved.controlBar to the shared
	// packages/ui-builder/ui.json guard rails; a game changes it only via an explicit uiOverride.
	it('inherits 110 and 180 from ui.json (landscape keys 110), then a popoutL override', async () => {
		const shared = JSON.parse(
			await fs.readFile(path.join(repoRoot, 'packages/ui-builder/ui.json'), 'utf8'),
		) as UiFile;
		expect(uiBand(shared, 'desktop')).toBe(110);
		expect(uiBand(shared, 'laptop')).toBe(110);
		expect(uiBand(shared, 'popoutL')).toBe(110);
		expect(uiBand(shared, 'popoutS')).toBe(110);
		expect(uiBand(shared, 'mobileL')).toBe(180);
		expect(uiBand(shared, 'mobileM')).toBe(180);
		expect(uiBand(shared, 'mobileS')).toBe(180);
		expect(uiBand(shared, 'mobileL_land')).toBe(110);
		expect(uiBand(shared, 'mobileM_land')).toBe(110);
		expect(uiBand(shared, 'mobileS_land')).toBe(110);
		const edited = structuredClone(shared);
		edited.guardRails.controlBar.popoutL = 100;
		expect(uiBand(edited, 'popoutL')).toBe(100);
		expect(uiBand(edited, 'popoutS')).toBe(100);
		expect(uiBand(edited, 'laptop')).toBe(110);
		expect(uiBand(edited, 'desktop')).toBe(110);
		// legacy step-B helpers still resolve old files
		const legacy = emptyBuilderFile();
		setControlBar(legacy, 'popoutL', 100);
		expect(controlBarBand('popoutS', legacy.layout.reserved.controlBar)).toBe(100);
	});

	it('edits only the active key as a game override, clamps it, undo restores, reset removes the key', async () => {
		const shared = JSON.parse(
			await fs.readFile(path.join(repoRoot, 'packages/ui-builder/ui.json'), 'utf8'),
		) as UiFile;
		const file = emptyBuilderFile();
		const history = createHistory({
			snapshot: () => structuredClone(file),
			restore: (next) => {
				file.ui = next.ui;
			},
		});
		history.record(() => setBandOverride(file, 'laptop', 150));
		expect(gameBand(shared, file.ui, 'laptop')).toBe(150);
		expect(gameBand(shared, file.ui, 'desktop')).toBe(110);
		expect(gameBand(shared, file.ui, 'popoutL')).toBe(110);
		expect(Object.keys(file.ui!.uiOverrides['controlBar.band']!)).toEqual(['laptop']);
		expect(history.undo()).toBe(true);
		expect(file.ui?.uiOverrides?.['controlBar.band']?.laptop).toBeUndefined();
		expect(gameBand(shared, file.ui, 'laptop')).toBe(110);
		setBandOverride(file, 'popoutS', 90);
		expect(gameBand(shared, file.ui, 'popoutS')).toBe(110);
		setBandOverride(file, 'popoutS', 400);
		expect(gameBand(shared, file.ui, 'popoutS')).toBe(VIEWPORTS.popoutS.h * 0.5);
		clearBandOverride(file, 'popoutS');
		expect(file.ui?.uiOverrides?.['controlBar.band']).toBeUndefined();
		expect(gameBand(shared, file.ui, 'popoutS')).toBe(110);
	});

	it('stores the mobileM frame centre in design pixels for any window', () => {
		const design = { w: VIEWPORTS.mobileM.w, h: VIEWPORTS.mobileM.h };
		for (const frame of [
			{ w: 1920, h: 1080 },
			{ w: 375, h: 667 },
			{ w: 800, h: 600 },
			{ w: 1440, h: 900 },
		]) {
			const point = screenToDesign(design, frame, { x: frame.w / 2, y: frame.h / 2 });
			expect(point.x).toBeCloseTo(187.5, 5);
			expect(point.y).toBeCloseTo(333.5, 5);
		}
	});
});

describe('schema', () => {
	it('rejects a tablet key and anchors outside 0–1', () => {
		const file = emptyBuilderFile();
		expect(validateBuilderFile(file)).toEqual([]);
		const tablet = structuredClone(file) as BuilderFile & { layout: { viewports: Record<string, unknown> } };
		tablet.layout.viewports.tablet = { w: 1024, h: 1366, items: {} };
		expect(validateBuilderFile(tablet).join('\n')).toMatch(/tablet/);
		const anchor = structuredClone(file);
		anchor.layout.viewports.desktop.items.board = { anchor: [1.2, 0.5] };
		expect(validateBuilderFile(anchor).join('\n')).toMatch(/0–1/);
		const portrait = structuredClone(file) as BuilderFile & {
			layout: { reserved: { controlBar: Record<string, number> } };
		};
		portrait.layout.reserved.controlBar.portrait = 180;
		expect(validateBuilderFile(portrait).join('\n')).toMatch(/portrait/);
	});

	it('rejects asset paths that leave src/assets/builder', () => {
		const file = emptyBuilderFile();
		file.art.logo = { src: '/static/logo.webp' };
		expect(validateBuilderFile(file).join('\n')).toMatch(/relative|static/);
		file.art.logo = { src: 'static/logo.webp' };
		expect(validateBuilderFile(file).join('\n')).toMatch(/static/);
		file.art.logo = { src: 'src/logo.webp' };
		expect(validateBuilderFile(file).join('\n')).toMatch(/src/);
		file.art.logo = { src: 'art/logo/logo.wav' };
		expect(validateBuilderFile(file).join('\n')).toMatch(/wav/);
		file.art.logo = { src: 'art/logo/logo.webp' };
		expect(validateBuilderFile(file)).toEqual([]);
	});
});

describe('catalogue hooks', () => {
	it('stays unavailable and refuses legacy FE events', async () => {
		expect(validateBindings()).toEqual({ available: false, reason: 'not available' });
		for (const name of ['wildUpgrade', 'expandWild', 'wildMultiplier', 'updateExpandingWilds', 'createBonusSnapshot']) {
			expect(isLegacyFeEvent(name)).toBe(true);
		}
		expect(isLegacyFeEvent('winInfo')).toBe(false);
		const markdown = await fs.readFile(mathEventsPath, 'utf8');
		const names = eventNamesFromMathMarkdown(markdown);
		for (const name of ['fireFramesPlaced', 'updateGrid', 'contrabandSwap', 'newExpandingWilds', 'tumbleBoard']) {
			expect(names).toContain(name);
		}
		expect(names).not.toContain('wildUpgrade');
		const gameSource = await fs.readFile(path.join(repoRoot, 'apps/locked/src/components/Game.svelte'), 'utf8');
		expect(gameSource).not.toContain('events/catalogue');
		expect(gameSource).not.toContain('typesBookEvent');
	});
});

function request(port: number, options: {
	method: string;
	path: string;
	host?: string;
	headers?: Record<string, string>;
	body?: Buffer | string;
}): Promise<{ status: number; text: string }> {
	return new Promise((resolve, reject) => {
		const body = options.body === undefined ? undefined : Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body);
		const req = http.request(
			{
				hostname: '127.0.0.1',
				port,
				method: options.method,
				path: options.path,
				headers: {
					host: options.host ?? `127.0.0.1:${port}`,
					...(body ? { 'content-length': String(body.length) } : {}),
					...options.headers,
				},
			},
			(res) => {
				const chunks: Buffer[] = [];
				res.on('data', (chunk: Buffer) => chunks.push(chunk));
				res.on('end', () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString('utf8') }));
			},
		);
		req.on('error', reject);
		if (body) req.write(body);
		req.end();
	});
}

function multipart(parts: { name: string; value?: string; filename?: string; type?: string; data?: Buffer }[]) {
	const boundary = `----vb${Math.random().toString(16).slice(2)}`;
	const chunks: Buffer[] = [];
	for (const part of parts) {
		chunks.push(Buffer.from(`--${boundary}\r\n`));
		if (part.filename) {
			chunks.push(
				Buffer.from(
					`Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\nContent-Type: ${part.type ?? 'application/octet-stream'}\r\n\r\n`,
				),
			);
			chunks.push(part.data ?? Buffer.alloc(0));
			chunks.push(Buffer.from('\r\n'));
		} else {
			chunks.push(Buffer.from(`Content-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value ?? ''}\r\n`));
		}
	}
	chunks.push(Buffer.from(`--${boundary}--\r\n`));
	return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

async function startPlugin(root: string, loadSharp?: () => Promise<typeof sharp>): Promise<{ server: ViteDevServer; port: number; file: string }> {
	const server = await createServer({
		root,
		configFile: false,
		logLevel: 'error',
		server: { host: '127.0.0.1', port: 0 },
		plugins: [
			layoutEditorPlugin({
				file: 'src/game/builder.json',
				loadSharp: loadSharp as (() => Promise<never>) | undefined,
			}),
		],
	});
	await server.listen();
	const address = server.httpServer?.address();
	const port = typeof address === 'object' && address ? address.port : 0;
	return { server, port, file: path.join(root, 'src/game/builder.json') };
}

describe('dev server save, upload, host', () => {
	it('saves one section, rejects bad data, and serves a hand edit over HMR without reload', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vb-save-'));
		await fs.mkdir(path.join(root, 'src/game'), { recursive: true });
		const filePath = path.join(root, 'src/game/builder.json');
		const original = emptyBuilderFile();
		original.$schema = 'builder.schema.json';
		await fs.writeFile(filePath, serializeBuilderFile(original));
		const before = await fs.readFile(filePath, 'utf8');
		const hashes = hashSections(original);
		const { server, port } = await startPlugin(root);
		try {
			const layout = structuredClone(original.layout);
			layout.tunables.gap = { desktop: 6 };
			const saved = await request(port, {
				method: 'POST',
				path: '/__layout',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ section: 'layout', data: layout, baseHash: hashes.layout }),
			});
			expect(saved.status).toBe(200);
			const after = JSON.parse(await fs.readFile(filePath, 'utf8')) as BuilderFile;
			expect(after.layout.tunables.gap).toEqual({ desktop: 6 });
			for (const section of ['art', 'spine', 'audio', 'events'] as const) {
				expect(canonicalSection(after, section)).toBe(canonicalSection(original, section));
			}

			const bad = await request(port, {
				method: 'POST',
				path: '/__layout',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					section: 'layout',
					data: { ...layout, viewports: { ...layout.viewports, tablet: { w: 1, h: 1, items: {} } } },
					baseHash: hashSections(after).layout,
				}),
			});
			expect(bad.status).toBe(400);
			const unknown = await request(port, {
				method: 'POST',
				path: '/__layout',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ section: 'nope', data: {}, baseHash: 'abc' }),
			});
			expect(unknown.status).toBe(400);
			expect(await fs.readFile(filePath, 'utf8')).toBe(await fs.readFile(filePath, 'utf8'));

			const sent: unknown[] = [];
			const echo = createEchoTracker();
			const external = serializeBuilderFile(after);
			const hot = handleBuilderHotUpdate({
				file: filePath,
				content: external,
				builderPath: filePath,
				outputRoot: path.join(root, 'src/assets/builder'),
				echo,
				invalidate: () => undefined,
				send: (payload) => sent.push(payload),
				warn: () => undefined,
			});
			expect(hot).toEqual([]);
			expect(sent).toHaveLength(1);

			echo.record(external);
			const echoed = handleBuilderHotUpdate({
				file: filePath,
				content: external,
				builderPath: filePath,
				outputRoot: path.join(root, 'src/assets/builder'),
				echo,
				invalidate: () => undefined,
				send: () => sent.push('echo'),
				warn: () => undefined,
			});
			expect(echoed).toEqual([]);
			expect(sent).toHaveLength(1);
			expect(before.length).toBeGreaterThan(0);
		} finally {
			await server.close();
		}
	});

	it('persists two sections at once, rejects a stale layout hash, and does not echo either write', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vb-race-'));
		await fs.mkdir(path.join(root, 'src/game'), { recursive: true });
		const filePath = path.join(root, 'src/game/builder.json');
		const original = emptyBuilderFile();
		await fs.writeFile(filePath, serializeBuilderFile(original));
		const hashes = hashSections(original);
		const { server, port } = await startPlugin(root);
		const sent: string[] = [];
		const originalSend = server.ws.send.bind(server.ws);
		server.ws.send = ((payload: unknown) => {
			sent.push(JSON.stringify(payload));
			return originalSend(payload as never);
		}) as typeof server.ws.send;
		try {
			const layout = structuredClone(original.layout);
			layout.tunables.gap = { laptop: 2 };
			const [layoutRes, eventsRes] = await Promise.all([
				request(port, {
					method: 'POST',
					path: '/__layout',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ section: 'layout', data: layout, baseHash: hashes.layout }),
				}),
				request(port, {
					method: 'POST',
					path: '/__layout',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ section: 'events', data: { note: 'kept' }, baseHash: hashes.events }),
				}),
			]);
			expect(layoutRes.status).toBe(200);
			expect(eventsRes.status).toBe(200);
			const merged = JSON.parse(await fs.readFile(filePath, 'utf8')) as BuilderFile;
			expect(merged.layout.tunables.gap).toEqual({ laptop: 2 });
			expect(merged.events).toEqual({ note: 'kept' });
			expect(() => JSON.parse(JSON.stringify(merged))).not.toThrow();

			const stale = await request(port, {
				method: 'POST',
				path: '/__layout',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ section: 'layout', data: original.layout, baseHash: hashes.layout }),
			});
			expect(stale.status).toBe(409);
			const unchanged = JSON.parse(await fs.readFile(filePath, 'utf8')) as BuilderFile;
			expect(unchanged.layout.tunables.gap).toEqual({ laptop: 2 });
			expect(unchanged.events).toEqual({ note: 'kept' });
			expect(sent.filter((entry) => entry.includes('layout-editor:update'))).toEqual([]);
		} finally {
			await server.close();
		}
	});

	it('converts WebP by opacity, keeps exact RGB, rewrites atlases, prunes, and checks the host', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vb-up-'));
		await fs.mkdir(path.join(root, 'src/game'), { recursive: true });
		const filePath = path.join(root, 'src/game/builder.json');
		await fs.writeFile(filePath, serializeBuilderFile(emptyBuilderFile()));
		const { server, port } = await startPlugin(root);
		const postFiles = async (fields: { name: string; value?: string; filename?: string; type?: string; data?: Buffer }[]) => {
			const form = multipart(fields);
			return request(port, {
				method: 'POST',
				path: '/__upload',
				headers: { 'content-type': form.contentType },
				body: form.body,
			});
		};
		try {
			const transparent = await sharp(
				Buffer.from([255, 0, 0, 0, 0, 255, 0, 128]),
				{ raw: { width: 2, height: 1, channels: 4 } },
			).png().toBuffer();
			const opaqueRgba = await sharp(
				Buffer.from([10, 20, 30, 255, 40, 50, 60, 255]),
				{ raw: { width: 2, height: 1, channels: 4 } },
			).png().toBuffer();
			const opaqueJpg = await sharp({
				create: { width: 8, height: 8, channels: 3, background: { r: 200, g: 100, b: 40 } },
			}).jpeg().toBuffer();

			const alpha = await postFiles([
				{ name: 'section', value: 'art' },
				{ name: 'key', value: 'alpha' },
				{ name: 'files', filename: 'alpha.png', type: 'image/png', data: transparent },
			]);
			expect(alpha.status).toBe(200);
			const alphaBody = JSON.parse(alpha.text) as { paths: string[]; warning?: string };
			const alphaWebp = await fs.readFile(path.join(root, 'src/assets/builder', alphaBody.paths[0]!));
			expect(webpIsLossless(alphaWebp)).toBe(true);
			expect(await fs.readFile(path.join(root, 'assets-src/art/alpha/alpha.png'))).toEqual(transparent);
			const rawAlpha = await sharp(alphaWebp).ensureAlpha().raw().toBuffer();
			expect([...rawAlpha.subarray(0, 4)]).toEqual([255, 0, 0, 0]);

			const flat = await postFiles([
				{ name: 'section', value: 'art' },
				{ name: 'key', value: 'flat' },
				{ name: 'files', filename: 'flat.png', type: 'image/png', data: opaqueRgba },
			]);
			expect(flat.status).toBe(200);
			const flatPath = JSON.parse(flat.text).paths[0] as string;
			expect(webpIsLossless(await fs.readFile(path.join(root, 'src/assets/builder', flatPath)))).toBe(false);

			const jpg = await postFiles([
				{ name: 'section', value: 'art' },
				{ name: 'key', value: 'photo' },
				{ name: 'files', filename: 'photo.jpg', type: 'image/jpeg', data: opaqueJpg },
			]);
			expect(jpg.status).toBe(200);
			const jpgPath = JSON.parse(jpg.text).paths[0] as string;
			expect(webpIsLossless(await fs.readFile(path.join(root, 'src/assets/builder', jpgPath)))).toBe(false);

			const text = await postFiles([
				{ name: 'section', value: 'art' },
				{ name: 'key', value: 'notes' },
				{ name: 'files', filename: 'notes.txt', type: 'text/plain', data: Buffer.from('nope') },
			]);
			expect(text.status).toBe(400);

			const pageA = await sharp(Buffer.from([255, 0, 0, 0, 10, 20, 30, 128]), {
				raw: { width: 2, height: 1, channels: 4 },
			}).png().toBuffer();
			const pageB = await sharp(Buffer.from([1, 2, 3, 255, 4, 5, 6, 200]), {
				raw: { width: 2, height: 1, channels: 4 },
			}).png().toBuffer();
			const atlas = 'board alpha.png\nsize: 2, 1\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\nslot\n  rotate: false\npage2.png\nsize: 2, 1\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\n';
			const skeleton = JSON.stringify({ skeleton: { spine: '4.2.74' }, bones: [{ name: 'root' }] });
			const atlasRes = await postFiles([
				{ name: 'section', value: 'spine' },
				{ name: 'key', value: 'hero' },
				{ name: 'files', filename: 'hero.atlas', type: 'text/plain', data: Buffer.from(atlas) },
				{ name: 'files', filename: 'hero.json', type: 'application/json', data: Buffer.from(skeleton) },
				{ name: 'files', filename: 'board alpha.png', type: 'image/png', data: pageA },
				{ name: 'files', filename: 'page2.png', type: 'image/png', data: pageB },
			]);
			expect(atlasRes.status, atlasRes.text).toBe(200);
			const writtenAtlas = await fs.readFile(path.join(root, 'src/assets/builder/spine/hero/hero.atlas'), 'utf8');
			expect(writtenAtlas).not.toMatch(/\.png/);
			expect(writtenAtlas).toContain('board alpha.webp');
			const pageOut = await fs.readFile(path.join(root, 'src/assets/builder/spine/hero/board alpha.webp'));
			const pageRaw = await sharp(pageOut).ensureAlpha().raw().toBuffer();
			expect([...pageRaw.subarray(0, 8)]).toEqual([255, 0, 0, 0, 10, 20, 30, 128]);
			expect(webpIsLossless(pageOut)).toBe(true);

			const zipped = Buffer.from(
				zipSync({
					'hero.atlas': new TextEncoder().encode(atlas),
					'hero.json': new TextEncoder().encode(skeleton),
					'board alpha.png': pageA,
					'page2.png': pageB,
				}),
			);
			const zipRes = await postFiles([
				{ name: 'section', value: 'spine' },
				{ name: 'key', value: 'zipped' },
				{ name: 'files', filename: 'hero.zip', type: 'application/zip', data: zipped },
			]);
			expect(zipRes.status, zipRes.text).toBe(200);
			const zippedAtlas = await fs.readFile(path.join(root, 'src/assets/builder/spine/zipped/hero.atlas'), 'utf8');
			expect(zippedAtlas).not.toMatch(/\.png/);

			const beforeMissing = await fs.readFile(filePath, 'utf8');
			const missing = await postFiles([
				{ name: 'section', value: 'spine' },
				{ name: 'key', value: 'broken' },
				{ name: 'files', filename: 'hero.atlas', data: Buffer.from(atlas) },
				{ name: 'files', filename: 'hero.json', data: Buffer.from(skeleton) },
				{ name: 'files', filename: 'board alpha.png', data: pageA },
			]);
			expect(missing.status).toBe(400);
			await expect(fs.access(path.join(root, 'src/assets/builder/spine/broken'))).rejects.toThrow();
			expect(await fs.readFile(filePath, 'utf8')).toBe(beforeMissing);

			const sheetPng = await sharp(Buffer.from([9, 8, 7, 255]), { raw: { width: 1, height: 1, channels: 4 } }).png().toBuffer();
			const sheet = JSON.stringify({ frames: { a: { frame: { x: 0, y: 0, w: 1, h: 1 } } }, meta: { image: 'sheet.png' } });
			const sheetRes = await postFiles([
				{ name: 'section', value: 'art' },
				{ name: 'key', value: 'sheet' },
				{ name: 'files', filename: 'spritesheet.json', data: Buffer.from(sheet) },
				{ name: 'files', filename: 'sheet.png', data: sheetPng },
			]);
			expect(sheetRes.status, sheetRes.text).toBe(200);
			const sheetJson = JSON.parse(await fs.readFile(path.join(root, 'src/assets/builder/art/sheet/spritesheet.json'), 'utf8')) as {
				meta: { image: string };
			};
			expect(sheetJson.meta.image.endsWith('.webp')).toBe(true);

			const builder = JSON.parse(await fs.readFile(filePath, 'utf8')) as BuilderFile;
			const walk = (value: unknown): string[] => {
				if (typeof value === 'string') return [value];
				if (Array.isArray(value)) return value.flatMap(walk);
				if (value && typeof value === 'object') return Object.values(value).flatMap(walk);
				return [];
			};
			for (const section of ['art', 'spine', 'audio'] as const) {
				for (const assetPath of walk(builder[section]).filter((entry) => entry.includes('/'))) {
					expect(assetPath.startsWith('/')).toBe(false);
					expect(assetPath.startsWith('src/')).toBe(false);
					expect(assetPath.startsWith('static/')).toBe(false);
					await fs.access(path.join(root, 'src/assets/builder', assetPath));
				}
			}
			expect(await fs.readdir(path.join(root, 'static')).catch(() => [])).toEqual([]);

			const first = JSON.parse(alpha.text).paths[0] as string;
			await postFiles([
				{ name: 'section', value: 'art' },
				{ name: 'key', value: 'alpha' },
				{ name: 'files', filename: 'replacement.png', type: 'image/png', data: opaqueRgba },
			]);
			await expect(fs.access(path.join(root, 'src/assets/builder', first))).rejects.toThrow();
			const stray = path.join(root, 'src/assets/builder/art/stray.webp');
			await fs.writeFile(stray, alphaWebp);
			const referenced = new Set<string>();
			const collect = (value: unknown) => {
				if (typeof value === 'string' && /^(art|spine|audio)\//.test(value)) referenced.add(value);
				else if (Array.isArray(value)) value.forEach(collect);
				else if (value && typeof value === 'object') Object.values(value).forEach(collect);
			};
			collect(JSON.parse(await fs.readFile(filePath, 'utf8')));
			const pruned = await pruneBuilderOutputs({
				outputRoot: path.join(root, 'src/assets/builder'),
				builder: JSON.parse(await fs.readFile(filePath, 'utf8')),
			});
			expect(pruned.removed).toContain('art/stray.webp');
			for (const assetPath of referenced) {
				await fs.access(path.join(root, 'src/assets/builder', assetPath));
			}

			const forbidden = await request(port, {
				method: 'POST',
				path: '/__upload',
				host: '192.168.1.5:3006',
				headers: { 'content-type': 'application/json' },
				body: '{}',
			});
			expect(forbidden.status).toBe(403);
			const allowed = await request(port, {
				method: 'POST',
				path: '/__upload',
				host: 'localhost:3006',
				headers: { 'content-type': multipart([]).contentType },
				body: multipart([{ name: 'section', value: 'art' }, { name: 'key', value: 'host' }]).body,
			});
			expect(allowed.status).not.toBe(403);
			expect(isDevRequestAllowed({ host: '192.168.1.5:3006' })).toBe(false);
			expect(isDevRequestAllowed({ host: 'localhost:3006' })).toBe(true);
			expect(isDevRequestAllowed({ host: 'localhost:3006', origin: 'http://evil.example' })).toBe(false);
		} finally {
			await server.close();
		}
	});

	it('reports sharp missing without loading it during build module init', async () => {
		await expect(loadSharpModule(async () => {
			throw new Error('Cannot find package sharp');
		})).rejects.toThrow(/sharp missing/);
		const pluginSource = await fs.readFile(path.join(repoRoot, 'packages/layout-editor/src/vite-plugin-layout.ts'), 'utf8');
		expect(pluginSource).not.toMatch(/from ['"]sharp['"]/);
		expect(pluginSource).toMatch(/loadSharpModule/);

		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vb-sharp-'));
		await fs.mkdir(path.join(root, 'src/game'), { recursive: true });
		await fs.writeFile(path.join(root, 'src/game/builder.json'), serializeBuilderFile(emptyBuilderFile()));
		const { server, port } = await startPlugin(root, async () => {
			throw new Error('sharp missing: boom');
		});
		try {
			const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: 'red' } }).png().toBuffer();
			const form = multipart([
				{ name: 'section', value: 'art' },
				{ name: 'key', value: 'x' },
				{ name: 'files', filename: 'x.png', data: png },
			]);
			const response = await request(port, {
				method: 'POST',
				path: '/__upload',
				headers: { 'content-type': form.contentType },
				body: form.body,
			});
			expect(response.status).toBe(500);
			expect(response.text).toMatch(/sharp missing/);
		} finally {
			await server.close();
		}
	});
});

describe('books fixture', () => {
	it('reads the sample index and a real base book event stream', async () => {
		const { zstdDecompressSync } = await import('node:zlib');
		const index = JSON.parse(await fs.readFile(path.join(repoRoot, 'apps/locked/fixtures/books/index.json'), 'utf8')) as {
			modes: { name: string }[];
		};
		const names = index.modes.map((mode) => mode.name);
		expect(names).toEqual(expect.arrayContaining(['base', 'ante', 'bonus', 'bonus_super', 'bonus_mystery', 'degen_spin']));
		const compressed = await fs.readFile(path.join(repoRoot, 'apps/locked/fixtures/books/books_base.jsonl.zst'));
		const text = zstdDecompressSync(compressed).toString('utf8');
		const first = JSON.parse(text.split('\n').find((line) => line.trim())!) as { events: { type: string }[] };
		const types = new Set(first.events.map((event) => event.type));
		expect(types.has('reveal')).toBe(true);
		for (const type of types) expect(isLegacyFeEvent(type)).toBe(false);
		const markdown = await fs.readFile(mathEventsPath, 'utf8');
		for (const type of types) expect(markdown).toContain(type);
	});
});

describe('production build', () => {
	it('emits builder art and strips the editor, originals, and wav', async () => {
		// Vitest sets NODE_ENV=test. Vite then treats import.meta.env.DEV as true and
		// keeps the dev shell. A real `vite build` is production.
		const build = await new Promise<{ code: number; output: string }>((resolve, reject) => {
			const child = spawn('pnpm', ['--filter', 'locked', 'build'], {
				cwd: repoRoot,
				env: { ...process.env, NODE_ENV: 'production' },
			});
			let output = '';
			child.stdout?.on('data', (chunk: Buffer) => {
				output += chunk.toString();
			});
			child.stderr?.on('data', (chunk: Buffer) => {
				output += chunk.toString();
			});
			child.on('error', reject);
			child.on('exit', (code) => resolve({ code: code ?? 1, output }));
		});
		expect(build.code, build.output.slice(-1500)).toBe(0);
		const outDir = path.join(repoRoot, 'apps/locked/build');
		const files: string[] = [];
		const walk = async (dir: string) => {
			for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) await walk(full);
				else files.push(full);
			}
		};
		await walk(outDir);
		const webps = files.filter((file) => /mark-[\w-]+\.webp$/.test(path.basename(file)) || file.endsWith('.webp'));
		expect(webps.length).toBeGreaterThan(0);
		expect(files.some((file) => file.endsWith('.wav'))).toBe(false);
		const blobs = await Promise.all(files.filter((file) => !file.endsWith('.map')).map(async (file) => ({
			file,
			text: await fs.readFile(file).then((buf) => buf.toString('utf8')).catch(() => ''),
		})));
		const joined = blobs.map((blob) => blob.text).join('\n');
		expect(joined).not.toContain('assets-src');
		expect(joined).not.toContain('tweakpane');
		expect(joined).not.toContain('__layout-editor__');
		expect(joined).not.toContain('/__layout');
		expect(joined).not.toContain('/__upload');
		expect(joined).not.toContain('BuilderShell');
	}, 180000);
});
