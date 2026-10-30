/**
 * Shared UI layer (step C, specs/ui_split_and_orientation.md).
 *
 * packages/ui-builder/ui.json holds the chrome every game shares (control bar + band, popups,
 * paytable/rules/buy-panel shells, modals, loading shell, language switch + common keys, guard
 * rails). Positions/scale/visibility/z are stored per viewport key; the mobile landscape keys
 * are the orientation axis. Locked In UI owns the values.
 *
 * Versioning: ui.json carries a semver `version`. `pnpm --filter ui-builder release` freezes it
 * as releases/<version>.json. A game pins a version in builder.json `ui.pin` and ships that
 * frozen release, so editing ui.json never silently moves a shipped game.
 */
import {
	VIEWPORT_KEYS,
	VIEWPORTS,
	ancestorChain,
	assetPathError,
	type ControlBarMap,
	type GameUiSection,
	type Insets,
	type PopupEntry,
	type UiOverrideValue,
	type ViewportKey,
} from '../../layout-editor/src/builder.schema';
import { GAME_DATA_FIELDS, GENERIC_EVENTS, GENERIC_FIELDS, eventScope, normalizeField } from '../scopes.mjs';

export const UI_FILE_KIND = 'shared-ui';
export const BAND_ITEM = 'controlBar.band';
export const UI_ITEM_KINDS = ['button', 'text', 'band', 'node'] as const;
/** UI interaction sounds allowed in ui.json (spec: "click, popup open"). Book-event sounds are not. */
export const UI_INTERACTIONS = ['click', 'popupOpen'] as const;
/** dx/dy: on-canvas drag offset (local px) from the shared layout position (game uiOverrides). */
export const UI_VALUE_FIELDS = ['x', 'y', 'dx', 'dy', 'scale', 'visible', 'z', 'h'] as const;

export type UiItemKind = (typeof UI_ITEM_KINDS)[number];
export type UiValue = UiOverrideValue;
export type UiItemDef = {
	group: string;
	kind?: UiItemKind;
	description?: string;
	/** Size in design px, only when known. Used by the clamp (tap target, band, safe area). */
	w?: number;
	h?: number;
	anchor?: [number, number];
	fontSize?: number;
	viewports: Partial<Record<ViewportKey, UiValue>>;
};
export type UiPopup = PopupEntry & {
	description?: string;
	/** Shell only: the game fills the content (paytable/rules text, buy cards). */
	shell?: boolean;
	grid?: { slots?: number; spacing?: number };
};
export type UiShell = { description?: string; viewports?: Partial<Record<ViewportKey, UiValue>> };
export type UiFile = {
	$schema?: string;
	kind: typeof UI_FILE_KIND;
	version: string;
	owner?: string;
	description?: string;
	guardRails: {
		/** Control-bar band per key; descendants inherit along the viewport chain. */
		controlBar: ControlBarMap;
		/** Editor preview insets per key (hand-tuned). The runtime reads env(safe-area-inset-*). */
		previewInsets: Partial<Record<ViewportKey, Insets>>;
		/** Minimum readable text size per key, inherited along the chain. */
		minTextPx: Partial<Record<ViewportKey, number>>;
		minTapPx: number;
		runtimeSafeArea: 'env';
	};
	items: Record<string, UiItemDef>;
	popups: Record<string, UiPopup>;
	modals: Record<string, UiShell>;
	loading: Record<string, UiShell>;
	i18n: {
		source?: string;
		commonKeys: Record<string, string | null>;
		languageSwitch: { source?: string; description?: string };
	};
	audio: { interactions: Partial<Record<(typeof UI_INTERACTIONS)[number], { cue: string }>> };
	/** Generic book-event bindings (visual only). scope:game events are rejected. */
	/**
	 * Generic book-event bindings (visual only). scope:game events are rejected. `field` (optional)
	 * names the payload field used, e.g. "totalWin"; only the event's generic fields are allowed
	 * (symbol-carrying fields such as reveal.board or winInfo.wins[].symbol give a warning).
	 */
	bindings: { bookEvent: string; field?: string; target: string; action: string }[];
	changelog?: { version: string; note: string }[];
};

