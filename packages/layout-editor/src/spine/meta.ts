/**
 * Spine 4.2 import checks. pma is read from the atlas text only.
 * A skeleton `premultipliedAlpha` field is dropped and never written to builder.json.
 */

const SPINE_42 = /^4\.2\.\d+/;

export const PHONE_ATLAS_MAX = 2048;

export type SpineUploadMeta = {
	version: string;
	pma: boolean;
	animations: string[];
	skins: string[];
	events: string[];
	slots: string[];
	warnings: string[];
};

export function spineVersionError(version: unknown): string | null {
	if (typeof version !== 'string' || !SPINE_42.test(version)) {
		const shown = typeof version === 'string' && version ? version : 'none';
		return `spine export must be 4.2.x (got ${shown})`;
	}
	return null;
}

export function atlasHasPma(atlasText: string): boolean {
	return atlasText.split(/\r?\n/).some((line) => /^\s*pma\s*:\s*true\s*$/i.test(line));
}

export function atlasPageSizes(atlasText: string): { name: string; w: number; h: number }[] {
	const lines = atlasText.split(/\r?\n/);
	const pages: { name: string; w: number; h: number }[] = [];
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? '';
		if (!line || line.startsWith(' ') || line.startsWith('\t')) continue;
		const size = (lines[index + 1] ?? '').match(/^size:\s*(\d+)\s*,\s*(\d+)/);
		if (!size) continue;
		pages.push({ name: line.trim(), w: Number(size[1]), h: Number(size[2]) });
	}
	return pages;
}

export function atlasPageWarnings(atlasText: string): string[] {
	const warnings: string[] = [];
	for (const page of atlasPageSizes(atlasText)) {
		if (page.w > PHONE_ATLAS_MAX || page.h > PHONE_ATLAS_MAX) {
			warnings.push(
				`${page.name} is ${page.w}×${page.h}; phone atlas pages must be ${PHONE_ATLAS_MAX} or smaller`,
			);
		}
	}
	return warnings;
}

/** Drop the per-skeleton field. The atlas `pma` flag is the only source. */
export function stripPremultipliedAlpha(json: unknown): unknown {
	const clone = JSON.parse(JSON.stringify(json)) as Record<string, unknown> | null;
	if (!clone || typeof clone !== 'object') return json;
	delete clone.premultipliedAlpha;
	const skeleton = clone.skeleton;
	if (skeleton && typeof skeleton === 'object') {
		delete (skeleton as Record<string, unknown>).premultipliedAlpha;
	}
	return clone;
}

function namesOf(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value
			.map((entry) => {
				if (typeof entry === 'string') return entry;
				if (entry && typeof entry === 'object' && typeof (entry as { name?: unknown }).name === 'string') {
					return (entry as { name: string }).name;
				}
				return '';
			})
			.filter((name) => name.length > 0);
	}
	if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>);
	return [];
}

export function describeSpine(json: unknown, atlasText: string): SpineUploadMeta {
	if (!json || typeof json !== 'object') throw new Error('skeleton json is not an object');
	const doc = json as Record<string, unknown>;
	const skeleton = doc.skeleton;
	const version = skeleton && typeof skeleton === 'object' ? (skeleton as { spine?: unknown }).spine : undefined;
	const problem = spineVersionError(version);
	if (problem) throw new Error(problem);
	return {
		version: version as string,
		pma: atlasHasPma(atlasText),
		animations: namesOf(doc.animations),
		skins: namesOf(doc.skins),
		events: namesOf(doc.events),
		slots: namesOf(doc.slots),
		warnings: atlasPageWarnings(atlasText),
	};
}

/** Version-check, drop premultipliedAlpha, and read pma from the atlas. */
export function prepareSpineUpload(skeletonText: string, atlasText: string): { skeletonText: string; meta: SpineUploadMeta } {
	let parsed: unknown;
	try {
		parsed = JSON.parse(skeletonText) as unknown;
	} catch {
		throw new Error('skeleton json is not valid JSON');
	}
	const stripped = stripPremultipliedAlpha(parsed);
	const meta = describeSpine(stripped, atlasText);
	return { skeletonText: JSON.stringify(stripped), meta };
}
