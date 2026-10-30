import { stateBet } from 'state-shared';

import type { BonusModeKey } from '../game/bonusMeta';
import type { Bet, BookEvent } from '../game/typesBookEvent';
import { playBet } from '../game/utils';
import type { StoryBook, StoryBookEvent } from './pickStoryBook';

import anteBooks from './data/ante_books.json';
import baseBooks from './data/base_books.json';
import bonusBooks from './data/bonus_books.json';
import bonusMysteryBooks from './data/bonus_mystery_books.json';
import bonusSuperBooks from './data/bonus_super_books.json';
import degenSpinBooks from './data/degen_spin_books.json';

/** Event types that appear in published books. Legacy wildUpgrade / expandWild / wildMultiplier do not. */
export const BOOK_EVENT_STORY_TYPES = [
	'reveal',
	'winInfo',
	'setWin',
	'setTotalWin',
	'tumbleBoard',
	'updateGrid',
	'fireFramesPlaced',
	'newExpandingWilds',
	'contrabandSwap',
	'freeSpinTrigger',
	'freeSpinRetrigger',
	'updateFreeSpin',
	'freeSpinEnd',
	'finalWin',
	'wincap',
] as const;

export type BookEventStoryType = (typeof BOOK_EVENT_STORY_TYPES)[number];

export const EXAMPLES_PER_EVENT = 10;

const MODE_ORDER: BonusModeKey[] = [
	'base',
	'ante',
	'bonus',
	'bonus_super',
	'bonus_mystery',
	'degen_spin',
];

const BOOK_SOURCES: { mode: BonusModeKey; books: StoryBook[] }[] = [
	{ mode: 'base', books: baseBooks as StoryBook[] },
	{ mode: 'ante', books: anteBooks as StoryBook[] },
	{ mode: 'bonus', books: bonusBooks as StoryBook[] },
	{ mode: 'bonus_super', books: bonusSuperBooks as StoryBook[] },
	{ mode: 'bonus_mystery', books: bonusMysteryBooks as StoryBook[] },
	{ mode: 'degen_spin', books: degenSpinBooks as StoryBook[] },
];

const SPIN_SETUP_TYPES = new Set(['fireFramesPlaced', 'updateGrid', 'updateFreeSpin']);
const FEATURE_TAKEOVER_TYPES = new Set([
	'freeSpinTrigger',
	'freeSpinRetrigger',
	'freeSpinEnd',
	'wincap',
]);

export type EventStoryRef = {
	type: BookEventStoryType;
	n: number;
};

export type EventStoryPick = {
	type: BookEventStoryType;
	mode: BonusModeKey;
	bookId: number | string;
	criteria: string;
	eventIndex: number;
	events: StoryBookEvent[];
	book: StoryBook;
};

type Candidate = {
	mode: BonusModeKey;
	book: StoryBook;
	eventIndex: number;
	diversityKey: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const asNumber = (value: unknown, fallback = 0) =>
	typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);

const amountBucket = (amount: number) => {
	if (amount <= 0) return '0';
	if (amount < 20) return 'xs';
	if (amount < 100) return 's';
	if (amount < 500) return 'm';
	if (amount < 5000) return 'l';
	return 'xl';
};

const maxGridMult = (event: StoryBookEvent) => {
	const grid = event.gridMultipliers;
	if (!Array.isArray(grid)) return 1;
	let max = 1;
	for (const reel of grid) {
		if (!Array.isArray(reel)) continue;
		for (const cell of reel) {
			if (typeof cell === 'number' && cell > max) max = cell;
		}
	}
	return max;
};

const revealSpecials = (event: StoryBookEvent) => {
	const board = event.board;
	if (!Array.isArray(board)) return 'plain';
	const names = new Set<string>();
	for (const reel of board) {
		if (!Array.isArray(reel)) continue;
		for (const cell of reel) {
			const row = asRecord(cell);
			if (row?.name) names.add(String(row.name));
		}
	}
	const specials = ['S', 'EW', 'C', 'W'].filter((name) => names.has(name));
	return specials.length ? specials.join('+') : 'plain';
};

