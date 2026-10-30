/**
 * Generate dev/event-catalogue.json and dev/builder_rounds.json from the
 * zstd books and MATH_EVENTS.md. Generated on purpose: SlotMath Dev can
 * replace both files. They are not written into builder.json.
 *
 * Only event types that occur in the books are emitted. FS3/FS4/FS5 are
 * tags, not events.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { GAME_DATA_FIELDS, GENERIC_FIELDS, UNCLASSIFIED_EVENTS, eventScope } from '../../ui-builder/scopes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const booksDir = path.join(root, 'apps/locked/fixtures/books');
const mathPath = path.join(root, 'apps/locked/MATH_EVENTS.md');
const outDir = path.join(root, 'apps/locked/dev');

const LEGACY = new Set([
	'wildUpgrade',
	'expandWild',
	'wildMultiplier',
	'updateExpandingWilds',
	'createBonusSnapshot',
]);

function mathNames(markdown) {
	const found = new Set();
	for (const match of markdown.matchAll(/^##\s+([a-z][A-Za-z0-9]+)/gm)) found.add(match[1]);
	for (const match of markdown.matchAll(/"type":\s*"([a-z][A-Za-z0-9]+)"/g)) found.add(match[1]);
	return found;
}

function tagsFor(row, mode) {
	const tags = new Set();
	if (mode === 'degen_spin') tags.add('degen_spin');
	if (row.payoutMultiplier === 0 || row.criteria === '0') tags.add('dead');
	if (row.criteria === 'wincap') tags.add('wincap');
	for (const event of row.events) {
		if (LEGACY.has(event.type)) continue;
		if (event.type === 'contrabandSwap') tags.add('contrabandSwap');
		if (event.type === 'newExpandingWilds') {
			tags.add('expandingWild');
			for (const wild of event.newWilds ?? []) {
				if (typeof wild.mult === 'number') tags.add(`mult:${wild.mult}`);
			}
		}
		if (event.type === 'freeSpinRetrigger') tags.add('retrigger');
		if (event.type === 'wincap') tags.add('wincap');
		if (event.type === 'setWin' && typeof event.winLevel === 'number') tags.add(`winlevel:${event.winLevel}`);
		if (event.type === 'freeSpinTrigger' && typeof event.totalFs === 'number') {
			if (event.totalFs === 5) tags.add('FS3');
			else if (event.totalFs === 8) tags.add('FS4');
			else if (event.totalFs === 12) tags.add('FS5');
			else if (event.totalFs >= 15) tags.add('FS6');
		}
	}
	return [...tags].sort();
}

const markdown = fs.readFileSync(mathPath, 'utf8');
const documented = mathNames(markdown);
const index = JSON.parse(fs.readFileSync(path.join(booksDir, 'index.json'), 'utf8'));

const fields = new Map();
const counts = new Map();
/** Step C: nested payload paths per event (dotted, array steps dropped), for the field allowlist. */
const paths = new Map();
function collectPaths(set, value, prefix) {
	if (Array.isArray(value)) {
		for (const entry of value) collectPaths(set, entry, prefix);
		return;
	}
	if (value === null || typeof value !== 'object') return;
	for (const [key, entry] of Object.entries(value)) {
		const next = prefix ? `${prefix}.${key}` : key;
		set.add(next);
		collectPaths(set, entry, next);
	}
}
const modes = {};

for (const mode of index.modes) {
	const file = path.join(booksDir, mode.events);
	const text = zlib.zstdDecompressSync(fs.readFileSync(file)).toString('utf8');
	const rounds = [];
	const samples = [];
	const covered = new Set();
	for (const line of text.split('\n')) {
		if (!line) continue;
		const row = JSON.parse(line);
		const tags = tagsFor(row, mode.name);
		rounds.push({
			id: row.id,
			criteria: row.criteria,
			payoutMultiplier: row.payoutMultiplier,
			tags,
		});
		for (const event of row.events) {
			if (LEGACY.has(event.type)) continue;
			counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
			const set = fields.get(event.type) ?? new Set();
			for (const key of Object.keys(event)) {
				if (key !== 'type' && key !== 'index') set.add(key);
			}
			fields.set(event.type, set);
			const nested = paths.get(event.type) ?? new Set();
			const { type: _type, index: _index, ...payload } = event;
			collectPaths(nested, payload, '');
			paths.set(event.type, nested);
		}
		const fresh = tags.filter((tag) => !covered.has(tag));
		if (fresh.length) {
			for (const tag of fresh) covered.add(tag);
			samples.push({
				id: row.id,
				criteria: row.criteria,
				payoutMultiplier: row.payoutMultiplier,
				tags,
				events: row.events.filter((event) => !LEGACY.has(event.type)),
			});
		}
	}
	modes[mode.name] = { cost: mode.cost, rounds, samples };
	console.log(`${mode.name}: ${rounds.length} rounds, ${samples.length} samples`);
}

const events = [...fields.keys()].sort().map((type) => ({
	type,
	count: counts.get(type),
	fields: [...fields.get(type)].sort(),
	inMathEvents: documented.has(type),
	// Step C: generic events may be bound by the shared ui.json, game events only by builder.json.
	scope: eventScope(type),
	...(UNCLASSIFIED_EVENTS.includes(type) ? { scopeNote: 'not classified in the spec; defaulted to game' } : {}),
	fieldPaths: [...paths.get(type)].sort(),
	// Step C follow-up: ui.json may bind only these fields of a generic event; gameDataFields are symbol data.
	...(eventScope(type) === 'generic'
		? { genericFields: [...(GENERIC_FIELDS[type] ?? [])], gameDataFields: [...(GAME_DATA_FIELDS[type] ?? [])] }
		: {}),
}));

for (const event of events) {
	for (const field of [...(event.genericFields ?? []), ...(event.gameDataFields ?? [])]) {
		if (!event.fieldPaths.includes(field)) console.warn(`warning: ${event.type}.${field} is listed in scopes.mjs but not in the books`);
	}
}

const header = {
	generated: true,
	generator: 'pnpm builder:rounds',
	note: 'Generated from the Locked In book sample and MATH_EVENTS.md. SlotMath Dev can replace this file. It is not part of builder.json and must not be bundled.',
};

const catalogue = { ...header, events };
const rounds = { ...header, modes };

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'event-catalogue.json'), JSON.stringify(catalogue, null, '\t') + '\n');
fs.writeFileSync(path.join(outDir, 'builder_rounds.json'), JSON.stringify(rounds));
const roundStat = fs.statSync(path.join(outDir, 'builder_rounds.json'));
console.log(`events ${events.length}, builder_rounds ${roundStat.size} bytes`);
