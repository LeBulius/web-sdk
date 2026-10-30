import { stateBet } from 'state-shared';

import { playBet } from '../game/utils';
import type { Bet, BookEvent } from '../game/typesBookEvent';

export const ROUND_MODES = [
	'base',
	'ante',
	'bonus',
	'bonus_super',
	'bonus_mystery',
	'degen_spin',
] as const;

export type RoundMode = (typeof ROUND_MODES)[number];

export const EVENT_QUERIES = ['freeSpinTrigger', 'freeSpinRetrigger', 'maxWin'] as const;

export type EventQuery = (typeof EVENT_QUERIES)[number];

const MAX_WIN_PAYOUT = 2_000_000;
const BIG_WIN_AMOUNT = 2500;

const END_OF_SPIN_BOUNDARY = new Set([
	'reveal',
	'updateFreeSpin',
	'freeSpinTrigger',
	'freeSpinRetrigger',
	'freeSpinEnd',
	'finalWin',
]);

const KEPT_AFTER_WINCAP = new Set(['wincap', 'setTotalWin', 'finalWin']);

const STORY_EVENT = {
	freeSpinTrigger: 'freeSpinTrigger',
	freeSpinRetrigger: 'freeSpinRetrigger',
	maxWin: 'wincap',
} as const;

type StoryEventType = (typeof STORY_EVENT)[EventQuery];

type BookLike = {
	type: string;
	amount?: number;
	winLevel?: number;
	[key: string]: unknown;
};

type StoryJsonBook = {
	id?: number | string;
	criteria?: string;
	payoutMultiplier?: number;
	events: BookLike[];
};

type FixtureRound = {
	id: number;
	criteria?: string;
	payoutMultiplier?: number;
	tags?: string[];
};

type FixtureFile = {
	modes?: Record<string, { rounds?: FixtureRound[] }>;
};

export type RoundMatch = {
	source: 'story' | 'fixture';
	mode: string;
	id: number | string;
	criteria: string;
	storyType?: StoryEventType;
	storyN?: number;
	storyFull?: boolean;
};

export type MatchLoad = {
	matches: RoundMatch[];
	storyCount: number;
	fixtureCount: number;
	fixtureAvailable: boolean;
};

export type PlayLaunch = {
	mode: string;
	id: number | string;
	source: 'id' | 'story' | 'fixture';
	criteria: string;
	forced: boolean;
	forceApplied: boolean;
	forceLevel: number | null;
	play: () => Promise<void>;
};

type StoryModule = typeof import('../stories/pickStoryEvent');

let fixtureRequest: Promise<FixtureFile | null> | null = null;
let storyRequest: Promise<StoryModule> | null = null;
const storyBooks = new Map<string, StoryJsonBook>();

const storyKey = (mode: string, id: number | string) => `${mode}:${id}`;

function booksFromModule(mod: unknown): StoryJsonBook[] {
	if (Array.isArray(mod)) return mod as StoryJsonBook[];
	if (mod && typeof mod === 'object' && 'default' in mod) {
		const value = (mod as { default: unknown }).default;
		if (Array.isArray(value)) return value as StoryJsonBook[];
	}
	return [];
}

async function loadFixtureIndex(): Promise<FixtureFile | null> {
	if (!fixtureRequest) {
		fixtureRequest = fetch('/dev/builder_rounds.json')
			.then(async (response) => {
				if (!response.ok) {
					fixtureRequest = null;
					return null;
				}
				return (await response.json()) as FixtureFile;
			})
			.catch(() => {
				fixtureRequest = null;
				return null;
			});
	}
	return fixtureRequest;
}

function loadStoryModule(): Promise<StoryModule> {
	if (!storyRequest) storyRequest = import('../stories/pickStoryEvent');
	return storyRequest;
}