/** What the dev server hands the editor (virtual module + GET /__ui). `head` is null in builds. */
export type UiPayload = {
	pin: string | null;
	pinned: UiFile | null;
	head: UiFile | null;
	headHash: string;
	releases: string[];
};

export type UiIssue = { level: 'error' | 'warning' | 'ok'; code: string; message: string };
export type CatalogueLike =
	| {
			events?: {
				type?: string;
				scope?: string;
				fieldPaths?: string[];
				genericFields?: string[];
				gameDataFields?: string[];
			}[];
	  }
	| null
	| undefined;

export type FieldClass = 'event' | 'generic' | 'game-data' | 'not-allowlisted';

/**
 * How ui.json may use `field` of a generic book event. The catalogue's genericFields /
 * gameDataFields win (pnpm builder:rounds writes them from scopes.mjs); else the shared table.
 */
export function fieldClassOf(type: string, field: string | undefined, catalogue?: CatalogueLike): FieldClass {
	if (!field) return 'event';
	const entry = catalogue?.events?.find((event) => event.type === type);
	const generic = entry?.genericFields ?? (GENERIC_FIELDS as Record<string, readonly string[]>)[type] ?? [];
	const gameData = entry?.gameDataFields ?? (GAME_DATA_FIELDS as Record<string, readonly string[]>)[type] ?? [];
	const path = normalizeField(field);
	const under = (base: string) => path === base || path.startsWith(`${base}.`);
	if (gameData.some(under)) return 'game-data';
	if (generic.some(under)) return 'generic';
	return 'not-allowlisted';
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const isNum = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isKey = (key: string): key is ViewportKey => (VIEWPORT_KEYS as readonly string[]).includes(key);
export const isSemver = (value: unknown): value is string =>
	typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);

function compareSemver(a: string, b: string): number {
	const pa = a.split('.').map(Number);
	const pb = b.split('.').map(Number);
	for (let index = 0; index < 3; index += 1) {
		if (pa[index] !== pb[index]) return (pa[index] ?? 0) - (pb[index] ?? 0);
	}
	return 0;
}

/** Scope of a book event: the catalogue's own `scope` field wins, else the shared table. */
export function scopeOf(type: string, catalogue?: CatalogueLike): 'generic' | 'game' | 'unknown' {
	const events = catalogue?.events;
	if (events && events.length > 0) {
		const entry = events.find((event) => event.type === type);
		if (!entry) return 'unknown';
		if (entry.scope === 'generic' || entry.scope === 'game') return entry.scope;
	}
	return eventScope(type);
}

function chainValue<T>(map: Partial<Record<ViewportKey, T>> | undefined, key: ViewportKey): T | undefined {
	const chain = ancestorChain(key);
	for (let index = chain.length - 1; index >= 0; index -= 1) {
		const value = map?.[chain[index]!];
		if (value !== undefined) return value;
	}
	return undefined;
}

const ZERO: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export function uiBand(ui: UiFile | null | undefined, key: ViewportKey): number {
	return chainValue(ui?.guardRails.controlBar, key) ?? 0;
}

/** Per-key preview insets. A key without its own entry starts at 0 (spec), it does not inherit. */
export function uiPreviewInsets(ui: UiFile | null | undefined, key: ViewportKey): Insets {
	return ui?.guardRails.previewInsets?.[key] ?? ZERO;
}

export function uiMinText(ui: UiFile | null | undefined, key: ViewportKey): number {
	return chainValue(ui?.guardRails.minTextPx, key) ?? 12;
}

export function resolveUiItem(ui: UiFile, id: string, key: ViewportKey): UiValue {
	const merged: UiValue = {};
	const def = ui.items[id];
	if (!def) return merged;
	for (const step of ancestorChain(key)) Object.assign(merged, def.viewports?.[step] ?? {});
	return merged;
}

