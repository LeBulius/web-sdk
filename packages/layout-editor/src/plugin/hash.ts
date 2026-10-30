import { createHash } from 'node:crypto';

import {
	BUILDER_SECTIONS,
	canonicalSection,
	type BuilderFile,
	type BuilderSection,
} from '../builder.schema';

export function sectionHash(file: BuilderFile, section: BuilderSection): string {
	return createHash('sha256').update(canonicalSection(file, section)).digest('hex');
}

export function contentHash(content: string): string {
	return createHash('sha256').update(content).digest('hex');
}

export type SectionHashes = Record<BuilderSection, string>;

export function hashSections(file: BuilderFile): SectionHashes {
	const hashes = {} as SectionHashes;
	for (const section of BUILDER_SECTIONS) hashes[section] = sectionHash(file, section);
	return hashes;
}