async function loadStoryBooks(): Promise<void> {
	if (storyBooks.size) return;
	const modules = await Promise.all([
		// Story JSON stays a dynamic import. tsconfig leaves resolveJsonModule off, same as the story files.
		// @ts-expect-error dev-only JSON import
		import('../stories/data/base_books.json'),
		// @ts-expect-error dev-only JSON import
		import('../stories/data/ante_books.json'),
		// @ts-expect-error dev-only JSON import
		import('../stories/data/bonus_books.json'),
		// @ts-expect-error dev-only JSON import
		import('../stories/data/bonus_super_books.json'),
		// @ts-expect-error dev-only JSON import
		import('../stories/data/bonus_mystery_books.json'),
		// @ts-expect-error dev-only JSON import
		import('../stories/data/degen_spin_books.json'),
	]);
	const modes: RoundMode[] = [
		'base',
		'ante',
		'bonus',
		'bonus_super',
		'bonus_mystery',
		'degen_spin',
	];
	modes.forEach((mode, index) => {
		for (const book of booksFromModule(modules[index])) {
			if (book.id == null) continue;
			storyBooks.set(storyKey(mode, book.id), book);
		}
	});
}

function isEndOfSpinSetWin(events: { type: string }[], index: number) {
	for (let cursor = index + 1; cursor < events.length; cursor += 1) {
		const type = events[cursor]?.type;
		if (type === 'setWin' || type === 'wincap') return false;
		if (type && END_OF_SPIN_BOUNDARY.has(type)) return true;
	}
	return true;
}

function survivesWincapTrim(events: { type: string }[], index: number) {
	const wincapAt = events.findIndex((event) => event.type === 'wincap');
	if (wincapAt < 0 || index <= wincapAt) return true;
	return KEPT_AFTER_WINCAP.has(events[index]?.type ?? '');
}

/** Clone the book and raise the last played end-of-spin setWin or freeSpinEnd into big-win range. */
export function withForcedBigWin<T extends BookLike>(events: T[], level: number) {
	const clone = structuredClone(events);
	const winLevel = Math.min(9, Math.max(6, Math.round(level)));
	let target = -1;
	for (let index = clone.length - 1; index >= 0; index -= 1) {
		const type = clone[index]?.type;
		const isTarget =
			type === 'freeSpinEnd' || (type === 'setWin' && isEndOfSpinSetWin(clone, index));
		if (!isTarget || !survivesWincapTrim(clone, index)) continue;
		target = index;
		break;
	}
	if (target < 0) return { events: clone, applied: false, winLevel };
	const event = clone[target];
	if (!event) return { events: clone, applied: false, winLevel };
	const amount = typeof event.amount === 'number' ? event.amount : 0;
	event.winLevel = winLevel;
	event.amount = Math.max(amount, BIG_WIN_AMOUNT);
	return { events: clone, applied: true, winLevel };
}

function fixtureMatches(file: FixtureFile, query: EventQuery): RoundMatch[] {
	const matches: RoundMatch[] = [];
	for (const mode of ROUND_MODES) {
		const rounds = file.modes?.[mode]?.rounds ?? [];
		for (const round of rounds) {
			const tags = round.tags ?? [];
			const trigger = tags.some(
				(tag) => tag === 'FS3' || tag === 'FS4' || tag === 'FS5' || tag === 'FS6',
			);
			const retrigger = tags.includes('retrigger');
			const maxWin = tags.includes('wincap') || round.payoutMultiplier === MAX_WIN_PAYOUT;
			const hit =
				(query === 'freeSpinTrigger' && trigger) ||
				(query === 'freeSpinRetrigger' && retrigger) ||
				(query === 'maxWin' && maxWin);
			if (!hit) continue;
			matches.push({
				source: 'fixture',
				mode,
				id: round.id,
				criteria: round.criteria ?? '',
			});
		}
	}
	return matches;
}

