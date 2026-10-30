/**
 * pnpm builder:check — bindings, shared UI (ui.json, pin, uiOverrides, ui.skin.json) and the
 * mobile-landscape layout check. The TypeScript check (src/check/game-check.ts) is loaded through
 * Vite's SSR loader, so the CLI and the shell's Check button run the same code.
 * Landscape misfits are warnings; only errors set exit code 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const editorRoot = path.resolve(here, '..');
// UI_BUILDER_DIR: check against another ui-builder copy (e.g. a scratch edit) without touching the real one.
const uiRoot = path.resolve(process.env.UI_BUILDER_DIR ?? path.join(editorRoot, '../ui-builder'));
const game = path.resolve(process.argv[2] ?? 'apps/locked');
const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : undefined);
const read = (rel) => readJson(path.join(game, rel));

const releases = {};
const releaseDir = path.join(uiRoot, 'releases');
if (fs.existsSync(releaseDir)) {
	for (const name of fs.readdirSync(releaseDir)) {
		if (name.endsWith('.json')) releases[name.replace(/\.json$/, '')] = readJson(path.join(releaseDir, name));
	}
}

const server = await createServer({
	root: editorRoot,
	configFile: false,
	logLevel: 'error',
	appType: 'custom',
	server: { middlewareMode: true, hmr: false, watch: null },
	optimizeDeps: { noDiscovery: true, include: [] },
});
let code = 0;
try {
	const { runGameCheck } = await server.ssrLoadModule(path.join(editorRoot, 'src/check/game-check.ts'));
	const result = runGameCheck({
		builder: read('src/game/builder.json'),
		catalogue: read('dev/event-catalogue.json'),
		rounds: read('dev/builder_rounds.json'),
		uiHead: readJson(path.join(uiRoot, 'ui.json')) ?? null,
		uiReleases: releases,
		skin: read('ui.skin.json'),
	});
	const errors = result.issues.filter((issue) => issue.level === 'error');
	const warnings = result.issues.filter((issue) => issue.level === 'warning');
	const ok = result.issues.filter((issue) => issue.level === 'ok');
	const landscape = warnings.filter((issue) => issue.code.startsWith('landscape') || String(issue.viewport ?? '').endsWith('_land'));
	console.log(
		`builder check: ${errors.length} errors, ${warnings.length} warnings (${landscape.length} landscape), ${ok.length} ok`,
	);
	for (const issue of [...errors, ...warnings]) console.log(`${issue.level}\t${issue.code}\t${issue.message}`);
	code = errors.length ? 1 : 0;
} catch (error) {
	console.error('builder check crashed:', error);
	code = 2;
} finally {
	await server.close();
}
process.exit(code);