export type ClampResult = { value: UiValue; flags: string[] };

/**
 * Clamp a game's uiOverride by the shared guard rails:
 * - x/y stay inside the frame minus the preview insets; items outside the control bar stay
 *   above the band, control-bar items stay inside it;
 * - buttons keep 44px tap targets, text keeps the minimum readable size (scale floor);
 * - the band (`controlBar.band`, field h) can grow but never shrink below the shared band.
 */
export function clampUiOverride(ui: UiFile, id: string, key: ViewportKey, value: UiValue): ClampResult {
	const def = ui.items[id];
	const spec = VIEWPORTS[key];
	const insets = uiPreviewInsets(ui, key);
	const band = uiBand(ui, key);
	const flags: string[] = [];
	const next: UiValue = { ...value };
	if (!def) return { value: next, flags: [`unknown ui item "${id}"`] };
	const clamp = (field: 'x' | 'y' | 'dx' | 'dy' | 'scale' | 'h', min: number, max: number) => {
		const current = next[field];
		if (current === undefined) return;
		const bounded = Math.min(Math.max(current, min), Math.max(min, max));
		if (bounded !== current) {
			flags.push(`${field} ${current} → ${Number(bounded.toFixed(3))}`);
			next[field] = bounded;
		}
	};
	if (def.kind === 'band') {
		clamp('h', band, spec.h * 0.5);
		return { value: next, flags };
	}
	// Drag offsets are in the item's local layout px; keep them within one frame of the shared spot.
	clamp('dx', -spec.w, spec.w);
	clamp('dy', -spec.h, spec.h);
	const scale = next.scale ?? 1;
	const w = (def.w ?? 0) * scale;
	const h = (def.h ?? 0) * scale;
	const [ax, ay] = def.anchor ?? [0, 0];
	clamp('x', insets.left + w * ax, spec.w - insets.right - w * (1 - ax));
	if (def.group === 'controlBar') {
		clamp('y', spec.h - band + h * ay, spec.h - insets.bottom - h * (1 - ay));
	} else {
		clamp('y', insets.top + h * ay, spec.h - insets.bottom - band - h * (1 - ay));
	}
	if (def.kind === 'button' && def.w && def.h) {
		clamp('scale', ui.guardRails.minTapPx / Math.min(def.w, def.h), Number.POSITIVE_INFINITY);
	}
	if (def.kind === 'text' && def.fontSize) {
		clamp('scale', uiMinText(ui, key) / def.fontSize, Number.POSITIVE_INFINITY);
	}
	return { value: next, flags };
}

export type OverrideRow = { id: string; key: ViewportKey; stored: UiValue; value: UiValue; flags: string[] };

/** Every explicit game override, clamped, for the UI tab and builder:check. */
export function overrideReport(ui: UiFile, game: GameUiSection | undefined): OverrideRow[] {
	const rows: OverrideRow[] = [];
	for (const [id, perKey] of Object.entries(game?.uiOverrides ?? {})) {
		for (const [key, stored] of Object.entries(perKey ?? {})) {
			if (!isKey(key) || !stored) continue;
			const clamped = clampUiOverride(ui, id, key, stored);
			rows.push({ id, key, stored, value: clamped.value, flags: clamped.flags });
		}
	}
	return rows;
}

/** Shared item value + the game's explicit override for this key (clamped). */
export function resolveGameUiItem(
	ui: UiFile,
	game: GameUiSection | undefined,
	id: string,
	key: ViewportKey,
): UiValue {
	const base = resolveUiItem(ui, id, key);
	const own = game?.uiOverrides?.[id]?.[key];
	if (!own) return base;
	return { ...base, ...clampUiOverride(ui, id, key, own).value };
}

/** Band for this key: shared value, or the game's `controlBar.band` override (never smaller). */
export function gameBand(ui: UiFile | null | undefined, game: GameUiSection | undefined, key: ViewportKey): number {
	const shared = uiBand(ui, key);
	const own = game?.uiOverrides?.[BAND_ITEM]?.[key]?.h;
	if (!ui || own === undefined) return shared;
	return clampUiOverride(ui, BAND_ITEM, key, { h: own }).value.h ?? shared;
}

