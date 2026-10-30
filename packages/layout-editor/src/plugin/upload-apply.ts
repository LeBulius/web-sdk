import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { BuilderFile } from '../builder.schema';
import { serializeBuilderFile } from '../builder.schema';
import { atomicWrite } from './atomic-write';
import { planUpload, toWebpName, type UploadedFile, type UploadPlan } from './atlas';
import type { EchoTracker } from './echo';
import { collectAssetPaths, renderManifest } from './manifest';
import { insideRoot } from './paths';
import { artUploadIssues, type ArtCatalogue } from '../art/validate';
import { convertToWebp, type SharpFactory, type WebpResult } from './webp';

export type UploadApplyResult = {
	status: number;
	body: Record<string, unknown>;
};

type PreparedFile = { filename: string; data: Buffer | string; output: boolean };

export async function expandZips(files: UploadedFile[]): Promise<UploadedFile[]> {
	const expanded: UploadedFile[] = [];
	for (const file of files) {
		if (!file.filename.toLowerCase().endsWith('.zip')) {
			expanded.push(file);
			continue;
		}
		const { unzipSync } = await import('fflate');
		const entries = unzipSync(new Uint8Array(file.data));
		for (const [name, data] of Object.entries(entries)) {
			if (name.endsWith('/')) continue;
			const base = path.posix.basename(name);
			if (!base || base.startsWith('.')) continue;
			expanded.push({ filename: base, data: Buffer.from(data) });
		}
	}
	return expanded;
}

export function isUploadSection(section: string): section is 'art' | 'spine' | 'audio' {
	return section === 'art' || section === 'spine' || section === 'audio';
}

/**
 * Convert first, then write. A rejected set (missing atlas page, bad type, sharp
 * missing) leaves the disk untouched.
 */
export async function applyUpload(options: {
	root: string;
	section: 'art' | 'spine' | 'audio';
	key: string;
	files: UploadedFile[];
	sharp: SharpFactory | null;
	sharpError?: string;
	builder: BuilderFile;
	builderPath: string;
	echo: EchoTracker;
}): Promise<UploadApplyResult> {
	const outputRoot = path.join(options.root, 'src', 'assets', 'builder');
	const originalsRoot = path.join(options.root, 'assets-src');
	const outDir = path.join(outputRoot, options.section, options.key);
	const originalDir = path.join(originalsRoot, options.section, options.key);
	if (!insideRoot(options.root, outDir) || !insideRoot(options.root, originalDir)) {
		return { status: 400, body: { error: 'refusing to write outside the game' } };
	}

	let files: UploadedFile[];
	try {
		files = await expandZips(options.files);
	} catch (error) {
		return { status: 400, body: { error: error instanceof Error ? error.message : String(error) } };
	}

	let artWarnings: string[] = [];
	if (options.section === 'art') {
		let catalogue: ArtCatalogue | null = null;
		try {
			const raw = await fs.readFile(path.join(path.dirname(options.builderPath), 'art-slots.json'), 'utf8');
			catalogue = JSON.parse(raw) as ArtCatalogue;
		} catch {
			catalogue = null;
		}
		const issues = artUploadIssues(options.key, files, catalogue, (data) =>
			createHash('sha256').update(data).digest('hex'),
		);
		const errors = issues.filter((issue) => issue.level === 'error');
		if (errors.length) return { status: 400, body: { error: errors.map((issue) => issue.message).join('\n') } };
		artWarnings = issues.filter((issue) => issue.level === 'warning').map((issue) => issue.message);
	}

	let plan: UploadPlan;
	try {
		plan = planUpload(files, options.section);
	} catch (error) {
		return { status: 400, body: { error: error instanceof Error ? error.message : String(error) } };
	}

	if (plan.kind !== 'audio' && !options.sharp) {
		return {
			status: 500,
			body: { error: options.sharpError ?? 'sharp missing: image conversion is unavailable' },
		};
	}

	let prepared: PreparedFile[];
	let slot: Record<string, unknown> | null;
	let bytesBefore: number;
	let bytesAfter: number;
	let warnings: string[];
	let lossless: boolean[];
	try {
		const built = await prepare(plan, files, options.sharp);
		prepared = built.files;
		slot = built.slot;
		bytesBefore = built.bytesBefore;
		bytesAfter = built.bytesAfter;
		warnings = built.warnings;
		lossless = built.lossless;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.startsWith('sharp missing')) return { status: 500, body: { error: message } };
		return { status: 400, body: { error: message } };
	}

	await archiveOriginals(originalDir);
	await clearOutputFiles(outDir);
	await fs.mkdir(originalDir, { recursive: true });
	await fs.mkdir(outDir, { recursive: true });

	const paths: string[] = [];
	for (const file of prepared) {
		const target = file.output ? path.join(outDir, file.filename) : path.join(originalDir, file.filename);
		if (!insideRoot(options.root, target)) {
			return { status: 400, body: { error: 'refusing to write outside the game' } };
		}
		await fs.writeFile(target, file.data);
		if (file.output) {
			options.echo.recordAsset(target);
			paths.push(path.posix.join(options.section, options.key, file.filename));
		}
	}

	const sectionObject = options.builder[options.section] as Record<string, unknown>;
	if (slot) sectionObject[options.key] = prefixSlot(options.section, options.key, slot);
	else delete sectionObject[options.key];

	const manifestPath = path.join(outputRoot, 'manifest.ts');
	const manifest = renderManifest([...collectAssetPaths(options.builder)]);
	await fs.writeFile(manifestPath, manifest);
	options.echo.recordAsset(manifestPath);

	const content = serializeBuilderFile(options.builder);
	options.echo.record(content);
	await atomicWrite(options.builderPath, content);

	return {
		status: 200,
		body: {
			ok: true,
			section: options.section,
			key: options.key,
			paths,
			bytesBefore,
			bytesAfter,
			warning: [...artWarnings, ...warnings].length ? [...artWarnings, ...warnings].join('; ') : undefined,
			lossless,
			originals: path.posix.join('assets-src', options.section, options.key),
		},
	};
}

