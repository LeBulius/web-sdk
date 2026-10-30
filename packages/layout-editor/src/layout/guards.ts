/**
 * Live guard rails. Red blocks export. Ordinary save still writes.
 *
 * Step C: the control-bar band and the editor preview insets come from the shared ui.json
 * (packages/ui-builder) when one is passed in; the game's explicit `controlBar.band` override
 * is applied on top (never smaller). The runtime reads env(safe-area-inset-*) instead
 * (src/layout/safe-area.ts). Mobile landscape keys inherit portrait until relaid out, so any
 * finding there on an inherited item is an amber `landscape-misfit`, never red.
 */
import {
	VIEWPORT_KEYS,
	VIEWPORTS,
	ancestorChain,
	controlBarBand,
	designLayoutType,
	resolveViewportItem,
	type BuilderFile,
	type FrameLayout,
	type Insets,
	type LayoutItem,
	type PopupEntry,
	type PopupViewport,
	type ViewportKey,
	MOBILE_LANDSCAPE_KEYS,
	isMobileKey,
	isMobileLandscapeKey,
} from '../builder.schema';
import { gameBand, uiPreviewInsets, uiMinText, type UiFile } from '../../../ui-builder/src/ui.schema';
import { BOARD_FRAME_LAYOUT } from './migrate';
import { messageText, textWidth } from './messages';

export type Box = { x: number; y: number; w: number; h: number };

export type Finding = {
	level: 'red' | 'amber';
	code: string;
	message: string;
	id?: string;
	viewport?: ViewportKey;
};

export const SAFE_AREA_ESTIMATES: Record<ViewportKey, Insets> = {
	desktop: { top: 0, right: 0, bottom: 0, left: 0 },
	laptop: { top: 0, right: 0, bottom: 0, left: 0 },
	popoutL: { top: 0, right: 0, bottom: 0, left: 0 },
	popoutS: { top: 0, right: 0, bottom: 0, left: 0 },
	mobileL: { top: 47, right: 0, bottom: 34, left: 0 },
	mobileM: { top: 20, right: 0, bottom: 0, left: 0 },
	mobileS: { top: 20, right: 0, bottom: 0, left: 0 },
	// Step C: landscape preview insets start at 0 (spec); tune them in ui.json.
	mobileL_land: { top: 0, right: 0, bottom: 0, left: 0 },
	mobileM_land: { top: 0, right: 0, bottom: 0, left: 0 },
	mobileS_land: { top: 0, right: 0, bottom: 0, left: 0 },
};

const ZERO: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export function resolveSafeArea(key: ViewportKey, file: BuilderFile, ui?: UiFile | null): Insets {
	const chain = ancestorChain(key);
	for (let index = chain.length - 1; index >= 0; index -= 1) {
		const stored = file.layout.reserved?.safeArea?.[chain[index]!];
		if (stored) return stored;
	}
	if (ui) return uiPreviewInsets(ui, key);
	return SAFE_AREA_ESTIMATES[key] ?? ZERO;
}

/** Band for a key: shared ui.json (+ the game's explicit override), else the legacy builder.json value. */
export function resolveBand(key: ViewportKey, file: BuilderFile, ui?: UiFile | null): number {
	if (ui) return gameBand(ui, file.ui, key);
	return controlBarBand(key, file.layout.reserved?.controlBar) ?? 0;
}

/** True when no landscape key on this key's chain stores the item: it is inherited from portrait. */
export function inheritsPortrait(key: ViewportKey, id: string, file: BuilderFile): boolean {
	if (!isMobileLandscapeKey(key)) return false;
	return ancestorChain(key)
		.filter((step) => (MOBILE_LANDSCAPE_KEYS as readonly string[]).includes(step))
		.every((step) => !file.layout.viewports[step]?.items?.[id]);
}

export function collectItemIds(file: BuilderFile): string[] {
	const ids = new Set<string>();
	for (const key of VIEWPORT_KEYS) {
		for (const id of Object.keys(file.layout.viewports[key]?.items ?? {})) ids.add(id);
	}
	return [...ids].sort();
}

export type FallbackBox = { x: number; y: number; w?: number; h?: number };

/** Items whose stored x/y are in the game's main-layout space (P0: the board). */
export const MAIN_SPACE_IDS = new Set(['board']);

/**
 * Game design frame → Stake viewport px for a key: `viewport = main * s + o`. The game's
 * MainContainer contain-fits its design frame (utils-layout mainSizesMap) into the canvas.
 * Identity when builder.json carries no `layout.frame.design`.
 */