const diversityKey = (type: BookEventStoryType, event: StoryBookEvent) => {
	if (type === 'reveal') {
		return `${asString(event.gameType, 'basegame')}:${revealSpecials(event)}`;
	}
	if (type === 'winInfo') {
		const wins = Array.isArray(event.wins) ? event.wins : [];
		const first = asRecord(wins[0]);
		return `${asString(first?.symbol, 'none')}:n${wins.length}:w${amountBucket(asNumber(event.totalWin))}`;
	}
	if (type === 'setWin' || type === 'freeSpinEnd') {
		return `lv${asNumber(event.winLevel)}`;
	}
	if (type === 'setTotalWin' || type === 'finalWin' || type === 'wincap') {
		return amountBucket(asNumber(event.amount));
	}
	if (type === 'tumbleBoard') {
		const holes = Array.isArray(event.explodingSymbols) ? event.explodingSymbols.length : 0;
		const incoming = Array.isArray(event.newSymbols) ? event.newSymbols.flat() : [];
		const hasEw = incoming.some((cell) => asRecord(cell)?.name === 'EW');
		return `h${holes}:${hasEw ? 'ew' : 'plain'}`;
	}
	if (type === 'updateGrid') {
		return `max${maxGridMult(event)}`;
	}
	if (type === 'fireFramesPlaced') {
		const next = Array.isArray(event.newPositions) ? event.newPositions.length : 0;
		const all = Array.isArray(event.positions) ? event.positions.length : 0;
		return `new${next}:all${all}`;
	}
	if (type === 'newExpandingWilds') {
		const wilds = Array.isArray(event.newWilds) ? event.newWilds : [];
		const first = asRecord(wilds[0]);
		return `r${asNumber(first?.reel)}:m${asNumber(first?.mult)}:n${wilds.length}`;
	}
	if (type === 'contrabandSwap') {
		const from = asRecord(event.from);
		const to = asRecord(event.to);
		const positions = Array.isArray(event.positions) ? event.positions.length : 1;
		return `${asString(from?.symbol)}>${asString(to?.symbol)}:n${positions}`;
	}
	if (type === 'freeSpinTrigger' || type === 'freeSpinRetrigger') {
		const positions = Array.isArray(event.positions) ? event.positions.length : 0;
		return `fs${asNumber(event.totalFs)}:p${positions}`;
	}
	if (type === 'updateFreeSpin') {
		return `${asNumber(event.amount)}/${asNumber(event.total)}`;
	}
	return type;
};

const indexesOfType = (book: StoryBook, type: BookEventStoryType) =>
	book.events.flatMap((event, index) => (event.type === type ? [index] : []));

const chooseIndexes = (type: BookEventStoryType, book: StoryBook, indexes: number[]) => {
	if (!indexes.length) return [];

	if (type === 'reveal') {
		const first = indexes[0]!;
		const firstFreegame = indexes.find(
			(index) => asString(book.events[index]?.gameType) === 'freegame',
		);
		return firstFreegame != null && firstFreegame !== first ? [first, firstFreegame] : [first];
	}

	if (type === 'fireFramesPlaced') {
		const first = indexes[0]!;
		const withNew = indexes.find(
			(index) => (Array.isArray(book.events[index]?.newPositions) ? book.events[index]?.newPositions.length : 0) > 0,
		);
		return withNew != null && withNew !== first ? [first, withNew] : [first];
	}

	if (type === 'updateGrid') {
		const first = indexes[0]!;
		const risen = indexes.find((index) => maxGridMult(book.events[index]!) > 1);
		return risen != null && risen !== first ? [first, risen] : [first];
	}

	if (type === 'setWin' || type === 'freeSpinEnd') {
		const seen = new Set<number>();
		const picks: number[] = [];
		for (const index of indexes) {
			const level = asNumber(book.events[index]?.winLevel);
			if (seen.has(level)) continue;
			seen.add(level);
			picks.push(index);
		}
		return picks;
	}

	if (type === 'winInfo') {
		const withWins = indexes.find((index) => {
			const wins = book.events[index]?.wins;
			return Array.isArray(wins) && wins.length > 0;
		});
		return [withWins ?? indexes[0]!];
	}

	if (type === 'setTotalWin') {
		const nonzero = indexes.find((index) => asNumber(book.events[index]?.amount) > 0);
		return [nonzero ?? indexes[0]!];
	}

	return [indexes[0]!];
};

const collectCandidates = (type: BookEventStoryType) => {
	const candidates: Candidate[] = [];
	for (const { mode, books } of BOOK_SOURCES) {
		for (const book of books) {
			const indexes = chooseIndexes(type, book, indexesOfType(book, type));
			for (const eventIndex of indexes) {
				const event = book.events[eventIndex];
				if (!event) continue;
				candidates.push({
					mode,
					book,
					eventIndex,
					diversityKey: diversityKey(type, event),
				});
			}
		}
	}
	return candidates;
};

const interestingScore = (type: BookEventStoryType, candidate: Candidate) => {
	const event = candidate.book.events[candidate.eventIndex];
	if (!event) return 0;
	if (type === 'setWin' || type === 'freeSpinEnd') return asNumber(event.winLevel);
	if (type === 'fireFramesPlaced') {
		return Array.isArray(event.newPositions) ? event.newPositions.length : 0;
	}
	if (type === 'updateGrid') return maxGridMult(event);
	if (type === 'setTotalWin' || type === 'finalWin') return asNumber(event.amount) > 0 ? 1 : 0;
	if (type === 'reveal') return revealSpecials(event) === 'plain' ? 0 : 1;
	return 0;
};

