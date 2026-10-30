import fs from 'node:fs/promises';

import {
	BUILDER_SECTIONS,
	emptyBuilderFile,
	serializeBuilderFile,
	validateBuilderFile,
	type BuilderFile,
	type BuilderSection,
} from '../builder.schema';
import { atomicWrite } from './atomic-write';
import type { EchoTracker } from './echo';
import { hashSections, sectionHash } from './hash';

export async function readBuilder(filePath: string): Promise<BuilderFile> {
	try {
		return JSON.parse(await fs.readFile(filePath, 'utf8')) as BuilderFile;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyBuilderFile();
		throw error;
	}
}

export function isBuilderSection(section: string): section is BuilderSection {
	return (BUILDER_SECTIONS as readonly string[]).includes(section);
}

/**
 * Replace one section. Caller must already be inside the write queue.
 * Other sections are rewritten with the same canonical serializer, so their
 * canonical JSON stays byte-identical.
 */
export async function saveSection(options: {
	builderPath: string;
	section: string;
	data: unknown;
	baseHash: unknown;
	echo: EchoTracker;
}): Promise<{ status: number; body: unknown }> {
	if (!isBuilderSection(options.section)) {
		return { status: 400, body: { error: `unknown section "${options.section}"` } };
	}
	if (typeof options.baseHash !== 'string' || options.baseHash.length === 0) {
		return { status: 400, body: { error: 'baseHash is required' } };
	}
	const current = await readBuilder(options.builderPath);
	const currentHash = sectionHash(current, options.section);
	if (currentHash !== options.baseHash) {
		return {
			status: 409,
			body: { error: 'stale section', section: options.section, hash: currentHash },
		};
	}
	const next: BuilderFile = { ...current, [options.section]: options.data };
	const errors = validateBuilderFile(next);
	if (errors.length) return { status: 400, body: { error: errors.join('\n'), errors } };
	const content = serializeBuilderFile(next);
	options.echo.record(content);
	await atomicWrite(options.builderPath, content);
	const saved = JSON.parse(content) as BuilderFile;
	return { status: 200, body: { ok: true, hashes: hashSections(saved) } };
}