export function designTransform(key: ViewportKey, frame?: FrameLayout): { s: number; ox: number; oy: number } {
	const spec = VIEWPORTS[key];
	const main = frame?.design?.[designLayoutType(spec.w, spec.h)];
	if (!main) return { s: 1, ox: 0, oy: 0 };
	const s = Math.min(spec.w / main.w, spec.h / main.h);
	return { s, ox: (spec.w - main.w * s) / 2, oy: (spec.h - main.h * s) / 2 };
}

export function worldOf(
	key: ViewportKey,
	id: string,
	file: BuilderFile,
	fallback: (id: string, key: ViewportKey) => FallbackBox,
	seen: Set<string> = new Set(),
): { x: number; y: number } {
	if (seen.has(id)) return { x: 0, y: 0 };
	seen.add(id);
	const item = resolveViewportItem(key, id, file.layout.viewports);
	const base = fallback(id, key);
	const t = designTransform(key, file.layout.frame);
	let local: { x: number; y: number };
	if (item.offset) {
		// Offset wrappers (logo, WAYS plaque): main-layout px added to the formula position.
		local = { x: base.x + (item.x ?? 0) * t.s, y: base.y + (item.y ?? 0) * t.s };
	} else if (MAIN_SPACE_IDS.has(id)) {
		local = {
			x: item.x !== undefined ? item.x * t.s + t.ox : base.x,
			y: item.y !== undefined ? item.y * t.s + t.oy : base.y,
		};
	} else {
		local = { x: item.x ?? base.x, y: item.y ?? base.y };
	}
	if (!item.parent) return local;
	const parent = worldOf(key, item.parent, file, fallback, seen);
	return { x: parent.x + local.x, y: parent.y + local.y };
}

export function itemBox(item: LayoutItem, world: { x: number; y: number }, fallback: FallbackBox): Box {
	const w = item.w ?? fallback.w ?? 0;
	const h = item.h ?? fallback.h ?? 0;
	const ax = item.anchor?.[0] ?? 0;
	const ay = item.anchor?.[1] ?? 0;
	return { x: world.x - w * ax, y: world.y - h * ay, w, h };
}

export function overlapsControlBar(box: Box, frameH: number, band: number): boolean {
	if (band <= 0) return false;
	const bandTop = frameH - band;
	if (box.w <= 0 && box.h <= 0) return box.y >= bandTop && box.y <= frameH;
	return box.y + box.h > bandTop && box.y < frameH;
}

export function outsideSafeArea(box: Box, frame: { w: number; h: number }, insets: Insets): boolean {
	const right = frame.w - insets.right;
	const bottom = frame.h - insets.bottom;
	if (box.w <= 0 && box.h <= 0) {
		return box.x < insets.left || box.y < insets.top || box.x > right || box.y > bottom;
	}
	return box.x < insets.left || box.y < insets.top || box.x + box.w > right || box.y + box.h > bottom;
}

export function formulaFor(frame = BOARD_FRAME_LAYOUT) {
	return (id: string, key: ViewportKey): FallbackBox => {
		const spec = VIEWPORTS[key];
		if (id === 'board') {
			return {
				x: spec.w * frame.boardAnchor[0],
				y: spec.h * frame.boardAnchor[1],
				w: Math.min(spec.w * 0.5, spec.h * 0.7),
				h: Math.min(spec.h * 0.55, spec.w * 0.7),
			};
		}
		if (id === 'gameTitle') {
			return {
				x: spec.w / 2,
				y: Math.max(frame.titleMinY, spec.h * frame.titleYFactor),
				w: 280,
				h: Math.max(18, spec.h * 0.048),
			};
		}
		if (id === 'waysPlaque') {
			return {
				x: 0,
				y: spec.h * frame.plaqueLocalYFactor,
				w: Math.min(160, spec.w * 0.22),
				h: Math.max(28, spec.h * 0.045),
			};
		}
		return { x: 0, y: 0 };
	};
}

function resolvePopupField<K extends keyof PopupViewport>(
	entry: PopupEntry,
	key: ViewportKey,
	field: K,
): PopupViewport[K] | undefined {
	const chain = ancestorChain(key);
	for (let index = chain.length - 1; index >= 0; index -= 1) {
		const value = entry.viewports?.[chain[index]!]?.[field];
		if (value !== undefined) return value;
	}
	return undefined;
}

