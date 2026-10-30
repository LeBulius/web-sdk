/// <reference path="./virtual-modules.d.ts" />
/**
 * Reactive builder data. Ships to production so the game can read overrides.
 * Save and HMR are dev-only: import.meta.hot is dropped from production builds,
 * and saveLayout is only referenced from the dev overlay.
 */
import initialData, { hashes as initialHashes, ui as initialUi } from 'virtual:layout-editor/data';
import { MediaQuery } from 'svelte/reactivity';

import {
	VIEWPORT_KEYS,
	normalizeBuilderFile,
	resolveActiveViewport,
	resolveTunable,
	resolveViewportItem,
	sortBuilderFile,
	validateBuilderFile,
	type BuilderFile,
	type BuilderSection,
	type FrameLayout,
	type Insets,
	type PointerKind,
	type ViewportKey,
} from './builder.schema';
import { BOARD_FRAME_LAYOUT } from './layout/migrate';
import { formulaFor, layoutFindings, resolveBand, resolveSafeArea } from './layout/guards';
import { readEnvSafeArea } from './layout/safe-area';
import { type UiFile, type UiPayload, type UiPopup } from '../../ui-builder/src/ui.schema';
import {
	clearBandOverride,
	clearGrid,
	clearItems,
	clearTunableValue,
	clearUiOverride,
	copyViewportItems,
	keysForScope,
	patchGrid,
	patchNodeItems,
	setBandOverride,
	setTunableValue,
	setUiOverride,
	updateLayers,
	type GridPatch,
	type WriteScope,
} from './mutate';
import type { LayerConfig } from './builder.schema';
import type { NodePropKey, NodeProps } from './layout.schema';
import { layoutRegistry } from './registry';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type UiState = UiPayload;

export const layoutStore = $state({
	data: normalizeBuilderFile(clone(initialData) as BuilderFile),
	hashes: { ...initialHashes } as Record<BuilderSection, string>,
	dirty: false,
	saving: false,
	lastSavedAt: 0,
	lastError: '',
	/** Dev size-picker. Null follows the window. */
	viewportOverride: null as ViewportKey | null,
	writeScope: 'key' as WriteScope,
	/** Locale used by Lingui-ready text items. Stub catalog, not a full Lingui runtime. */
	locale: 'en',
	overlays: { safe: true, band: true, grid: false },
	/** Mood key while a book preview is playing. Null uses the base background. */
	previewMood: null as string | null,
	/** Shared UI layer (packages/ui-builder). `head` is the working ui.json (dev only). */
	ui: clone(initialUi as UiState) as UiState,
	uiDirty: false,
	uiSaving: false,
	uiError: '',
	/** Validator warnings from the last UI save (they never block it). */
	uiWarnings: [] as string[],
	/** Dev: overlay/guards follow the working ui.json instead of the pinned release. */
	uiPreviewHead: true,
});

let savedSnapshot = JSON.stringify(layoutStore.data);
let savedUiSnapshot = JSON.stringify(initialUi.head);

function touch(id: string, patch: NodeProps) {
	layoutRegistry.markTouched(id, Object.keys(patch) as NodePropKey[]);
	layoutStore.dirty = true;
}

function markDirty() {
	layoutStore.dirty = JSON.stringify(layoutStore.data) !== savedSnapshot;
}

// ---------------------------------------------------------------------------------------------
// Active viewport. bindViewport() replaces the starter's bindLayoutType().
// ---------------------------------------------------------------------------------------------

let sizeSource: () => { width: number; height: number } = () => ({
	width: typeof window === 'undefined' ? 1200 : window.innerWidth,
	height: typeof window === 'undefined' ? 675 : window.innerHeight,
});
let viewportBound = false;

export function bindViewport(source?: () => { width: number; height: number }) {
	viewportBound = true;
	if (source) sizeSource = source;
}

export function isViewportBound() {
	return viewportBound;
}

