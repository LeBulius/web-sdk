// @ts-check
/**
 * Book-event scope for the shared UI layer (specs/ui_split_and_orientation.md, SlotMath Dev
 * sign-off 2026-10-21 04:25 CEST).
 *
 * generic: events every Stake slot sends; ui.json may bind them, on their generic fields only.
 * game:    game-specific events; only a game's builder.json may bind them.
 *
 * Follow-up (SlotMath Dev, 2026-10-21 05:03 CEST): freeSpinRetrigger is generic; ui.json bindings
 * on generic events are limited to a per-event allowlist of generic fields. Symbol-carrying fields
 * (reveal.board, reveal.paddingPositions, the symbol ids in winInfo.wins) are game data. Field
 * names below were read from the books (tools/stepC_scan_fields.mjs, logs/stepC/80_scan_event_fields).
 *
 * The free-spin counter and end names were not typed from the spec: they were read from the
 * books (2026-10-21 scan of /workspace/lockedin_fe_test_sample, apps/locked/fixtures/books and
 * apps/locked/src/stories/data): `updateFreeSpin` {amount, total} and `freeSpinEnd`
 * {amount, winLevel}.
 */

/** @type {readonly string[]} */
export const GENERIC_EVENTS = [
	'reveal',
	'winInfo',
	'setWin',
	'setTotalWin',
	'finalWin',
	'wincap',
	'freeSpinTrigger',
	'freeSpinRetrigger',
	'updateFreeSpin',
	'freeSpinEnd',
];

/** Free-spin counter / end events as found in the books. */
export const FREE_SPIN_COUNTER_EVENT = 'updateFreeSpin';
export const FREE_SPIN_END_EVENT = 'freeSpinEnd';

/** Locked In game events named in the sign-off. */
/** @type {readonly string[]} */
export const LOCKED_GAME_EVENTS = [
	'fireFramesPlaced',
	'contrabandSwap',
	'newExpandingWilds',
	'tumbleBoard',
	'updateGrid',
];

/**
 * In the books but not classified by the spec (defaulted to `game`). Empty since SlotMath Dev
 * classified freeSpinRetrigger as generic.
 * @type {readonly string[]}
 */
export const UNCLASSIFIED_EVENTS = [];

/**
 * Generic fields per generic event: the only payload fields ui.json may bind. A binding with no
 * `field` binds the event itself (e.g. reveal = spin start). Paths are dotted, array steps
 * dropped: `wins.symbol` means every wins[i].symbol.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const GENERIC_FIELDS = {
	reveal: ['gameType', 'anticipation'],
	winInfo: ['totalWin', 'wins.win', 'wins.multiplier'],
	setWin: ['amount', 'winLevel'],
	setTotalWin: ['amount'],
	finalWin: ['amount'],
	wincap: ['amount'],
	freeSpinTrigger: ['totalFs'],
	freeSpinRetrigger: ['totalFs'],
	updateFreeSpin: ['amount', 'total'],
	freeSpinEnd: ['amount', 'winLevel'],
};

/**
 * Game data of generic events (symbol-carrying fields, plus fields SlotMath Dev marked game data):
 * ui.json binding them gives a ui-game-data-field warning.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const GAME_DATA_FIELDS = {
	reveal: ['board', 'paddingPositions'],
	// SlotMath Dev 05:09: wins[].kind/meta/positions and trigger positions are game data too.
	winInfo: ['wins.symbol', 'wins.kind', 'wins.meta', 'wins.positions'],
	freeSpinTrigger: ['positions'],
	freeSpinRetrigger: ['positions'],
};

/** `wins[0].symbol` / `wins[].symbol` → `wins.symbol`. @param {string} field */
export const normalizeField = (field) => field.replace(/\[[^\]]*\]/g, '').replace(/^\.+|\.+$/g, '');

const under = (/** @type {string} */ field, /** @type {string} */ base) => field === base || field.startsWith(`${base}.`);

/**
 * How ui.json may use a field of a book event.
 * @param {string} type
 * @param {string | undefined} field
 * @returns {'event' | 'generic' | 'game-data' | 'not-allowlisted'}
 */
export function fieldClass(type, field) {
	if (!field) return 'event';
	const path = normalizeField(field);
	if ((GAME_DATA_FIELDS[type] ?? []).some((base) => under(path, base))) return 'game-data';
	if ((GENERIC_FIELDS[type] ?? []).some((base) => under(path, base))) return 'generic';
	return 'not-allowlisted';
}

/**
 * @param {string} type
 * @returns {'generic' | 'game'}
 */
export function eventScope(type) {
	return GENERIC_EVENTS.includes(type) ? 'generic' : 'game';
}
