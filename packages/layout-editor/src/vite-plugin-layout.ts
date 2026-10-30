/**
 * Vite plugin for the visual builder.
 *
 * - Virtual module `virtual:layout-editor/data` (dev AND build): the whole builder.json.
 * - Dev only: GET|POST /__layout saves one section (queue, baseHash, 409, atomic rename).
 * - Dev only: POST /__upload converts images and writes under src/assets/builder.
 * - Dev only: host allowlist (localhost / 127.0.0.1 / ::1) because `vite dev --host` is on.
 * - Step C: the shared UI layer (packages/ui-builder). The virtual module also exports `ui`:
 *   the pinned ui.json release (dev AND build) and, in dev only, the working ui.json.
 *   GET|POST /__ui edits the working ui.json (dev only, host-guarded, 409 on stale/released).
 * - sharp is loaded with await import('sharp') inside configureServer, never at top level.
 * - Dev only: local RGS under /__rgs (plugin/local-rgs.ts) so the game spins without rgs_url.
 *
 * Import this file by relative path from the game's vite.config.js (vitejs/vite#5370).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';

import { emptyBuilderFile, validateBuilderFile, type BuilderFile } from './builder.schema';
import { atomicWrite } from './plugin/atomic-write';
import { createEchoTracker } from './plugin/echo';
import { FRAMES_HTML } from './plugin/frames-html';
import { hashSections } from './plugin/hash';
import { HMR_EVENT, handleBuilderHotUpdate } from './plugin/hot';
import { DEFAULT_DEV_HOSTS, isDevRequestAllowed } from './plugin/host';
import { parseMultipart, readRawBody } from './plugin/multipart';
import { safeKey } from './plugin/paths';
import { createWriteQueue } from './plugin/queue';
import { readBuilder, saveSection } from './plugin/save';
import { readRound } from './events/books';
import { applyUpload, isUploadSection } from './plugin/upload-apply';
import { loadSharpModule, type SharpFactory } from './plugin/webp';
import { UI_HMR_EVENT, readUiPayload, saveUi } from './plugin/ui-files';
import { LOCAL_RGS_PREFIX, createLocalRgs, defaultMathDir } from './plugin/local-rgs';

export type LayoutEditorPluginOptions = {
	/** Path to builder.json, relative to the Vite root (the app folder) or absolute. */
	file?: string;
	endpoint?: string;
	uploadEndpoint?: string;
	framesPath?: string;
	maxBodyBytes?: number;
	/** Host allowlist for /__layout and /__upload. Defaults to localhost, 127.0.0.1, ::1. */
	allowHosts?: string[];
	/**
	 * Test seam. Production code path is `await import('sharp')` inside the upload handler.
	 * When this throws, dev upload reports "sharp missing" and `vite build` never calls it.
	 */
	loadSharp?: () => Promise<SharpFactory>;
	/** packages/ui-builder folder. Defaults to <root>/../../packages/ui-builder. */
	uiDir?: string;
	uiEndpoint?: string;
};

const VIRTUAL_ID = 'virtual:layout-editor/data';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID;