function walkBookEvents(node: unknown, path: string, out: { path: string; type: string; fields: string[] }[]) {
	if (Array.isArray(node)) {
		node.forEach((entry, index) => walkBookEvents(entry, `${path}[${index}]`, out));
		return;
	}
	if (!isRecord(node)) return;
	for (const [key, value] of Object.entries(node)) {
		if (key === 'bookEvent' && typeof value === 'string') {
			// the binding's payload field(s): `field: "totalWin"` or `fields: ["amount", "total"]`
			const fields = [node.field, ...(Array.isArray(node.fields) ? node.fields : [])].filter(
				(entry): entry is string => typeof entry === 'string' && entry.length > 0,
			);
			out.push({ path: `${path}.${key}`, type: value, fields });
		} else walkBookEvents(value, `${path}.${key}`, out);
	}
}

function validateValue(value: unknown, path: string, issues: UiIssue[]) {
	if (!isRecord(value)) {
		issues.push({ level: 'error', code: 'ui-shape', message: `${path} must be an object` });
		return;
	}
	for (const [field, entry] of Object.entries(value)) {
		if (!(UI_VALUE_FIELDS as readonly string[]).includes(field)) {
			issues.push({ level: 'error', code: 'ui-shape', message: `${path}.${field}: unknown field` });
		} else if (field === 'visible' ? typeof entry !== 'boolean' : !isNum(entry)) {
			issues.push({ level: 'error', code: 'ui-shape', message: `${path}.${field} has the wrong type` });
		}
	}
}

function validatePerKey(map: unknown, path: string, issues: UiIssue[], each: (value: unknown, path: string) => void) {
	if (map === undefined) return;
	if (!isRecord(map)) {
		issues.push({ level: 'error', code: 'ui-shape', message: `${path} must be an object` });
		return;
	}
	for (const [key, value] of Object.entries(map)) {
		if (!isKey(key)) {
			issues.push({ level: 'error', code: 'ui-shape', message: `${path}: unknown viewport "${key}"` });
			continue;
		}
		each(value, `${path}.${key}`);
	}
}

/**
 * ui.json validator. Rejects scope:game bindings (and unknown / legacy events), book-event
 * sounds, unknown UI interactions and malformed per-viewport values.
 */