export function layoutFindings(
	file: BuilderFile,
	fallback: (id: string, key: ViewportKey) => FallbackBox = formulaFor(file.layout.frame ?? BOARD_FRAME_LAYOUT),
	locale = 'en',
	ui?: UiFile | null,
): Finding[] {
	const all: Finding[] = [];
	const ids = collectItemIds(file);
	for (const key of VIEWPORT_KEYS) {
		const spec = VIEWPORTS[key];
		const band = resolveBand(key, file, ui);
		const insets = resolveSafeArea(key, file, ui);
		const portrait = spec.h > spec.w;
		const phone = isMobileKey(key);
		const landscape = isMobileLandscapeKey(key);
		const minText = ui ? uiMinText(ui, key) : 12;
		for (const id of ids) {
			const findings: Finding[] = [];
			const item = resolveViewportItem(key, id, file.layout.viewports);
			if (Object.keys(item).length === 0 && fallback(id, key).x === 0 && fallback(id, key).y === 0 && id !== 'board') {
				continue;
			}
			const world = worldOf(key, id, file, fallback);
			const box = itemBox(item, world, { ...fallback(id, key), x: world.x, y: world.y });
			if (landscape && overlapsControlBar(box, spec.h, band)) {
				findings.push({
					level: 'amber',
					code: 'landscape-band',
					id,
					viewport: key,
					message: `${id} overlaps the ${key} control-bar band (${band}px on ${spec.w}×${spec.h}).`,
				});
			}
			if (key === 'desktop' && overlapsControlBar(box, spec.h, band)) {
				findings.push({
					level: 'red',
					code: 'control-bar',
					id,
					viewport: key,
					message: `${id} overlaps the desktop control-bar band (${band}px on 1200×675).`,
				});
			}
			if (outsideSafeArea(box, spec, insets)) {
				findings.push({
					level: 'red',
					code: 'safe-area',
					id,
					viewport: key,
					message: `${id} sits outside the ${key} safe area.`,
				});
			}
			if (item.kind === 'text') {
				const size = item.fontSize ?? 16;
				if (!item.messageId) {
					findings.push({
						level: 'red',
						code: 'text-id',
						id,
						viewport: key,
						message: `${id} is text without a Lingui message id.`,
					});
				} else {
					const translated = messageText(locale, item.messageId);
					if (translated && item.w && textWidth(translated, size) > item.w) {
						findings.push({
							level: 'amber',
							code: 'text-overflow',
							id,
							viewport: key,
							message: `${item.messageId} overflows ${id} in ${locale}.`,
						});
					}
				}
				if (item.fontSize !== undefined && size < minText) {
					findings.push({
						level: 'amber',
						code: 'text-size',
						id,
						viewport: key,
						message: `${id} is below the ${minText}px readable size.`,
					});
				}
			}
			if (item.kind === 'button' && phone && item.w !== undefined && item.h !== undefined && (item.w < 44 || item.h < 44)) {
				findings.push({
					level: 'amber',
					code: 'tap-target',
					id,
					viewport: key,
					message: `${id} is under 44×44 on ${key}.`,
				});
			}
			if (portrait && (id === 'waysPlaque' || id === 'gameTitle')) {
				if (box.w > 0 && (box.x < 0 || box.x + box.w > spec.w || box.y < 0 || box.y + box.h > spec.h)) {
					findings.push({
						level: 'amber',
						code: 'plaque-clip',
						id,
						viewport: key,
						message: `${id} is clipped in ${key}.`,
					});
				}
			}
			// Landscape keys inherit portrait until someone relays them out: report every
			// finding on an inherited item as an amber landscape misfit, never red (sign-off).
			if (landscape && inheritsPortrait(key, id, file)) {
				for (const finding of findings) {
					all.push({
						...finding,
						level: 'amber',
						code: 'landscape-misfit',
						message: `landscape misfit (inherits portrait): ${finding.message}`,
					});
				}
			} else if (landscape) {
				for (const finding of findings) all.push({ ...finding, level: 'amber' });
			} else {
				all.push(...findings);
			}
		}
	}
	const findings = all;
	const popups = ui?.popups ?? file.layout.popups;
	if (popups) {
		for (const [id, entry] of Object.entries(popups)) {
			for (const key of VIEWPORT_KEYS) {
				const maxHeight = resolvePopupField(entry, key, 'maxHeight');
				const scrollbar = resolvePopupField(entry, key, 'scrollbar');
				if (maxHeight === undefined || entry.contentHeight === undefined) continue;
				if (entry.contentHeight > maxHeight && scrollbar !== true) {
					findings.push({
						level: 'amber',
						code: 'popup-scroll',
						id,
						viewport: key,
						message: `${id} needs a scrollbar at ${key} (${entry.contentHeight}px in ${maxHeight}px).`,
					});
				}
			}
		}
	}
	return findings;
}

export function exportBlockers(findings: Finding[]): Finding[] {
	return findings.filter((finding) => finding.level === 'red');
}

export function exportAllowed(findings: Finding[]): boolean {
	return exportBlockers(findings).length === 0;
}
