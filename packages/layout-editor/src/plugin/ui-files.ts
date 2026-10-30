/**
 * Shared UI layer files (packages/ui-builder): the working ui.json and the frozen releases.
 * Node-only (dev plugin + build-time virtual module).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { pinnedUi, validateUiFile, type CatalogueLike, type UiFile } from '../../../ui-builder/src/ui.schema';
import { atomicWrite } from './atomic-write';
import type { EchoTracker } from './echo';
import { contentHash } from './hash';

export const UI_HMR_EVENT = 'layout-editor:ui';

export type UiPayload = {
	pin: string | null;
	/** What the game ships: releases/<pin>.json (or ui.json while that version is unreleased). */
	pinned: UiFile | null;
	/** Working ui.json. Dev only; null in production builds. */
	head: UiFile | null;
	headHash: string;
	releases: string[];
};

export const serializeUi = (ui: unknown) => JSON.stringify(ui, null, '\t') + '\n';

async function readJson(file: string): Promise<unknown | null> {
	try {
		return JSON.parse(await fs.readFile(file, 'utf8'));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw error;
	}
}

export async function readUiReleases(uiDir: string): Promise<Record<string, UiFile>> {
	const out: Record<string, UiFile> = {};
	let names: string[] = [];
	try {
		names = await fs.readdir(path.join(uiDir, 'releases'));
	} catch {
		return out;
	}
	for (const name of names.sort()) {
		if (!name.endsWith('.json')) continue;
		const data = await readJson(path.join(uiDir, 'releases', name));
		if (data) out[name.replace(/\.json$/, '')] = data as UiFile;
	}
	return out;
}

export async function readUiPayload(uiDir: string, pin: string | undefined, dev: boolean): Promise<UiPayload> {
	const raw = await fs.readFile(path.join(uiDir, 'ui.json'), 'utf8').catch(() => '');
	const head = raw ? (JSON.parse(raw) as UiFile) : null;
	const releases = await readUiReleases(uiDir);
	return {
		pin: pin ?? null,
		pinned: pinnedUi(head, releases, pin),
		head: dev ? head : null,
		headHash: dev && raw ? contentHash(raw) : '',
		releases: Object.keys(releases),
	};
}

/** POST /__ui body handler. Caller is inside the write queue. */
export async function saveUi(options: {
	uiDir: string;
	data: unknown;
	baseHash: unknown;
	catalogue: CatalogueLike;
	echo: EchoTracker;
}): Promise<{ status: number; body: unknown }> {
	const file = path.join(options.uiDir, 'ui.json');
	const raw = await fs.readFile(file, 'utf8').catch(() => '');
	if (typeof options.baseHash !== 'string' || options.baseHash !== contentHash(raw)) {
		return { status: 409, body: { error: 'stale ui.json; reloaded', hash: contentHash(raw) } };
	}
	const issues = validateUiFile(options.data, { catalogue: options.catalogue });
	const errors = issues.filter((issue) => issue.level === 'error');
	const warnings = issues.filter((issue) => issue.level === 'warning');
	if (errors.length) {
		return { status: 400, body: { error: errors.map((issue) => issue.message).join('\n'), errors } };
	}
	const next = options.data as UiFile;
	const releases = await readUiReleases(options.uiDir);
	const released = releases[next.version];
	if (released && JSON.stringify(released) !== JSON.stringify(next)) {
		return {
			status: 409,
			body: { error: `version ${next.version} is already released; bump the version before saving`, code: 'released' },
		};
	}
	const content = serializeUi(next);
	options.echo.record(content);
	await atomicWrite(file, content);
	// Warnings (e.g. a generic event bound on a game-data field) do not block the save.
	return { status: 200, body: { ok: true, headHash: contentHash(content), warnings } };
}
