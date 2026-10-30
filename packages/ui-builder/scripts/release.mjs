#!/usr/bin/env node
/**
 * Freeze the working ui.json as releases/<version>.json (step C).
 *
 *   pnpm --filter ui-builder release
 *
 * Games pin a released version in builder.json (`ui.pin`) and ship that frozen file, so editing
 * ui.json never moves a shipped game. Refuses to overwrite an existing release with different
 * content: bump `version` in ui.json first. Local only, publishes nothing.
 * Run `pnpm builder:check` afterwards for the full validation (scope rules, guard rails).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'ui.json'), 'utf8');
const ui = JSON.parse(source);

if (ui.kind !== 'shared-ui') fail('ui.json kind must be "shared-ui"');
if (typeof ui.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(ui.version)) fail('ui.json version must be x.y.z');
for (const binding of ui.bindings ?? []) {
	if (!binding || typeof binding.bookEvent !== 'string') fail('ui.json bindings need a bookEvent');
}

const target = join(root, 'releases', `${ui.version}.json`);
if (existsSync(target)) {
	const existing = readFileSync(target, 'utf8');
	if (JSON.stringify(JSON.parse(existing)) === JSON.stringify(ui)) {
		console.log(`ui-builder: ${ui.version} is already released (identical), nothing to do`);
		process.exit(0);
	}
	fail(`releases/${ui.version}.json exists with different content; bump "version" in ui.json first`);
}
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(ui, null, '\t')}\n`);
console.log(`ui-builder: released ${ui.version} -> releases/${ui.version}.json`);

function fail(message) {
	console.error(`ui-builder release: ${message}`);
	process.exit(1);
}