// Step C orientation rule needs the pointer type: w > h with a coarse pointer = mobile landscape.
const coarsePointer = typeof window === 'undefined' ? null : new MediaQuery('(pointer: coarse)', false);

export function pointerKind(): PointerKind {
	return coarsePointer?.current ? 'coarse' : 'fine';
}

export function activeViewport(): ViewportKey {
	const override = layoutStore.viewportOverride;
	if (override) return override;
	const size = sizeSource();
	return resolveActiveViewport(size.width, size.height, null, pointerKind());
}

// ---------------------------------------------------------------------------------------------
// Shared UI layer (step C)
// ---------------------------------------------------------------------------------------------

/** ui.json the editor shows: the working copy while previewing it (dev), else the pinned release. */
export function activeUi(): UiFile | null {
	const state = layoutStore.ui;
	if (layoutStore.uiPreviewHead && state.head) return state.head;
	return state.pinned;
}

export function setUiPreviewHead(on: boolean) {
	layoutStore.uiPreviewHead = on;
}

function markUiDirty() {
	layoutStore.uiDirty = JSON.stringify(layoutStore.ui.head) !== savedUiSnapshot;
}

function headOrThrow(): UiFile {
	const head = layoutStore.ui.head;
	if (!head) throw new Error('working ui.json is not loaded (dev only)');
	return head;
}

/** Shared band in ui.json (affects every game). The Layout panel writes a game override instead. */
export function setSharedBand(key: ViewportKey, value: number) {
	headOrThrow().guardRails.controlBar[key] = value;
	markUiDirty();
}

export function clearSharedBand(key: ViewportKey) {
	delete headOrThrow().guardRails.controlBar[key];
	markUiDirty();
}

export function setPreviewInsets(key: ViewportKey, insets: Insets) {
	headOrThrow().guardRails.previewInsets[key] = { ...insets };
	markUiDirty();
}

export function setSharedMinText(key: ViewportKey, value: number) {
	headOrThrow().guardRails.minTextPx[key] = value;
	markUiDirty();
}

export function setSharedPopup(id: string, key: ViewportKey, field: 'maxHeight' | 'padding' | 'scrollbar', value: number | boolean) {
	const popups = headOrThrow().popups;
	const entry: UiPopup = (popups[id] ??= {});
	const viewports = (entry.viewports ??= {});
	const row = (viewports[key] ??= {});
	(row as Record<string, unknown>)[field] = value;
	markUiDirty();
}

export function setUiVersion(version: string) {
	headOrThrow().version = version;
	markUiDirty();
}

export function replaceUiState(next: UiState, options: { keepDirty?: boolean } = {}) {
	if (options.keepDirty && layoutStore.uiDirty) return;
	layoutStore.ui = clone(next);
	savedUiSnapshot = JSON.stringify(layoutStore.ui.head);
	layoutStore.uiDirty = false;
}

export async function saveUi(): Promise<boolean> {
	if (!import.meta.env.DEV || !layoutStore.ui.head) return false;
	layoutStore.uiSaving = true;
	try {
		const response = await fetch('/__ui', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ data: $state.snapshot(layoutStore.ui.head), baseHash: layoutStore.ui.headHash }),
		});
		const body = (await response.json().catch(() => ({}))) as {
			error?: string;
			headHash?: string;
			warnings?: { message: string }[];
		};
		if (!response.ok) {
			layoutStore.uiError = `${response.status} ${body.error ?? ''}`.trim();
			if (response.status === 409 && !String(body.error).includes('bump')) {
				const fresh = await fetch('/__ui');
				if (fresh.ok) replaceUiState((await fresh.json()) as UiState);
			}
			return false;
		}
		const fresh = await fetch('/__ui');
		if (fresh.ok) replaceUiState((await fresh.json()) as UiState);
		layoutStore.uiError = '';
		layoutStore.uiWarnings = (body.warnings ?? []).map((warning) => warning.message);
		return true;
	} catch (error) {
		layoutStore.uiError = String(error);
		return false;
	} finally {
		layoutStore.uiSaving = false;
	}
}