const selectExamples = (candidates: Candidate[], count: number, type: BookEventStoryType) => {
	const queues = MODE_ORDER.map((mode) =>
		candidates
			.filter((candidate) => candidate.mode === mode)
			.sort((left, right) => {
				const interest = interestingScore(type, right) - interestingScore(type, left);
				if (interest !== 0) return interest;
				const leftLen = sliceForEvent(left.book.events, left.eventIndex).length;
				const rightLen = sliceForEvent(right.book.events, right.eventIndex).length;
				if (leftLen !== rightLen) return leftLen - rightLen;
				if (left.diversityKey !== right.diversityKey) {
					return left.diversityKey.localeCompare(right.diversityKey);
				}
				return String(left.book.id).localeCompare(String(right.book.id), undefined, {
					numeric: true,
				});
			}),
	);

	const picked: Candidate[] = [];
	const usedBooks = new Map<string, number>();
	const usedKeys = new Set<string>();
	const bookKey = (candidate: Candidate) => `${candidate.mode}:${candidate.book.id}`;
	const canTake = (candidate: Candidate) => (usedBooks.get(bookKey(candidate)) ?? 0) < 2;

	const takeFromQueues = (predicate: (candidate: Candidate) => boolean) => {
		let progressed = true;
		while (picked.length < count && progressed) {
			progressed = false;
			for (const queue of queues) {
				if (picked.length >= count) break;
				const index = queue.findIndex((candidate) => canTake(candidate) && predicate(candidate));
				if (index < 0) continue;
				const [candidate] = queue.splice(index, 1);
				if (!candidate) continue;
				usedBooks.set(bookKey(candidate), (usedBooks.get(bookKey(candidate)) ?? 0) + 1);
				usedKeys.add(candidate.diversityKey);
				picked.push(candidate);
				progressed = true;
			}
		}
	};

	takeFromQueues((candidate) => !usedKeys.has(candidate.diversityKey));
	takeFromQueues(() => true);

	for (const queue of queues) {
		while (picked.length < count && queue.length) {
			const candidate = queue.shift();
			if (!candidate || !canTake(candidate)) continue;
			usedBooks.set(bookKey(candidate), (usedBooks.get(bookKey(candidate)) ?? 0) + 1);
			picked.push(candidate);
		}
	}

	return picked;
};

/** Play from the spin that contains the event, not an isolated payload. */
export const sliceForEvent = (events: StoryBookEvent[], targetIndex: number) => {
	const target = events[targetIndex];
	if (!target) return [];

	if (target.type === 'updateFreeSpin') {
		let end = targetIndex;
		for (let index = targetIndex + 1; index < events.length; index += 1) {
			const next = events[index];
			if (!next) break;
			if (next.type === 'reveal') {
				end = index;
				break;
			}
			if (!SPIN_SETUP_TYPES.has(next.type)) break;
		}
		return events.slice(targetIndex, end + 1);
	}

	const firstReveal = events.findIndex((event) => event.type === 'reveal');
	if (firstReveal >= 0 && targetIndex < firstReveal) {
		return events.slice(0, firstReveal + 1);
	}

	let start = 0;
	for (let index = targetIndex; index >= 0; index -= 1) {
		if (events[index]?.type !== 'reveal') continue;
		start = index;
		while (start > 0 && SPIN_SETUP_TYPES.has(String(events[start - 1]?.type))) {
			start -= 1;
		}
		break;
	}

	const slice = events.slice(start, targetIndex + 1);
	if (FEATURE_TAKEOVER_TYPES.has(target.type)) return slice;
	return slice.filter((event) => !FEATURE_TAKEOVER_TYPES.has(event.type));
};

const toPick = (type: BookEventStoryType, candidate: Candidate): EventStoryPick => ({
	type,
	mode: candidate.mode,
	bookId: candidate.book.id ?? 'unknown',
	criteria: candidate.book.criteria ?? '',
	eventIndex: candidate.eventIndex,
	events: sliceForEvent(candidate.book.events, candidate.eventIndex),
	book: candidate.book,
});

const buildPicks = () => {
	const picks = {} as Record<BookEventStoryType, EventStoryPick[]>;
	for (const type of BOOK_EVENT_STORY_TYPES) {
		picks[type] = selectExamples(collectCandidates(type), EXAMPLES_PER_EVENT, type).map(
			(candidate) => toPick(type, candidate),
		);
	}
	return picks;
};

export const EVENT_STORY_PICKS = buildPicks();

export const getEventStory = (type: BookEventStoryType, n: number) => {
	const pool = EVENT_STORY_PICKS[type];
	if (!pool?.length) {
		throw new Error(`No published books contain ${type}`);
	}
	const pick = pool[n] ?? pool[n % pool.length];
	if (!pick) throw new Error(`Missing ${type} story ${n}`);
	return pick;
};

export const playEventStory = async (pick: EventStoryPick) => {
	stateBet.activeBetModeKey = pick.mode;
	console.log(
		`[bookEvent ${pick.type}] ${pick.mode} book ${pick.bookId} ${pick.criteria} event#${pick.eventIndex}`,
		pick.events.map((event) => event.type).join(' → '),
	);
	await playBet({
		...pick.book,
		state: pick.events as BookEvent[],
	} as Bet);
};
