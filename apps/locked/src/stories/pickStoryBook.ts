import { randomInteger } from 'utils-shared/random';

import { REEL_ROWS } from '../game/constants';
import { contrabandSwapBook } from './data/expanding_wild_events';

export type StoryBookEvent = { type: string; [key: string]: unknown };

export type StoryBook = {
	id?: number | string;
	criteria?: string;
	payoutMultiplier?: number;
	baseGameWins?: number;
	freeGameWins?: number;
	events: StoryBookEvent[];
};

const EW_TYPES = new Set([
	'newExpandingWilds',
	'expandWild',
	'wildUpgrade',
	'updateExpandingWilds',
]);

export const pickBook = <T extends StoryBook>(
	books: readonly T[],
	predicate?: (book: T) => boolean,
): T => {
	const pool = predicate ? books.filter(predicate) : [...books];
	if (!pool.length) {
		throw new Error('No Storybook books match this filter');
	}
	return pool[randomInteger({ min: 0, max: pool.length - 1 })];
};

export const isWincapBook = (book: StoryBook) => book.criteria === 'wincap';

export const isFreegameBook = (book: StoryBook, criteria?: string) => {
	if (criteria) return book.criteria === criteria;
	return String(book.criteria ?? '').startsWith('freegame');
};

export const isExpandingWildBook = (book: StoryBook) =>
	book.criteria === 'expanding_wild' || book.events.some((event) => EW_TYPES.has(event.type));

export const isFireFramesBook = (book: StoryBook) =>
	book.events.some((event) => {
		if (event.type !== 'fireFramesPlaced') return false;
		const placed = event as { positions?: unknown[]; newPositions?: unknown[] };
		return Boolean(placed.newPositions?.length || placed.positions?.length);
	});

export const isContrabandBook = (book: StoryBook) =>
	book.events.some((event) => event.type === 'contrabandSwap');

export const pickContrabandBook = <T extends StoryBook>(books: readonly T[]): T => {
	const pool = books.filter(isContrabandBook);
	if (pool.length) return pool[randomInteger({ min: 0, max: pool.length - 1 })];
	return contrabandSwapBook as T;
};

const LOW_SYMBOLS = new Set(['L1', 'L2', 'L3', 'L4', 'L5']);
const HIGH_SYMBOLS = new Set(['H1', 'H2', 'H3', 'H4']);

type SwapEvent = {
	type: string;
	from?: { symbol?: string };
	to?: { symbol?: string };
	positions?: { reel: number; row: number }[];
};

type RevealEvent = { type: string; board?: { name?: string }[][] };

/** Board rows are padded: event row 0 and row REEL_ROWS[reel] + 1 sit off-screen. */
const landsContrabandSymbol = (book: StoryBook) =>
	book.events.some((event) => {
		const reveal = event as RevealEvent;
		if (reveal.type !== 'reveal') return false;
		return (reveal.board ?? []).some((reel, reelIndex) =>
			reel.some(
				(cell, row) =>
					cell?.name === 'C' && row >= 1 && row <= (REEL_ROWS[reelIndex] ?? 0),
			),
		);
	});

const swapsLowForHigh = (book: StoryBook) =>
	book.events.some((event) => {
		const swap = event as SwapEvent;
		if (swap.type !== 'contrabandSwap') return false;
		return (
			LOW_SYMBOLS.has(String(swap.from?.symbol)) && HIGH_SYMBOLS.has(String(swap.to?.symbol))
		);
	});

const swapPositionCount = (book: StoryBook) => {
	const swap = book.events.find((event) => event.type === 'contrabandSwap') as SwapEvent | undefined;
	if (!swap) return 0;
	if (swap.positions?.length) return swap.positions.length;
	return 1;
};

/** A C lands on the visible board and a low is swapped for a high in the same round. */
export const isContrabandSymbolBook = (book: StoryBook) =>
	landsContrabandSymbol(book) && swapsLowForHigh(book);

/** Prefer a full-type swap (every cell of that low) with a visible C. */
export const pickContrabandSymbolBook = <T extends StoryBook>(books: readonly T[]): T => {
	const pool = books.filter(isContrabandSymbolBook);
	if (!pool.length) return pickContrabandBook(books);
	return pool.reduce((best, book) => {
		const bestCount = swapPositionCount(best);
		const nextCount = swapPositionCount(book);
		if (nextCount !== bestCount) return nextCount > bestCount ? book : best;
		return book.events.length < best.events.length ? book : best;
	});
};

export const isTumbleBook = (book: StoryBook) =>
	book.events.some((event) => event.type === 'tumbleBoard');

export const isTumbleInWildBook = (book: StoryBook) => {
	const firstWin = book.events.findIndex((event) => event.type === 'winInfo');
	if (firstWin < 0) return false;
	return book.events.some((event, index) => index > firstWin && tumbledWildFill(event) != null);
};

export const isBookId = (book: StoryBook, id: number | string) => String(book.id) === String(id);

type TumbleEvent = {
	type: string;
	explodingSymbols?: { reel: number; row: number }[];
	newSymbols?: { name?: string; wild?: boolean }[][];
};

const tumbledWildFill = (event: StoryBookEvent) => {
	const tumble = event as TumbleEvent;
	if (tumble.type !== 'tumbleBoard') return null;
	const rowsByReel = new Map<number, number[]>();
	for (const pos of tumble.explodingSymbols ?? []) {
		const rows = rowsByReel.get(pos.reel) ?? [];
		rows.push(pos.row);
		rowsByReel.set(pos.reel, rows);
	}
	for (const [reel, rows] of rowsByReel) {
		const sorted = [...new Set(rows)].sort((a, b) => a - b);
		const incoming = tumble.newSymbols?.[reel] ?? [];
		for (let i = 0; i < sorted.length; i += 1) {
			const name = incoming[i]?.name;
			if (name === 'W' || name === 'EW') {
				return { reel, row: sorted[i]!, fillIndex: i };
			}
		}
	}
	return null;
};

/**
 * After the first connection, land an EW in that tumble hole and expand the reel.
 * Keeps published id / criteria / payout so it still matches the lookup table.
 */
export const withTumbledExpandingWild = <T extends StoryBook>(book: T, multiplier = 10): T => {
	const events = structuredClone(book.events);
	const firstWin = events.findIndex((event) => event.type === 'winInfo');
	const tumbleAt = events.findIndex(
		(event, index) => index > firstWin && tumbledWildFill(event) != null,
	);
	const fill = tumbleAt >= 0 ? tumbledWildFill(events[tumbleAt]!) : null;
	if (tumbleAt < 0 || !fill) return book;

	const tumble = events[tumbleAt] as TumbleEvent;
	const incoming = tumble.newSymbols?.[fill.reel];
	if (incoming?.[fill.fillIndex]) {
		incoming[fill.fillIndex] = { name: 'EW', wild: true };
	}

	events.splice(tumbleAt + 1, 0, {
		index: tumbleAt + 1,
		type: 'newExpandingWilds',
		newWilds: [{ reel: fill.reel, row: fill.row, mult: multiplier }],
	});

	return { ...book, events };
};