export async function loadEventMatches(query: EventQuery): Promise<MatchLoad> {
	const story = await loadStoryModule();
	await loadStoryBooks();
	const storyType = STORY_EVENT[query];
	const pool = story.EVENT_STORY_PICKS[storyType] ?? [];
	const matches: RoundMatch[] = pool.map((pick, storyN) => ({
		source: 'story' as const,
		mode: pick.mode,
		id: pick.bookId,
		criteria: pick.criteria,
		storyType,
		storyN,
	}));

	if (query === 'maxWin') {
		for (const [key, book] of storyBooks) {
			if (book.payoutMultiplier !== MAX_WIN_PAYOUT) continue;
			if (book.events.some((event) => event.type === 'wincap')) continue;
			const [mode, id] = key.split(':');
			if (!mode || id == null) continue;
			if (
				matches.some(
					(match) => match.source === 'story' && String(match.id) === id && match.mode === mode,
				)
			) {
				continue;
			}
			matches.push({
				source: 'story',
				mode,
				id: book.id ?? id,
				criteria: book.criteria ?? '',
				storyFull: true,
			});
		}
	}

	const storyCount = matches.length;
	const fixture = await loadFixtureIndex();
	const fixtureList = fixture ? fixtureMatches(fixture, query) : [];
	matches.push(...fixtureList);
	return {
		matches,
		storyCount,
		fixtureCount: fixtureList.length,
		fixtureAvailable: fixture != null,
	};
}

async function playEvents(mode: string, book: object, events: BookLike[]) {
	stateBet.activeBetModeKey = mode;
	await playBet({ ...book, state: events as BookEvent[] } as Bet);
}

export async function prepareIdPlay(
	mode: string,
	id: number,
	forceLevel: number | null,
): Promise<PlayLaunch | { error: string }> {
	let response: Response;
	try {
		response = await fetch(`/dev/round?mode=${encodeURIComponent(mode)}&id=${id}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { error: `Could not load round ${id} (${message}).` };
	}
	if (response.status === 404) return { error: `Round ${id} was not found in ${mode}.` };
	if (!response.ok) return { error: `Could not load round ${id} (${response.status}).` };

	const round = (await response.json()) as StoryJsonBook & { events: BookLike[] };
	const events = Array.isArray(round.events) ? round.events : [];
	const forced = forceLevel == null ? null : withForcedBigWin(events, forceLevel);
	const state = forced ? forced.events : events;
	return {
		mode,
		id: round.id ?? id,
		source: 'id',
		criteria: round.criteria ?? '',
		forced: forceLevel != null,
		forceApplied: forced?.applied ?? false,
		forceLevel: forced?.winLevel ?? null,
		play: () => playEvents(mode, round, state),
	};
}

export async function prepareMatchPlay(
	match: RoundMatch,
	forceLevel: number | null,
): Promise<PlayLaunch> {
	if (match.source === 'fixture') {
		const id = Number(match.id);
		const prepared = await prepareIdPlay(match.mode, id, forceLevel);
		if ('error' in prepared) throw new Error(prepared.error);
		return { ...prepared, source: 'fixture' };
	}

	if (match.storyFull || match.storyType == null || match.storyN == null) {
		await loadStoryBooks();
		const book = storyBooks.get(storyKey(match.mode, match.id));
		if (!book) throw new Error(`Story book ${match.mode} #${match.id} is not loaded.`);
		const forced = forceLevel == null ? null : withForcedBigWin(book.events, forceLevel);
		const state = forced ? forced.events : book.events;
		return {
			mode: match.mode,
			id: book.id ?? match.id,
			source: 'story',
			criteria: book.criteria ?? match.criteria,
			forced: forceLevel != null,
			forceApplied: forced?.applied ?? false,
			forceLevel: forced?.winLevel ?? null,
			play: () => playEvents(match.mode, book, state),
		};
	}

	const story = await loadStoryModule();
	const pick = story.getEventStory(match.storyType, match.storyN);
	if (forceLevel == null) {
		return {
			mode: pick.mode,
			id: pick.bookId,
			source: 'story',
			criteria: pick.criteria,
			forced: false,
			forceApplied: false,
			forceLevel: null,
			play: () => story.playEventStory(pick),
		};
	}

	const forced = withForcedBigWin(pick.events, forceLevel);
	return {
		mode: pick.mode,
		id: pick.bookId,
		source: 'story',
		criteria: pick.criteria,
		forced: true,
		forceApplied: forced.applied,
		forceLevel: forced.winLevel,
		play: () => playEvents(pick.mode, pick.book, forced.events),
	};
}