async function prepare(
	plan: UploadPlan,
	files: UploadedFile[],
	sharp: SharpFactory | null,
): Promise<{
	files: PreparedFile[];
	slot: Record<string, unknown> | null;
	bytesBefore: number;
	bytesAfter: number;
	warnings: string[];
	lossless: boolean[];
}> {
	const out: PreparedFile[] = [];
	const warnings: string[] = [];
	const lossless: boolean[] = [];
	let bytesBefore = 0;
	let bytesAfter = 0;

	const original = (filename: string, data: Buffer | string) => {
		out.push({ filename, data, output: false });
	};
	const output = (filename: string, data: Buffer | string) => {
		out.push({ filename, data, output: true });
	};
	const asLosslessPage = async (filename: string, data: Buffer) => {
		if (!sharp) throw new Error('sharp missing');
		const converted = await convertToWebp(sharp, data, 'lossless');
		note(converted, filename);
		original(filename, data);
		output(toWebpName(filename), converted.data);
		return converted;
	};
	const note = (converted: WebpResult, filename: string) => {
		bytesBefore += converted.bytesBefore;
		bytesAfter += converted.bytesAfter;
		lossless.push(converted.lossless);
		if (converted.warning) warnings.push(`${filename}: ${converted.warning}`);
	};

	if (plan.kind === 'image') {
		if (!sharp) throw new Error('sharp missing');
		const converted = await convertToWebp(sharp, plan.data, 'auto');
		note(converted, plan.filename);
		original(plan.filename, plan.data);
		const webpName = toWebpName(plan.filename);
		output(webpName, converted.data);
		return {
			files: out,
			slot: { src: placeholder(webpName) },
			bytesBefore,
			bytesAfter,
			warnings,
			lossless,
		};
	}

	if (plan.kind === 'atlas') {
		for (const page of plan.pages) await asLosslessPage(page.name, page.data);
		const atlasFile = files.find((file) => file.filename === plan.atlasName);
		const skeletonFile = files.find((file) => file.filename === plan.skeletonName);
		if (atlasFile) original(plan.atlasName, atlasFile.data);
		if (skeletonFile) original(plan.skeletonName, skeletonFile.data);
		output(plan.atlasName, plan.atlasText);
		output(plan.skeletonName, plan.skeletonText);
		if (plan.spine) warnings.push(...plan.spine.warnings);
		return {
			files: out,
			slot: {
				atlas: placeholder(plan.atlasName),
				skeleton: placeholder(plan.skeletonName),
				pages: plan.pages.map((page) => placeholder(toWebpName(page.name))),
				...(plan.spine
					? {
							version: plan.spine.version,
							pma: plan.spine.pma,
							animations: plan.spine.animations,
							skins: plan.spine.skins,
							events: plan.spine.events,
						}
					: {}),
			},
			bytesBefore,
			bytesAfter,
			warnings,
			lossless,
		};
	}

	if (plan.kind === 'sheet') {
		await asLosslessPage(plan.imageName, plan.image);
		const jsonFile = files.find((file) => file.filename === plan.jsonName);
		if (jsonFile) original(plan.jsonName, jsonFile.data);
		output(plan.jsonName, plan.jsonText);
		return {
			files: out,
			slot: {
				src: placeholder(plan.jsonName),
				image: placeholder(toWebpName(plan.imageName)),
			},
			bytesBefore,
			bytesAfter,
			warnings,
			lossless,
		};
	}

	original(plan.filename, plan.data);
	if (plan.ship) output(plan.filename, plan.data);
	return {
		files: out,
		slot: plan.ship ? { src: placeholder(plan.filename) } : null,
		bytesBefore: plan.data.length,
		bytesAfter: plan.ship ? plan.data.length : 0,
		warnings,
		lossless,
	};
}

/** Slot paths are filled with the real prefix after we know section/key. */
function placeholder(filename: string): string {
	return filename;
}

const PATH_KEYS = new Set(['src', 'atlas', 'skeleton', 'image', 'pages']);

function prefixSlot(section: string, key: string, slot: Record<string, unknown>): Record<string, unknown> {
	const map = (value: unknown): unknown => {
		if (typeof value === 'string') return path.posix.join(section, key, value);
		if (Array.isArray(value)) return value.map(map);
		return value;
	};
	return Object.fromEntries(
		Object.entries(slot).map(([name, value]) => [name, PATH_KEYS.has(name) ? map(value) : value]),
	);
}

async function archiveOriginals(dir: string): Promise<void> {
	let entries: string[] = [];
	try {
		entries = await fs.readdir(dir);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
		throw error;
	}
	const names = entries.filter((name) => name !== 'history');
	if (names.length === 0) return;
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	const dest = path.join(dir, 'history', stamp);
	await fs.mkdir(dest, { recursive: true });
	for (const name of names) {
		await fs.rename(path.join(dir, name), path.join(dest, name));
	}
}

async function clearOutputFiles(dir: string): Promise<void> {
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
		throw error;
	}
	for (const entry of entries) {
		if (entry.isFile()) await fs.rm(path.join(dir, entry.name), { force: true });
	}
}