export function layoutEditorPlugin(options: LayoutEditorPluginOptions = {}): Plugin {
	const endpoint = options.endpoint ?? '/__layout';
	const uploadEndpoint = options.uploadEndpoint ?? '/__upload';
	const framesPath = options.framesPath ?? '/__layout-frames';
	const slotsPath = '/dev/art-slots.json';
	const devJson: Record<string, string> = {
		'/dev/event-catalogue.json': 'dev/event-catalogue.json',
		'/dev/builder_rounds.json': 'dev/builder_rounds.json',
	};
	const maxBodyBytes = options.maxBodyBytes ?? 1024 * 1024;
	const uploadLimit = 64 * 1024 * 1024;
	const allowHosts = options.allowHosts ?? [...DEFAULT_DEV_HOSTS];
	const echo = createEchoTracker();
	const uiEcho = createEchoTracker();
	const enqueue = createWriteQueue();
	const uiEndpoint = options.uiEndpoint ?? '/__ui';
	let config: ResolvedConfig;
	let filePath = '';
	let outputRoot = '';
	let uiDir = '';
	const pinOf = async () => {
		try {
			return (JSON.parse(await fs.readFile(filePath, 'utf8')) as BuilderFile).ui?.pin;
		} catch {
			return undefined;
		}
	};
	const readCatalogue = async () => {
		try {
			return JSON.parse(await fs.readFile(path.resolve(config.root, 'dev/event-catalogue.json'), 'utf8'));
		} catch {
			return null;
		}
	};

	const readValidated = async (): Promise<BuilderFile> => {
		const parsed = await readBuilder(filePath);
		const errors = validateBuilderFile(parsed);
		if (errors.length) {
			config.logger.warn(`[layout-editor] ${filePath} is invalid:\n  ${errors.join('\n  ')}`);
		}
		return parsed;
	};

	const invalidate = (server: ViteDevServer) => {
		const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
		if (mod) server.moduleGraph.invalidateModule(mod);
	};

	return {
		name: 'layout-editor',

		configResolved(resolved) {
			config = resolved;
			filePath = path.resolve(resolved.root, options.file ?? 'src/game/builder.json');
			outputRoot = path.resolve(resolved.root, 'src/assets/builder');
			uiDir = path.resolve(resolved.root, options.uiDir ?? '../../packages/ui-builder');
		},

		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
		},

		async load(id) {
			if (id !== RESOLVED_VIRTUAL_ID) return;
			this.addWatchFile(filePath);
			let data: BuilderFile;
			try {
				data = JSON.parse(await fs.readFile(filePath, 'utf8')) as BuilderFile;
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
				data = emptyBuilderFile();
			}
			const hashes = hashSections(data);
			this.addWatchFile(path.join(uiDir, 'ui.json'));
			// Production ships only the pinned release; the working ui.json is dev-only.
			const ui = await readUiPayload(uiDir, data.ui?.pin, config.command === 'serve');
			return [
				`export default ${JSON.stringify(data)};`,
				`export const hashes = ${JSON.stringify(hashes)};`,
				`export const ui = ${JSON.stringify(ui)};`,
			].join('\n');
		},

		configureServer(server) {
			// Dev-only local RGS (Stake wallet endpoints) so plain http://localhost:<port>/ can spin.
			const localRgs = createLocalRgs({
				mathDir: process.env.LOCAL_RGS_MATH_DIR || defaultMathDir(config.root),
				log: (line) => config.logger.info(line),
				error: (line) => config.logger.error(line),
			});
			localRgs.describe();
			server.middlewares.use(LOCAL_RGS_PREFIX, localRgs.middleware);
			// sharp is intentionally not imported here. The upload route imports it on demand.
			server.middlewares.use(async (req, res, next) => {
				const url = (req.url ?? '').split('?')[0];
				const isLayout = url === endpoint;
				const isUpload = url === uploadEndpoint;
				const isUi = url === uiEndpoint;
				const devFile = devJson[url];
				if (!isLayout && !isUpload && !isUi && url !== framesPath && url !== slotsPath && !devFile && url !== '/dev/round') {
					next();
					return;
				}
				if (devFile && req.method === 'GET') {
					try {
						const raw = await fs.readFile(path.resolve(config.root, devFile));
						res.setHeader('content-type', 'application/json');
						res.end(raw);
					} catch {
						res.statusCode = 404;
						res.end(`${devFile} not found`);
					}
					return;
				}
				if (url === '/dev/round' && req.method === 'GET') {
					const params = new URL(req.url ?? '', 'http://localhost').searchParams;
					const mode = params.get('mode') ?? '';
					const id = Number(params.get('id'));
					if (!/^[a-z0-9_]+$/.test(mode) || !Number.isInteger(id)) {
						res.statusCode = 400;
						res.end('mode and id are required');
						return;
					}
					try {
						const round = readRound(path.resolve(config.root, 'fixtures/books'), mode, id);
						if (!round) {
							res.statusCode = 404;
							res.end('round not found');
							return;
						}
						res.setHeader('content-type', 'application/json');
						res.end(JSON.stringify(round));
					} catch (error) {
						res.statusCode = 404;
						res.end(String(error));
					}
					return;
				}
				if (url === slotsPath && req.method === 'GET') {
					try {
						const raw = await fs.readFile(path.join(path.dirname(filePath), 'art-slots.json'), 'utf8');
						res.setHeader('content-type', 'application/json');
						res.end(raw);
					} catch {
						res.statusCode = 404;
						res.end('art-slots.json not found');
					}
					return;
				}
				if ((isLayout || isUpload || isUi) && !isDevRequestAllowed(req.headers, allowHosts)) {
					res.statusCode = 403;
					res.end('forbidden host');
					return;
				}

				if (url === framesPath && req.method === 'GET') {
					res.setHeader('content-type', 'text/html; charset=utf-8');
					res.end(FRAMES_HTML);
					return;
				}

				if (isUi && req.method === 'GET') {
					res.setHeader('content-type', 'application/json');
					res.end(JSON.stringify(await readUiPayload(uiDir, await pinOf(), true)));
					return;
				}

				if (isUi && req.method === 'POST') {
					try {
						if (!(req.headers['content-type'] ?? '').includes('application/json')) {
							res.statusCode = 415;
							res.end('expected application/json');
							return;
						}
						const raw = await readRawBody(req, maxBodyBytes);
						const body = JSON.parse(raw.toString('utf8')) as { data?: unknown; baseHash?: unknown };
						const catalogue = await readCatalogue();
						const result = await enqueue(() =>
							saveUi({ uiDir, data: body.data, baseHash: body.baseHash, catalogue, echo: uiEcho }),
						);
						invalidate(server);
						res.statusCode = result.status;
						res.setHeader('content-type', 'application/json');
						res.end(JSON.stringify(result.body));
					} catch (error) {
						res.statusCode = 400;
						res.end(String(error));
					}
					return;
				}

				if (isLayout && req.method === 'GET') {
					const file = await readValidated();
					res.setHeader('content-type', 'application/json');
					res.end(JSON.stringify({ file, hashes: hashSections(file) }));
					return;
				}

				if (isLayout && req.method === 'POST') {
					try {
						if (!(req.headers['content-type'] ?? '').includes('application/json')) {
							res.statusCode = 415;
							res.end('expected application/json');
							return;
						}
						const raw = await readRawBody(req, maxBodyBytes);
						const body = JSON.parse(raw.toString('utf8')) as {
							section?: string;
							data?: unknown;
							baseHash?: unknown;
						};
						const result = await enqueue(() =>
							saveSection({
								builderPath: filePath,
								section: body.section ?? '',
								data: body.data,
								baseHash: body.baseHash,
								echo,
							}),
						);
						invalidate(server);
						res.statusCode = result.status;
						res.setHeader('content-type', 'application/json');
						res.end(JSON.stringify(result.body));
					} catch (error) {
						res.statusCode = 400;
						res.end(String(error));
					}
					return;
				}

				if (isUpload && req.method === 'POST') {
					try {
						const contentType = req.headers['content-type'] ?? '';
						if (!contentType.includes('multipart/form-data')) {
							res.statusCode = 400;
							res.end('expected multipart/form-data');
							return;
						}
						const raw = await readRawBody(req, uploadLimit);
						const form = parseMultipart(raw, contentType);
						const section = form.fields.section ?? '';
						const key = safeKey(form.fields.key ?? '');
						if (!isUploadSection(section)) {
							res.statusCode = 400;
							res.end('section must be art, spine, or audio');
							return;
						}
						if (!key) {
							res.statusCode = 400;
							res.end('key must be a short id');
							return;
						}
						if (form.files.length === 0) {
							res.statusCode = 400;
							res.end('no files');
							return;
						}
						let sharp: SharpFactory | null = null;
						let sharpError: string | undefined;
						try {
							sharp = await (options.loadSharp ?? loadSharpModule)();
						} catch (error) {
							const message = error instanceof Error ? error.message : String(error);
							sharpError = message.includes('sharp missing') ? message : `sharp missing: ${message}`;
						}
						const result = await enqueue(async () => {
							const builder = await readBuilder(filePath);
							return applyUpload({
								root: config.root,
								section,
								key,
								files: form.files,
								sharp,
								sharpError,
								builder,
								builderPath: filePath,
								echo,
							});
						});
						invalidate(server);
						res.statusCode = result.status;
						res.setHeader('content-type', 'application/json');
						res.end(JSON.stringify(result.body));
					} catch (error) {
						const message = error instanceof Error ? error.message : String(error);
						res.statusCode = message.includes('sharp missing') ? 500 : 400;
						res.end(message);
					}
					return;
				}

				next();
			});
		},

		async handleHotUpdate(ctx) {
			const changed = path.resolve(ctx.file);
			if (changed === path.join(uiDir, 'ui.json') || changed.startsWith(path.join(uiDir, 'releases') + path.sep)) {
				const mod = ctx.server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
				if (mod) ctx.server.moduleGraph.invalidateModule(mod);
				if (uiEcho.consume(await ctx.read())) return [];
				ctx.server.ws.send({
					type: 'custom',
					event: UI_HMR_EVENT,
					data: await readUiPayload(uiDir, await pinOf(), true),
				});
				return [];
			}
			return handleBuilderHotUpdate({
				file: ctx.file,
				content: await ctx.read(),
				builderPath: filePath,
				outputRoot,
				echo,
				invalidate: () => {
					const mod = ctx.server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
					if (mod) ctx.server.moduleGraph.invalidateModule(mod);
				},
				send: (payload) => {
					ctx.server.ws.send({ type: 'custom', event: HMR_EVENT, data: payload });
				},
				warn: (message) => config.logger.warn(message),
			});
		},
	};
}

export { atomicWrite };