/** Editor preview insets for a key (ui.json, or a legacy builder.json value). */
export function readSafeArea(key: ViewportKey): Insets {
	return resolveSafeArea(key, layoutStore.data, activeUi());
}

/**
 * Runtime safe area: the browser's env(safe-area-inset-*). While the dev size picker forces a
 * key, the editor's preview insets for that key are used instead.
 */
export function activeSafeArea(): Insets {
	if (layoutStore.viewportOverride) return readSafeArea(layoutStore.viewportOverride);
	void sizeSource();
	return readEnvSafeArea();
}

/** Guard-rail findings with the shared UI applied (band, insets, popups, min text). */
export function currentFindings() {
	return layoutFindings(layoutStore.data, formulaFor(readFrameLayout()), layoutStore.locale, activeUi());
}

export function setViewportOverride(key: ViewportKey | null) {
	layoutStore.viewportOverride = key;
}

export function setWriteScope(scope: WriteScope) {
	layoutStore.writeScope = scope;
}

function targetKeys(): ViewportKey[] {
	return keysForScope(layoutStore.writeScope, activeViewport());
}

export function setNodeProps(id: string, patch: NodeProps, keys: ViewportKey[] = targetKeys()) {
	patchNodeItems(layoutStore.data, id, keys, patch);
	touch(id, patch);
	markDirty();
}

export function clearNodeProps(id: string, keys: ViewportKey[] = targetKeys()) {
	if (layoutRegistry.nodes.get(id)?.group === 'ui') {
		clearUiOverride(layoutStore.data, id, keys);
		markDirty();
		return;
	}
	clearItems(layoutStore.data, id, keys);
	layoutStore.dirty = true;
	markDirty();
}

/** True for ui.json items: their edits go to the game's uiOverrides, never to ui.json. */
export function isUiItem(id: string): boolean {
	return layoutRegistry.nodes.get(id)?.group === 'ui';
}

/**
 * One write path for the overlay and the layer panel. UI items (ui.json) write a Locked In-only
 * `ui.uiOverrides` offset; game items write `layout.viewports[key].items`.
 */
export function setItemProps(id: string, patch: NodeProps, keys: ViewportKey[] = targetKeys()) {
	if (isUiItem(id)) {
		const scale = patch.scale === undefined ? undefined : typeof patch.scale === 'number' ? patch.scale : patch.scale.x;
		setUiOverride(
			layoutStore.data,
			id,
			keys,
			{ dx: patch.x, dy: patch.y, scale, visible: patch.visible },
			layoutStore.ui.pin ?? layoutStore.ui.head?.version ?? '1.0.0',
		);
		touch(id, patch);
		markDirty();
		return;
	}
	setNodeProps(id, patch, keys);
}

export function setGridValue(patch: GridPatch, keys: ViewportKey[] = targetKeys()) {
	patchGrid(layoutStore.data, keys, patch);
	markDirty();
}

export function resetGrid(keys: ViewportKey[] = targetKeys()) {
	clearGrid(layoutStore.data, keys);
	markDirty();
}

export function setLayers(update: (layers: LayerConfig) => void) {
	updateLayers(layoutStore.data, update);
	markDirty();
}

export function setTunable(id: string, value: number, keys: ViewportKey[] = targetKeys()) {
	setTunableValue(layoutStore.data, id, keys, value);
	markDirty();
}

export function clearTunable(id: string, keys: ViewportKey[] = targetKeys()) {
	clearTunableValue(layoutStore.data, id, keys);
	markDirty();
}

/**
 * Layout panel band control. Step C: the band itself is shared (ui.json); from the game's
 * Layout panel this writes the game's explicit `uiOverrides["controlBar.band"][key].h`, which
 * the guard rails clamp (it can grow, never shrink below the shared band). Active key only.
 */
