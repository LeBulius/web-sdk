/**
 * Spine atlas + TexturePacker spritesheet rewrites (M3).
 * Page lines become .webp, including names with spaces. The pma flag is left as exported.
 */
import { prepareSpineUpload, type SpineUploadMeta } from '../spine/meta';

export type UploadedFile = {
	filename: string;
	data: Buffer;
};

const IMAGE_EXT = /\.(png|jpe?g)$/i;

export function toWebpName(filename: string): string {
	return filename.replace(IMAGE_EXT, '.webp');
}

/** A page header is a non-indented line immediately followed by `size:`. */
export function atlasPageNames(atlasText: string): string[] {
	const lines = atlasText.split(/\r?\n/);
	const pages: string[] = [];
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? '';
		if (!line || line.startsWith(' ') || line.startsWith('\t')) continue;
		const next = lines[index + 1] ?? '';
		if (next.startsWith('size:')) pages.push(line.trim());
	}
	return pages;
}

export function rewriteAtlas(atlasText: string): string {
	const lines = atlasText.split(/\r?\n/);
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? '';
		if (!line || line.startsWith(' ') || line.startsWith('\t')) continue;
		const next = lines[index + 1] ?? '';
		if (next.startsWith('size:')) lines[index] = toWebpName(line);
	}
	// Acceptance: grep '\.png' on the written atlas finds nothing.
	return lines.join('\n').replace(/\.png/g, '.webp');
}

export function isSpritesheet(json: unknown): json is { frames: unknown; meta: { image?: string } } {
	if (typeof json !== 'object' || json === null) return false;
	const record = json as { frames?: unknown; meta?: { image?: unknown } };
	return record.frames !== undefined && typeof record.meta?.image === 'string';
}

export function rewriteSpritesheet(json: { meta: { image?: string } }): void {
	if (typeof json.meta.image === 'string') json.meta.image = toWebpName(json.meta.image);
}

export function isSpineSkeleton(json: unknown): boolean {
	if (typeof json !== 'object' || json === null) return false;
	const record = json as { skeleton?: unknown; bones?: unknown };
	return record.skeleton !== undefined || Array.isArray(record.bones);
}

export type AtlasPlan = {
	kind: 'atlas';
	atlasName: string;
	atlasText: string;
	pages: { name: string; data: Buffer }[];
	skeletonName: string;
	skeletonText: string;
	spine?: SpineUploadMeta;
};

export type SheetPlan = {
	kind: 'sheet';
	jsonName: string;
	jsonText: string;
	imageName: string;
	image: Buffer;
};

export type ImagePlan = {
	kind: 'image';
	filename: string;
	data: Buffer;
};

export type AudioPlan = {
	kind: 'audio';
	filename: string;
	data: Buffer;
	/** wav stays in assets-src. m4a/ogg may also be copied to the output root. */
	ship: boolean;
};

export type UploadPlan = AtlasPlan | SheetPlan | ImagePlan | AudioPlan;

const AUDIO_ORIGINAL = new Set(['.wav', '.aiff', '.aif', '.flac', '.mp3']);
const AUDIO_SHIP = new Set(['.m4a', '.ogg']);

function extOf(name: string): string {
	const dot = name.lastIndexOf('.');
	return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

function byName(files: UploadedFile[], name: string): UploadedFile | undefined {
	const target = name.toLowerCase();
	return files.find((file) => file.filename.toLowerCase() === target);
}

export function planUpload(files: UploadedFile[], section: 'art' | 'spine' | 'audio'): UploadPlan {
	if (files.length === 0) throw new Error('no files');

	if (section === 'audio') {
		if (files.length !== 1) throw new Error('audio upload expects one file');
		const file = files[0]!;
		const ext = extOf(file.filename);
		if (AUDIO_ORIGINAL.has(ext)) {
			return { kind: 'audio', filename: file.filename, data: file.data, ship: false };
		}
		if (AUDIO_SHIP.has(ext)) {
			return { kind: 'audio', filename: file.filename, data: file.data, ship: true };
		}
		throw new Error(`unsupported audio type "${ext || file.filename}"`);
	}

	const atlas = files.find((file) => extOf(file.filename) === '.atlas');
	if (atlas) {
		const text = atlas.data.toString('utf8');
		const pages = atlasPageNames(text);
		if (pages.length === 0) throw new Error('atlas has no page lines');
		const missing: string[] = [];
		const pageFiles: { name: string; data: Buffer }[] = [];
		for (const page of pages) {
			const found = byName(files, page);
			if (!found) missing.push(page);
			else pageFiles.push({ name: page, data: found.data });
		}
		if (missing.length) {
			throw new Error(`atlas is missing page(s): ${missing.join(', ')}`);
		}
		const skeleton = files.find(
			(file) => extOf(file.filename) === '.json' && isSpineSkeleton(parseJson(file.data)),
		);
		if (!skeleton) throw new Error('atlas set is missing the skeleton .json');
		let skeletonText = skeleton.data.toString('utf8');
		let spine: SpineUploadMeta | undefined;
		if (section === 'spine') {
			const prepared = prepareSpineUpload(skeletonText, text);
			skeletonText = prepared.skeletonText;
			spine = prepared.meta;
		}
		return {
			kind: 'atlas',
			atlasName: atlas.filename,
			atlasText: rewriteAtlas(text),
			pages: pageFiles,
			skeletonName: skeleton.filename,
			skeletonText,
			spine,
		};
	}

	const jsonFile = files.find((file) => extOf(file.filename) === '.json');
	if (jsonFile) {
		const parsed = parseJson(jsonFile.data);
		if (isSpritesheet(parsed)) {
			const imageName = parsed.meta.image ?? '';
			const image = byName(files, imageName);
			if (!image) throw new Error(`spritesheet is missing "${imageName}"`);
			rewriteSpritesheet(parsed);
			return {
				kind: 'sheet',
				jsonName: jsonFile.filename,
				jsonText: JSON.stringify(parsed, null, 2) + '\n',
				imageName,
				image: image.data,
			};
		}
	}

	const images = files.filter((file) => IMAGE_EXT.test(file.filename) || extOf(file.filename) === '.webp');
	if (images.length === 1 && files.length === 1) {
		return { kind: 'image', filename: images[0]!.filename, data: images[0]!.data };
	}

	throw new Error('unsupported upload. Expected an image, an atlas set, a spritesheet, or audio');
}

function parseJson(data: Buffer): unknown {
	try {
		return JSON.parse(data.toString('utf8')) as unknown;
	} catch {
		return null;
	}
}
