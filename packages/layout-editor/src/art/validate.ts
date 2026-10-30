/**
 * Art drop checks. Errors block the upload. Warnings do not.
 * Slot ids come from the game's art-slots.json, not from this file.
 */
export const PHONE_GPU_BUDGET = 256 * 1024 * 1024;

export type ArtSlotDef = {
	id: string;
	group: 'symbol' | 'board' | 'background' | 'screen' | 'ui';
	/** Fire-rim filmstrips may use numbered stems. Everything else rejects `_0000_`. */
	numbered?: boolean;
	/** press-to-continue text needs one frame per locale. */
	locales?: boolean;
	/** Paired portrait file. A missing pair is a warning. */
	mobile?: string;
	static?: boolean;
};

export type ArtCatalogue = {
	phoneBudgetBytes?: number;
	knownSampleHashes?: string[];
	locales?: string[];
	slots: ArtSlotDef[];
};

export type ArtIssue = { level: 'error' | 'warning'; message: string };

const NUMBERED = /_0000_/;

export function findSlot(catalogue: ArtCatalogue | null | undefined, id: string): ArtSlotDef | undefined {
	return catalogue?.slots.find((slot) => slot.id === id);
}

export function frameKeyError(frameKey: string, filename: string, numbered: boolean): string | null {
	const stem = filename.replace(/\.[^.]+$/, '');
	if (NUMBERED.test(frameKey) && !numbered) {
		return `frame "${frameKey}" uses a numbered stem; this slot does not allow _0000_`;
	}
	if (frameKey !== stem && frameKey !== filename) {
		return `frame key "${frameKey}" must equal the file stem "${stem}"`;
	}
	return null;
}

type SheetFrame = { rotated?: boolean; filename?: string };

export function spritesheetIssues(
	sheet: { frames?: Record<string, SheetFrame> },
	slot: ArtSlotDef | undefined,
): ArtIssue[] {
	const issues: ArtIssue[] = [];
	const frames = sheet.frames ?? {};
	for (const [key, frame] of Object.entries(frames)) {
		if (frame?.rotated) {
			issues.push({
				level: 'error',
				message: `TexturePacker frame "${key}" is rotated. Turn rotation off and export again.`,
			});
		}
		if (slot) {
			const filename = frame?.filename ?? `${key}.png`;
			const problem = frameKeyError(key, filename, slot.numbered === true);
			if (problem) issues.push({ level: 'error', message: problem });
		}
	}
	return issues;
}

export function localeIssues(filenames: string[], locales: string[]): ArtIssue[] {
	const stems = new Set(filenames.map((name) => name.replace(/\.[^.]+$/, '').toLowerCase()));
	const missing = locales.filter((locale) => !stems.has(locale.toLowerCase()));
	if (missing.length === 0) return [];
	return [{ level: 'error', message: `missing locale frame(s): ${missing.join(', ')}` }];
}

export function sampleHashIssue(hash: string, known: string[] | undefined): ArtIssue | null {
	if (!known || known.length === 0) return null;
	if (!known.includes(hash)) return null;
	return { level: 'error', message: `file matches a known web-sdk sample asset (${hash.slice(0, 12)})` };
}

export function imageWarnings(info: {
	width: number;
	height: number;
	hasAlpha: boolean;
	opaque: boolean;
	edgeOpaque: boolean;
}): ArtIssue[] {
	const issues: ArtIssue[] = [];
	if (info.width > 4096 || info.height > 4096) {
		issues.push({ level: 'warning', message: `texture ${info.width}×${info.height} is above 4096` });
	}
	if (info.hasAlpha && info.opaque) {
		issues.push({ level: 'warning', message: 'transparent PNG has an alpha channel but every pixel is opaque' });
	}
	if (info.hasAlpha && !info.opaque && info.edgeOpaque) {
		issues.push({ level: 'warning', message: 'transparent PNG has a hard opaque fringe' });
	}
	return issues;
}

export function gpuBytes(images: { w: number; h: number }[]): number {
	return images.reduce((sum, image) => sum + Math.max(0, image.w) * Math.max(0, image.h) * 4, 0);
}

export function memoryWarning(bytes: number, budget = PHONE_GPU_BUDGET): ArtIssue | null {
	if (bytes <= budget) return null;
	const mb = (bytes / (1024 * 1024)).toFixed(1);
	const cap = (budget / (1024 * 1024)).toFixed(0);
	return { level: 'warning', message: `GPU memory ${mb} MB is above the phone budget (${cap} MB)` };
}

export function missingMobileWarnings(
	catalogue: ArtCatalogue,
	present: Set<string>,
): ArtIssue[] {
	const issues: ArtIssue[] = [];
	for (const slot of catalogue.slots) {
		if (!slot.mobile) continue;
		if (present.has(slot.id) && !present.has(slot.mobile)) {
			issues.push({ level: 'warning', message: `${slot.id} is missing its mobile variant ${slot.mobile}` });
		}
	}
	return issues;
}

/** Lock-to-cell inset. Default 2px so a fire rim stays inside the cell outline. */
export function rimRect(
	cell: { x: number; y: number; w: number; h: number },
	lockToCell = 2,
): { x: number; y: number; w: number; h: number } {
	const inset = Math.max(0, lockToCell);
	return {
		x: cell.x + inset,
		y: cell.y + inset,
		w: Math.max(0, cell.w - inset * 2),
		h: Math.max(0, cell.h - inset * 2),
	};
}

export function artUploadIssues(
	key: string,
	files: { filename: string; data: Buffer }[],
	catalogue: ArtCatalogue | null,
	hash?: (data: Buffer) => string,
): ArtIssue[] {
	const issues: ArtIssue[] = [];
	const slot = findSlot(catalogue, key);
	for (const file of files) {
		const sample = hash ? sampleHashIssue(hash(file.data), catalogue?.knownSampleHashes) : null;
		if (sample) issues.push(sample);
		if (!file.filename.toLowerCase().endsWith('.json')) continue;
		try {
			const parsed = JSON.parse(file.data.toString('utf8')) as { frames?: Record<string, SheetFrame> };
			if (parsed.frames) issues.push(...spritesheetIssues(parsed, slot));
		} catch {
			// not a spritesheet
		}
	}
	if (slot?.locales) {
		issues.push(...localeIssues(files.map((file) => file.filename), catalogue?.locales ?? []));
	}
	if (slot && !slot.numbered) {
		for (const file of files) {
			if (NUMBERED.test(file.filename)) {
				issues.push({
					level: 'error',
					message: `"${file.filename}" uses a numbered stem; ${slot.id} does not allow _0000_`,
				});
			}
		}
	}
	return issues;
}