export function setControlBarValue(key: ViewportKey, value: number) {
	setBandOverride(layoutStore.data, key, value, layoutStore.ui.pin ?? layoutStore.ui.head?.version ?? '1.0.0');
	markDirty();
}

export function resetControlBar(key: ViewportKey) {
	clearBandOverride(layoutStore.data, key);
	markDirty();
}

export function readControlBar(key: ViewportKey): number | undefined {
	return resolveBand(key, layoutStore.data, activeUi());
}

export function readViewportItem(key: ViewportKey, id: string) {
	return resolveViewportItem(key, id, layoutStore.data.layout.viewports);
}

export function readTunable(id: string, fallback: number): number {
	return resolveTunable(activeViewport(), id, layoutStore.data.layout.tunables, fallback);
}

/** Phase 2: BOARD_FRAME_LAYOUT lives on builder.json. The seed is used until migration. */
export function readFrameLayout(): FrameLayout {
	return layoutStore.data.layout.frame ?? BOARD_FRAME_LAYOUT;
}

export function setLocale(locale: string) {
	layoutStore.locale = locale;
}

export function setPreviewMood(mood: string | null) {
	layoutStore.previewMood = mood;
}

export function setOverlay(flag: 'safe' | 'band' | 'grid', on: boolean) {
	layoutStore.overlays[flag] = on;
}

/** Anchor stored on an art slot. The editor writes builder.json, not PIXI. */
export function setArtAnchor(id: string, anchor: [number, number]) {
	const art = layoutStore.data.art as Record<string, unknown>;
	const slots = ((art.slots as Record<string, Record<string, unknown>> | undefined) ??
		{}) as Record<string, Record<string, unknown>>;
	art.slots = slots;
	const entry = slots[id] ?? {};
	slots[id] = entry;
	entry.anchor = anchor;
	markDirty();
}

/** Drag an animation onto a book event. The spine section stores the row. */
export function bindSpineEvent(row: { bookEvent: string; skeleton: string; anim: string; target?: string }) {
	const spine = layoutStore.data.spine as Record<string, unknown>;
	const map = Array.isArray(spine.eventMap) ? [...(spine.eventMap as Record<string, unknown>[])] : [];
	map.push({
		bookEvent: row.bookEvent,
		skeleton: row.skeleton,
		anim: row.anim,
		target: row.target ?? 'global',
		track: 0,
		loop: false,
	});
	spine.eventMap = map;
	markDirty();
}

/** Drag a cue onto a book event. Removes that event from the silent list. */
export function bindAudioCue(bookEvent: string, cue: string) {
	const audio = layoutStore.data.audio as Record<string, unknown>;
	const events = ((audio.events as Record<string, Record<string, unknown>[]> | undefined) ??
		{}) as Record<string, Record<string, unknown>[]>;
	audio.events = events;
	const rows = Array.isArray(events[bookEvent]) ? [...events[bookEvent]] : [];
	rows.push({ cue, on: 'once' });
	events[bookEvent] = rows;
	if (Array.isArray(audio.silent)) {
		audio.silent = (audio.silent as string[]).filter((name) => name !== bookEvent);
	}
	markDirty();
}

export function setAudioMix(device: 'phone' | 'desktop', key: 'musicDb' | 'sfxDb' | 'jingleDb', value: number) {
	const audio = layoutStore.data.audio as Record<string, unknown>;
	const mix = ((audio.mix as Record<string, Record<string, number>> | undefined) ?? {}) as Record<
		string,
		Record<string, number>
	>;
	audio.mix = mix;
	const row = mix[device] ?? {};
	mix[device] = row;
	row[key] = value;
	markDirty();
}

/** Copy one viewport's stored items onto another. Does not write PIXI. */
export function copyLayoutFrom(from: ViewportKey, to: ViewportKey) {
	copyViewportItems(layoutStore.data, from, to);
	markDirty();
}

