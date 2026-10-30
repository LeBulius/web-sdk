import fs from 'node:fs/promises';
import path from 'node:path';

import { collectAssetPaths } from './manifest';

export type PruneResult = {
	removed: string[];
	kept: string[];
};

const KEEP_NAMES = new Set(['manifest.ts']);

async function walk(dir: string): Promise<string[]> {
	const found: string[] = [];
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return found;
		throw error;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) found.push(...(await walk(full)));
		else if (entry.isFile()) found.push(full);
	}
	return found;
}

/**
 * Delete files under src/assets/builder that builder.json does not reference.
 * manifest.ts is the generated import table, not an output, so it stays.
 */
export async function pruneBuilderOutputs(options: {
	outputRoot: string;
	builder: unknown;
}): Promise<PruneResult> {
	const referenced = collectAssetPaths(options.builder);
	const files = await walk(options.outputRoot);
	const removed: string[] = [];
	const kept: string[] = [];
	for (const file of files) {
		const rel = path.relative(options.outputRoot, file).split(path.sep).join('/');
		if (KEEP_NAMES.has(rel) || referenced.has(rel)) {
			kept.push(rel);
			continue;
		}
		await fs.rm(file, { force: true });
		removed.push(rel);
	}
	return { removed, kept };
}