export function validateUiFile(input: unknown, options: { catalogue?: CatalogueLike } = {}): UiIssue[] {
	const issues: UiIssue[] = [];
	const error = (code: string, message: string) => issues.push({ level: 'error', code, message });
	if (!isRecord(input)) return [{ level: 'error', code: 'ui-shape', message: 'ui.json must be an object' }];
	if (input.kind !== UI_FILE_KIND) error('ui-shape', `kind must be "${UI_FILE_KIND}"`);
	if (!isSemver(input.version)) error('ui-version', 'version must be semver such as 1.0.0');
	const rails = input.guardRails;
	if (!isRecord(rails)) error('ui-shape', 'guardRails must be an object');
	else {
		validatePerKey(rails.controlBar, 'guardRails.controlBar', issues, (value, path) => {
			if (!isNum(value) || value < 0) error('ui-shape', `${path} must be a number >= 0`);
		});
		validatePerKey(rails.previewInsets, 'guardRails.previewInsets', issues, (value, path) => {
			if (!isRecord(value)) return error('ui-shape', `${path} must be {top,right,bottom,left}`);
			for (const edge of ['top', 'right', 'bottom', 'left']) {
				if (!isNum(value[edge]) || (value[edge] as number) < 0) error('ui-shape', `${path}.${edge} must be a number >= 0`);
			}
		});
		validatePerKey(rails.minTextPx, 'guardRails.minTextPx', issues, (value, path) => {
			if (!isNum(value) || value <= 0) error('ui-shape', `${path} must be a number > 0`);
		});
		if (!isNum(rails.minTapPx) || rails.minTapPx <= 0) error('ui-shape', 'guardRails.minTapPx must be a number > 0');
		if (rails.runtimeSafeArea !== 'env') error('ui-shape', 'guardRails.runtimeSafeArea must be "env"');
	}
	if (!isRecord(input.items)) error('ui-shape', 'items must be an object');
	else {
		for (const [id, def] of Object.entries(input.items)) {
			if (!isRecord(def)) {
				error('ui-shape', `items.${id} must be an object`);
				continue;
			}
			if (typeof def.group !== 'string') error('ui-shape', `items.${id}.group must be a string`);
			if (def.kind !== undefined && !(UI_ITEM_KINDS as readonly string[]).includes(String(def.kind))) {
				error('ui-shape', `items.${id}.kind must be ${UI_ITEM_KINDS.join('|')}`);
			}
			validatePerKey(def.viewports, `items.${id}.viewports`, issues, (value, path) => validateValue(value, path, issues));
		}
	}
	for (const group of ['popups', 'modals', 'loading'] as const) {
		const entries = input[group];
		if (!isRecord(entries)) {
			error('ui-shape', `${group} must be an object`);
			continue;
		}
		for (const [id, entry] of Object.entries(entries)) {
			if (!isRecord(entry)) error('ui-shape', `${group}.${id} must be an object`);
			else if (group !== 'popups') {
				validatePerKey(entry.viewports, `${group}.${id}.viewports`, issues, (value, path) => validateValue(value, path, issues));
			}
		}
	}
	const audio = input.audio;
	if (isRecord(audio)) {
		for (const key of Object.keys(audio)) {
			if (key !== 'interactions') {
				error('ui-book-sound', `audio.${key}: only UI interaction sounds belong in ui.json; book-event sounds stay in the game builder.json`);
			}
		}
		if (isRecord(audio.interactions)) {
			for (const [name, row] of Object.entries(audio.interactions)) {
				if (!(UI_INTERACTIONS as readonly string[]).includes(name)) {
					error('ui-interaction', `audio.interactions.${name}: not a UI interaction (${UI_INTERACTIONS.join(', ')})`);
				} else if (!isRecord(row) || typeof row.cue !== 'string' || !row.cue) {
					error('ui-interaction', `audio.interactions.${name}.cue must be a sprite key`);
				}
			}
		}
	} else if (audio !== undefined) error('ui-shape', 'audio must be an object');
	const found: { path: string; type: string; fields: string[] }[] = [];
	walkBookEvents(input, 'ui', found);
	const warning = (code: string, message: string) => issues.push({ level: 'warning', code, message });
	for (const { path, type, fields } of found) {
		const scope = scopeOf(type, options.catalogue);
		if (scope === 'game') {
			error('ui-scope-game', `${path} binds "${type}", a scope:game event; only a game's builder.json may bind it`);
			continue;
		}
		if (scope === 'unknown') {
			error('ui-unknown-event', `${path} binds "${type}", which is not in the event catalogue`);
			continue;
		}
		// Generic event: only its generic fields (warning, not a block; SlotMath Dev follow-up).
		for (const field of fields) {
			const kind = fieldClassOf(type, field, options.catalogue);
			if (kind === 'game-data') {
				warning('ui-game-data-field', `${path} uses ${type}.${field}, which is game data (symbols, positions or win breakdown); bind it in the game's builder.json`);
			} else if (kind === 'not-allowlisted') {
				warning('ui-field-not-generic', `${path} uses ${type}.${field}, which is not a generic field of ${type}`);
			}
		}
	}
	if (input.bindings !== undefined && !Array.isArray(input.bindings)) error('ui-shape', 'bindings must be an array');
	return issues;
}