export function replaceBuilderData(
	next: BuilderFile,
	hashes?: Record<BuilderSection, string>,
	options: { dirty?: boolean; keepSaved?: boolean } = {},
) {
	for (const key of VIEWPORT_KEYS) {
		for (const [id, item] of Object.entries(layoutStore.data.layout.viewports[key].items)) {
			if (item) layoutRegistry.markTouched(id, ['x', 'y']);
		}
	}
	layoutStore.data = normalizeBuilderFile(clone(next));
	if (hashes) layoutStore.hashes = { ...hashes };
	if (!options.keepSaved) savedSnapshot = JSON.stringify(layoutStore.data);
	layoutStore.dirty = options.dirty ?? JSON.stringify(layoutStore.data) !== savedSnapshot;
	if (!layoutStore.dirty) layoutStore.lastError = '';
}

export const snapshotBuilderData = (): BuilderFile => clone($state.snapshot(layoutStore.data) as BuilderFile);

/**
 * Save one section, or several in order (the layout panel saves `layout` and, when UI items were
 * dragged, the game's `ui` section). Each POST carries its own baseHash.
 */
export async function saveLayout(section: BuilderSection | BuilderSection[] = 'layout'): Promise<boolean> {
	if (!import.meta.env.DEV) return false;
	const data = sortBuilderFile(snapshotBuilderData());
	const errors = validateBuilderFile(data);
	if (errors.length) {
		layoutStore.lastError = errors.join('\n');
		return false;
	}
	const saved = JSON.parse(savedSnapshot) as BuilderFile;
	const sections = Array.isArray(section)
		? section.filter((name, index) => index === 0 || JSON.stringify(data[name] ?? null) !== JSON.stringify(sortBuilderFile(saved)[name] ?? null))
		: [section];
	layoutStore.saving = true;
	try {
		for (const name of sections) {
			const response = await fetch('/__layout', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					section: name,
					data: data[name],
					baseHash: layoutStore.hashes[name],
				}),
			});
			if (response.status === 409) {
				const fresh = await fetch('/__layout');
				if (fresh.ok) {
					const payload = (await fresh.json()) as { file: BuilderFile; hashes: Record<BuilderSection, string> };
					replaceBuilderData(payload.file, payload.hashes, { dirty: false });
				}
				layoutStore.lastError = 'stale save rejected (409); reloaded from disk';
				return false;
			}
			if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
			const body = (await response.json()) as { hashes?: Record<BuilderSection, string> };
			if (body.hashes) layoutStore.hashes = { ...body.hashes };
		}
		savedSnapshot = JSON.stringify(data);
		layoutStore.dirty = false;
		layoutStore.lastSavedAt = Date.now();
		layoutStore.lastError = '';
		return true;
	} catch (error) {
		layoutStore.lastError = String(error);
		return false;
	} finally {
		layoutStore.saving = false;
	}
}

/** Adopt an upload without dropping unsaved layout edits. */
export function adoptUpload(section: 'art' | 'spine' | 'audio', file: BuilderFile, hashes: Record<BuilderSection, string>) {
	if (layoutStore.dirty) {
		layoutStore.data[section] = clone(file[section]);
		layoutStore.hashes[section] = hashes[section];
		return;
	}
	replaceBuilderData(file, hashes, { dirty: false });
}

if (import.meta.hot) {
	import.meta.hot.on(
		'layout-editor:update',
		(payload: { data: BuilderFile; hashes?: Record<BuilderSection, string> }) => {
			if (layoutStore.dirty) {
				console.warn(
					'[layout-editor] builder.json changed on disk but you have unsaved edits; keeping the in-memory version.',
				);
				return;
			}
			replaceBuilderData(payload.data, payload.hashes, { dirty: false });
		},
	);
	import.meta.hot.on('layout-editor:ui', (payload: UiState) => {
		if (layoutStore.uiDirty) {
			console.warn('[layout-editor] ui.json changed on disk but the UI tab has unsaved edits; keeping them.');
			return;
		}
		replaceUiState(payload);
	});
}
