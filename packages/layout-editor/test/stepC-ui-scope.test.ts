/**
 * Step C, part 2: the shared ui.json validator (scope rules, audio, pins, clamps, skin).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
	clampUiOverride,
	pinIssues,
	scopeOf,
	validateSkin,
	validateUiFile,
	type UiFile,
} from '../../ui-builder/src/ui.schema';
import {
	GAME_DATA_FIELDS,
	GENERIC_EVENTS,
	GENERIC_FIELDS,
	UNCLASSIFIED_EVENTS,
	eventScope,
} from '../../ui-builder/scopes.mjs';
import { fieldClassOf } from '../../ui-builder/src/ui.schema';
import os from 'node:os';
import { runGameCheck } from '../src/check/game-check';
import { createEchoTracker } from '../src/plugin/echo';
import { contentHash } from '../src/plugin/hash';
import { saveUi } from '../src/plugin/ui-files';
import type { BuilderFile } from '../src/builder.schema';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const readJson = <T>(rel: string) => JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8')) as T;
const shared = readJson<UiFile>('packages/ui-builder/ui.json');
type CatalogueEvent = {
	type: string;
	scope: string;
	fieldPaths: string[];
	genericFields?: string[];
	gameDataFields?: string[];
};
const catalogue = readJson<{ events: CatalogueEvent[] }>('apps/locked/dev/event-catalogue.json');
const codes = (issues: { code: string; level: string }[]) => issues.filter((i) => i.level === 'error').map((i) => i.code);

describe('event catalogue scope', () => {
	it('tags every event with generic or game', () => {
		expect(catalogue.events.length).toBeGreaterThan(0);
		for (const event of catalogue.events) expect(['generic', 'game']).toContain(event.scope);
	});

	it('uses the free-spin names found in the books', () => {
		const types = catalogue.events.map((event) => event.type);
		expect(types).toContain('updateFreeSpin');
		expect(types).toContain('freeSpinEnd');
		expect(eventScope('updateFreeSpin')).toBe('generic');
		expect(eventScope('freeSpinEnd')).toBe('generic');
		expect(eventScope('tumbleBoard')).toBe('game');
		// SlotMath Dev follow-up: freeSpinRetrigger is generic, in scopes.mjs and the generated catalogue
		expect(UNCLASSIFIED_EVENTS).toEqual([]);
		expect(eventScope('freeSpinRetrigger')).toBe('generic');
		expect(catalogue.events.find((event) => event.type === 'freeSpinRetrigger')?.scope).toBe('generic');
		for (const type of GENERIC_EVENTS) expect(types).toContain(type);
	});
});

describe('generic field allowlist', () => {
	const warnings = (issues: { code: string; level: string }[]) =>
		issues.filter((issue) => issue.level === 'warning').map((issue) => issue.code);
	const withBinding = (binding: Record<string, unknown>) => {
		const file = structuredClone(shared);
		file.bindings = [{ target: 'controlBar.win', action: 'pulse', ...binding } as UiFile['bindings'][number]];
		return validateUiFile(file, { catalogue });
	};

	it('lists only field names that exist in the books', () => {
		for (const [type, list] of Object.entries({ ...GENERIC_FIELDS })) {
			const event = catalogue.events.find((entry) => entry.type === type)!;
			expect(event.scope).toBe('generic');
			for (const field of list) expect(event.fieldPaths).toContain(field);
			expect(event.genericFields).toEqual(list);
		}
		for (const [type, list] of Object.entries({ ...GAME_DATA_FIELDS })) {
			const event = catalogue.events.find((entry) => entry.type === type)!;
			for (const field of list) expect(event.fieldPaths).toContain(field);
		}
		expect(GENERIC_FIELDS.reveal).toEqual(['gameType', 'anticipation']);
		expect(GENERIC_FIELDS.winInfo).toEqual(['totalWin', 'wins.win', 'wins.multiplier']);
		expect(GAME_DATA_FIELDS.reveal).toEqual(['board', 'paddingPositions']);
		expect(GAME_DATA_FIELDS.winInfo).toEqual(['wins.symbol', 'wins.kind', 'wins.meta', 'wins.positions']);
		expect(GAME_DATA_FIELDS.freeSpinTrigger).toEqual(['positions']);
		expect(GAME_DATA_FIELDS.freeSpinRetrigger).toEqual(['positions']);
		for (const type of GENERIC_EVENTS) expect(GENERIC_FIELDS[type]).toBeDefined();
	});

	it('classifies fields, including array paths', () => {
		expect(fieldClassOf('reveal', undefined, catalogue)).toBe('event');
		expect(fieldClassOf('reveal', 'anticipation', catalogue)).toBe('generic');
		expect(fieldClassOf('reveal', 'anticipation[3]', catalogue)).toBe('generic');
		expect(fieldClassOf('reveal', 'board', catalogue)).toBe('game-data');
		expect(fieldClassOf('reveal', 'board[0][1].name', catalogue)).toBe('game-data');
		expect(fieldClassOf('reveal', 'paddingPositions', catalogue)).toBe('game-data');
		expect(fieldClassOf('winInfo', 'totalWin', catalogue)).toBe('generic');
		expect(fieldClassOf('winInfo', 'wins[0].symbol', catalogue)).toBe('game-data');
		expect(fieldClassOf('winInfo', 'wins[].symbol', catalogue)).toBe('game-data');
		expect(fieldClassOf('winInfo', 'wins', catalogue)).toBe('not-allowlisted');
		expect(fieldClassOf('winInfo', 'wins[0].win', catalogue)).toBe('generic');
		expect(fieldClassOf('winInfo', 'wins[].multiplier', catalogue)).toBe('generic');
		expect(fieldClassOf('winInfo', 'wins[0].kind', catalogue)).toBe('game-data');
		expect(fieldClassOf('winInfo', 'wins[].meta.ways', catalogue)).toBe('game-data');
		expect(fieldClassOf('winInfo', 'wins[2].positions[0].reel', catalogue)).toBe('game-data');
		expect(fieldClassOf('freeSpinTrigger', 'positions', catalogue)).toBe('game-data');
		expect(fieldClassOf('freeSpinRetrigger', 'positions[].row', catalogue)).toBe('game-data');
		expect(fieldClassOf('freeSpinRetrigger', 'totalFs', catalogue)).toBe('generic');
		// without a catalogue the shared table in scopes.mjs applies
		expect(fieldClassOf('winInfo', 'wins.symbol')).toBe('game-data');
	});

	it('warns (does not block) on game-data and non-generic fields of generic events', () => {
		expect(codes(withBinding({ bookEvent: 'reveal' }))).toEqual([]);
		expect(warnings(withBinding({ bookEvent: 'reveal' }))).toEqual([]);
		expect(warnings(withBinding({ bookEvent: 'reveal', field: 'anticipation' }))).toEqual([]);
		expect(warnings(withBinding({ bookEvent: 'winInfo', field: 'totalWin' }))).toEqual([]);
		expect(warnings(withBinding({ bookEvent: 'freeSpinRetrigger', field: 'totalFs' }))).toEqual([]);
		expect(warnings(withBinding({ bookEvent: 'winInfo', fields: ['wins[].win', 'wins[].multiplier'] }))).toEqual([]);

		for (const binding of [
			{ bookEvent: 'reveal', field: 'board' },
			{ bookEvent: 'reveal', field: 'paddingPositions' },
			{ bookEvent: 'winInfo', field: 'wins[0].symbol' },
			{ bookEvent: 'winInfo', field: 'wins[].kind' },
			{ bookEvent: 'winInfo', field: 'wins[].meta' },
			{ bookEvent: 'winInfo', field: 'wins[].positions' },
			{ bookEvent: 'freeSpinTrigger', field: 'positions' },
			{ bookEvent: 'freeSpinRetrigger', field: 'positions' },
		]) {
			const issues = withBinding(binding);
			expect(codes(issues)).toEqual([]);
			expect(warnings(issues)).toEqual(['ui-game-data-field']);
		}
		const other = withBinding({ bookEvent: 'reveal', fields: ['gameType', 'wins.win'] });
		expect(codes(other)).toEqual([]);
		expect(warnings(other)).toEqual(['ui-field-not-generic']);
		// game events are still rejected outright
		expect(codes(withBinding({ bookEvent: 'tumbleBoard', field: 'newSymbols' }))).toContain('ui-scope-game');
	});

	it('saves from the UI tab with the warning in the response', async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-save-'));
		const raw = fs.readFileSync(path.join(repoRoot, 'packages/ui-builder/ui.json'), 'utf8');
		fs.writeFileSync(path.join(dir, 'ui.json'), raw);
		const data = structuredClone(shared);
		data.version = '1.1.0';
		data.bindings = [{ bookEvent: 'reveal', field: 'board', target: 'controlBar.spin', action: 'pulse' }];
		const result = await saveUi({ uiDir: dir, data, baseHash: contentHash(raw), catalogue, echo: createEchoTracker() });
		expect(result.status).toBe(200);
		const body = result.body as { warnings: { code: string }[] };
		expect(body.warnings.map((warning) => warning.code)).toEqual(['ui-game-data-field']);
		expect(JSON.parse(fs.readFileSync(path.join(dir, 'ui.json'), 'utf8')).bindings[0].field).toBe('board');
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it('leaves the game builder.json alone', () => {
		const builder = readJson<BuilderFile>('apps/locked/src/game/builder.json');
		const result = runGameCheck({
			builder,
			catalogue,
			uiHead: shared,
			uiReleases: { '1.0.0': readJson<UiFile>('packages/ui-builder/releases/1.0.0.json') },
		});
		expect(result.issues.some((issue) => issue.code.startsWith('ui-game-data') || issue.code === 'ui-field-not-generic')).toBe(false);
	});

	it('surfaces the warning in builder:check (runGameCheck) without an error', () => {
		const head = structuredClone(shared);
		head.version = '1.1.0';
		head.bindings = [{ bookEvent: 'winInfo', field: 'wins[].symbol', target: 'controlBar.win', action: 'pulse' }];
		const result = runGameCheck({
			builder: readJson<BuilderFile>('apps/locked/src/game/builder.json'),
			catalogue,
			uiHead: head,
			uiReleases: { '1.0.0': shared },
		});
		expect(codes(result.issues)).toEqual([]);
		expect(result.issues.some((issue) => issue.level === 'warning' && issue.code === 'ui-game-data-field')).toBe(true);
	});
});

describe('ui.json validation', () => {
	it('accepts the committed ui.json', () => {
		expect(codes(validateUiFile(shared, { catalogue }))).toEqual([]);
	});

	it('rejects scope:game bindings and allows generic ones', () => {
		const bad = structuredClone(shared);
		bad.bindings = [{ bookEvent: 'tumbleBoard', target: 'controlBar.win', action: 'pulse' }];
		expect(codes(validateUiFile(bad, { catalogue }))).toContain('ui-scope-game');
		expect(scopeOf('tumbleBoard', catalogue)).toBe('game');

		const good = structuredClone(shared);
		good.bindings = [{ bookEvent: 'updateFreeSpin', target: 'controlBar.win', action: 'pulse' }];
		expect(codes(validateUiFile(good, { catalogue }))).toEqual([]);

		const nested = structuredClone(shared) as UiFile & { popups: Record<string, unknown> };
		(nested.popups.betMenu as Record<string, unknown>).onEvent = { bookEvent: 'fireFramesPlaced' };
		expect(codes(validateUiFile(nested, { catalogue }))).toContain('ui-scope-game');

		const unknown = structuredClone(shared);
		unknown.bindings = [{ bookEvent: 'freeSpinCounter', target: 'x', action: 'y' }];
		expect(codes(validateUiFile(unknown, { catalogue }))).toContain('ui-unknown-event');
	});

	it('allows UI interaction sounds and rejects book-event sounds', () => {
		const ok = structuredClone(shared);
		ok.audio.interactions = { click: { cue: 'ui_click' }, popupOpen: { cue: 'ui_open' } };
		expect(codes(validateUiFile(ok, { catalogue }))).toEqual([]);

		const book = structuredClone(shared) as UiFile & { audio: Record<string, unknown> };
		book.audio.events = { updateFreeSpin: { cue: 'x' } };
		expect(codes(validateUiFile(book, { catalogue }))).toContain('ui-book-sound');

		const odd = structuredClone(shared) as UiFile & { audio: { interactions: Record<string, unknown> } };
		odd.audio.interactions.reelStop = { cue: 'x' };
		expect(codes(validateUiFile(odd, { catalogue }))).toContain('ui-interaction');
	});

	it('checks the pin and refuses silent edits under a released version', () => {
		expect(codes(pinIssues({ head: shared, releases: { '1.0.0': shared }, pin: '1.0.0' }))).toEqual([]);
		expect(codes(pinIssues({ head: shared, releases: { '1.0.0': shared }, pin: undefined }))).toContain('ui-pin');
		expect(codes(pinIssues({ head: shared, releases: { '1.0.0': shared }, pin: '9.9.9' }))).toContain('ui-pin');
		const drift = structuredClone(shared);
		drift.guardRails.controlBar.desktop = 120;
		expect(codes(pinIssues({ head: drift, releases: { '1.0.0': shared }, pin: '1.0.0' }))).toContain('ui-unreleased-change');
		drift.version = '1.1.0';
		expect(codes(pinIssues({ head: drift, releases: { '1.0.0': shared }, pin: '1.0.0' }))).toEqual([]);
	});

	it('clamps game overrides by the guard rails', () => {
		expect(clampUiOverride(shared, 'controlBar.band', 'desktop', { h: 50 }).value.h).toBe(110);
		const spin = clampUiOverride(shared, 'controlBar.spin', 'mobileM', { y: 10, scale: 0.1 });
		expect(spin.flags.length).toBeGreaterThan(0);
		expect(spin.value.y).toBeGreaterThan(10);
	});

	it('limits ui.skin.json to art and colour', () => {
		expect(codes(validateSkin(readJson('apps/locked/ui.skin.json'), shared))).toEqual([]);
		expect(codes(validateSkin({ colors: { 'controlBar.spin': { fill: '#ff0000' } } }, shared))).toEqual([]);
		expect(codes(validateSkin({ layout: {} }, shared))).toContain('ui-skin');
		expect(codes(validateSkin({ colors: { 'controlBar.spin': { fill: 'red' } } }, shared))).toContain('ui-skin');
	});

	it('runs the game check on the Locked In files without errors', () => {
		const builder = readJson<BuilderFile>('apps/locked/src/game/builder.json');
		const result = runGameCheck({
			builder,
			catalogue,
			uiHead: shared,
			uiReleases: { '1.0.0': readJson<UiFile>('packages/ui-builder/releases/1.0.0.json') },
			skin: readJson('apps/locked/ui.skin.json'),
		});
		expect(codes(result.issues)).toEqual([]);
	});
});