/** Pin check: the pinned release must exist, and the head must not drift under a released version. */
export function pinIssues(options: {
	head: UiFile | null;
	releases: Record<string, UiFile>;
	pin: string | undefined;
}): UiIssue[] {
	const issues: UiIssue[] = [];
	const { head, releases, pin } = options;
	if (!pin) {
		issues.push({ level: 'error', code: 'ui-pin', message: 'builder.json has no ui.pin (pin a ui.json version)' });
		return issues;
	}
	if (!releases[pin] && head?.version !== pin) {
		issues.push({ level: 'error', code: 'ui-pin', message: `ui.pin ${pin} is neither a release nor the current ui.json version` });
	}
	if (!releases[pin] && head?.version === pin) {
		issues.push({ level: 'warning', code: 'ui-pin', message: `ui.pin ${pin} is not released yet: the game follows the working ui.json` });
	}
	if (head && releases[head.version] && JSON.stringify(releases[head.version]) !== JSON.stringify(head)) {
		issues.push({
			level: 'error',
			code: 'ui-unreleased-change',
			message: `ui.json changed but still says ${head.version}, which is already released; bump the version`,
		});
	}
	if (head && releases[pin] && compareSemver(head.version, pin) > 0) {
		issues.push({ level: 'ok', code: 'ui-pin', message: `game pins ${pin}; ui.json is at ${head.version}` });
	}
	return issues;
}

/** The ui.json a game ships: its pinned release, else the working copy if it has the same version. */
export function pinnedUi(head: UiFile | null, releases: Record<string, UiFile>, pin: string | undefined): UiFile | null {
	if (pin && releases[pin]) return releases[pin]!;
	if (pin && head?.version === pin) return head;
	return null;
}

/** Override rows whose values were clamped, as warnings. */
export function overrideIssues(ui: UiFile, game: GameUiSection | undefined): UiIssue[] {
	return overrideReport(ui, game).map((row) =>
		row.flags.length
			? { level: 'warning' as const, code: 'ui-override-clamped', message: `uiOverrides.${row.id}.${row.key}: ${row.flags.join(', ')}` }
			: { level: 'ok' as const, code: 'ui-override', message: `uiOverrides.${row.id}.${row.key} within the guard rails` },
	);
}

const SKIN_KEYS = ['$schema', 'pin', 'colors', 'art', 'description'];
const COLOR = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

/**
 * Optional apps/<game>/ui.skin.json: per-game art and colour for the shared UI only.
 * Any position or structure key is rejected.
 */
export function validateSkin(input: unknown, ui: UiFile | null): UiIssue[] {
	const issues: UiIssue[] = [];
	const error = (message: string) => issues.push({ level: 'error', code: 'ui-skin', message });
	if (!isRecord(input)) return [{ level: 'error', code: 'ui-skin', message: 'ui.skin.json must be an object' }];
	for (const key of Object.keys(input)) {
		if (!SKIN_KEYS.includes(key)) error(`ui.skin.json: "${key}" is not allowed (art and colour only, no position or structure)`);
	}
	const known = (id: string) =>
		!ui || id in ui.items || id in ui.popups || id in ui.modals || id in ui.loading;
	for (const field of ['colors', 'art'] as const) {
		const map = input[field];
		if (map === undefined) continue;
		if (!isRecord(map)) {
			error(`ui.skin.json ${field} must be an object`);
			continue;
		}
		for (const [id, value] of Object.entries(map)) {
			if (!known(id)) error(`ui.skin.json ${field}.${id}: not a shared UI id`);
			if (!isRecord(value)) {
				error(`ui.skin.json ${field}.${id} must be an object of ${field === 'colors' ? 'colours' : 'asset paths'}`);
				continue;
			}
			for (const [slot, entry] of Object.entries(value)) {
				if (field === 'colors' && (typeof entry !== 'string' || !COLOR.test(entry))) {
					error(`ui.skin.json colors.${id}.${slot} must be #rrggbb or #rrggbbaa`);
				}
				if (field === 'art') {
					const problem = typeof entry === 'string' ? assetPathError(entry) : 'must be a path string';
					if (problem) error(`ui.skin.json art.${id}.${slot}: ${problem}`);
				}
			}
		}
	}
	return issues;
}

export { GENERIC_EVENTS };
