import type { BookEventOfType } from '../../game/typesBookEvent';
import type { RawSymbol } from '../../game/types';

const pad = (name: RawSymbol['name']): RawSymbol => ({ name });

/** Padded 3-5-5-3 board with a square W on reel 1, visible row 2 (event row 3). */
export const revealWithWild: BookEventOfType<'reveal'> = {
	index: 0,
	type: 'reveal',
	gameType: 'basegame',
	paddingPositions: [0, 0, 0, 0],
	anticipation: [0, 0, 0, 0],
	board: [
		[pad('L1'), { name: 'H1' }, { name: 'L2' }, { name: 'H3' }, pad('L3')],
		[
			pad('L2'),
			{ name: 'L1' },
			{ name: 'H2' },
			{ name: 'W', wild: true },
			{ name: 'H4' },
			{ name: 'L4' },
			pad('L5'),
		],
		[pad('L3'), { name: 'H3' }, { name: 'L5' }, { name: 'H1' }, { name: 'L2' }, { name: 'H2' }, pad('L1')],
		[pad('L4'), { name: 'L5' }, { name: 'H4' }, { name: 'L1' }, pad('L2')],
	],
};

/** Square W on reel 0 (3-row) so we can test ew3. */
export const revealWithWildShortReel: BookEventOfType<'reveal'> = {
	index: 0,
	type: 'reveal',
	gameType: 'basegame',
	paddingPositions: [0, 0, 0, 0],
	anticipation: [0, 0, 0, 0],
	board: [
		[pad('L1'), { name: 'W', wild: true }, { name: 'L2' }, { name: 'H3' }, pad('L3')],
		[pad('L2'), { name: 'L1' }, { name: 'H2' }, { name: 'L3' }, { name: 'H4' }, { name: 'L4' }, pad('L5')],
		[pad('L3'), { name: 'H3' }, { name: 'L5' }, { name: 'H1' }, { name: 'L2' }, { name: 'H2' }, pad('L1')],
		[pad('L4'), { name: 'L5' }, { name: 'H4' }, { name: 'L1' }, pad('L2')],
	],
};

export const wildUpgradeStayW: BookEventOfType<'wildUpgrade'> = {
	index: 1,
	type: 'wildUpgrade',
	positions: [{ reel: 1, row: 3 }],
	results: ['W'],
};

export const wildUpgradeToVS: BookEventOfType<'wildUpgrade'> = {
	index: 1,
	type: 'wildUpgrade',
	positions: [{ reel: 1, row: 3 }],
	results: ['VS'],
};

export const expandWildMid: BookEventOfType<'expandWild'> = {
	index: 2,
	type: 'expandWild',
	reels: [1],
	sourceRows: [3],
};

export const wildMultiplierX10: BookEventOfType<'wildMultiplier'> = {
	index: 3,
	type: 'wildMultiplier',
	wilds: [{ reel: 1, multiplier: 10 }],
};

export const wildUpgradeShortReel: BookEventOfType<'wildUpgrade'> = {
	index: 1,
	type: 'wildUpgrade',
	positions: [{ reel: 0, row: 1 }],
	results: ['VS'],
};

export const expandWildShortReel: BookEventOfType<'expandWild'> = {
	index: 2,
	type: 'expandWild',
	reels: [0],
	sourceRows: [1],
};

export const wildMultiplierShortReel: BookEventOfType<'wildMultiplier'> = {
	index: 3,
	type: 'wildMultiplier',
	wilds: [{ reel: 0, multiplier: 5 }],
};

export const newExpandingWildsCompat: BookEventOfType<'newExpandingWilds'> = {
	index: 1,
	type: 'newExpandingWilds',
	newWilds: [{ reel: 1, row: 3, mult: 25 }],
};

/** Pre-expand stop. EW is stamped from `newExpandingWilds` so it spins in. */
export const revealWithEw: BookEventOfType<'reveal'> = {
	index: 0,
	type: 'reveal',
	gameType: 'basegame',
	paddingPositions: [0, 0, 0, 0],
	anticipation: [0, 0, 0, 0],
	board: [
		[pad('L1'), { name: 'H1' }, { name: 'L2' }, { name: 'H3' }, pad('L3')],
		[
			pad('L2'),
			{ name: 'L1' },
			{ name: 'H2' },
			{ name: 'L3' },
			{ name: 'H4' },
			{ name: 'L4' },
			pad('L5'),
		],
		[pad('L3'), { name: 'H3' }, { name: 'L5' }, { name: 'H1' }, { name: 'L2' }, { name: 'H2' }, pad('L1')],
		[pad('L4'), { name: 'L5' }, { name: 'H4' }, { name: 'L1' }, pad('L2')],
	],
};

export const revealWithEwShortReel: BookEventOfType<'reveal'> = {
	index: 0,
	type: 'reveal',
	gameType: 'basegame',
	paddingPositions: [0, 0, 0, 0],
	anticipation: [0, 0, 0, 0],
	board: [
		[pad('L1'), { name: 'L2' }, { name: 'L2' }, { name: 'H3' }, pad('L3')],
		[pad('L2'), { name: 'L1' }, { name: 'H2' }, { name: 'L3' }, { name: 'H4' }, { name: 'L4' }, pad('L5')],
		[pad('L3'), { name: 'H3' }, { name: 'L5' }, { name: 'H1' }, { name: 'L2' }, { name: 'H2' }, pad('L1')],
		[pad('L4'), { name: 'L5' }, { name: 'H4' }, { name: 'L1' }, pad('L2')],
	],
};

export const newExpandingWildsShort: BookEventOfType<'newExpandingWilds'> = {
	index: 1,
	type: 'newExpandingWilds',
	newWilds: [{ reel: 0, row: 1, mult: 5 }],
};

export const fireFramesPlacedOpen: BookEventOfType<'fireFramesPlaced'> = {
	index: 0,
	type: 'fireFramesPlaced',
	positions: [
		{ reel: 0, row: 1 },
		{ reel: 1, row: 3 },
		{ reel: 2, row: 1 },
		{ reel: 3, row: 1 },
	],
	newPositions: [
		{ reel: 0, row: 1 },
		{ reel: 1, row: 3 },
		{ reel: 2, row: 1 },
		{ reel: 3, row: 1 },
	],
};

export const updateGridWithFire: BookEventOfType<'updateGrid'> = {
	index: 1,
	type: 'updateGrid',
	gridMultipliers: [
		[1, 2, 1],
		[1, 1, 3, 1, 1],
		[2, 1, 1, 1, 1],
		[1, 1, 1],
	],
	fireFrames: [
		{ reel: 0, row: 1 },
		{ reel: 1, row: 3 },
		{ reel: 2, row: 1 },
		{ reel: 3, row: 1 },
	],
};

export const revealWithFireAndLow: BookEventOfType<'reveal'> = {
	index: 2,
	type: 'reveal',
	gameType: 'basegame',
	paddingPositions: [0, 0, 0, 0],
	anticipation: [0, 0, 0, 0],
	board: [
		[
			pad('L1'),
			{ name: 'H1', fireFrame: true },
			{ name: 'L2' },
			{ name: 'H3' },
			pad('L3'),
		],
		[
			pad('L2'),
			{ name: 'L1' },
			{ name: 'C', contraband: true },
			{ name: 'L2', fireFrame: true },
			{ name: 'L5' },
			{ name: 'L4' },
			pad('L5'),
		],
		[
			pad('L3'),
			{ name: 'H3', fireFrame: true },
			{ name: 'L5' },
			{ name: 'H1' },
			{ name: 'L2' },
			{ name: 'H2' },
			pad('L1'),
		],
		[pad('L4'), { name: 'L5', fireFrame: true }, { name: 'H4' }, { name: 'L1' }, pad('L2')],
	],
};

export const contrabandL2ToH4: BookEventOfType<'contrabandSwap'> = {
	index: 3,
	type: 'contrabandSwap',
	from: { reel: 0, row: 2, symbol: 'L2' },
	to: { reel: 0, row: 2, symbol: 'H4' },
	positions: [
		{ reel: 0, row: 2 },
		{ reel: 1, row: 2 },
		{ reel: 1, row: 3 },
		{ reel: 2, row: 4 },
	],
};

export const revealWithScatters: BookEventOfType<'reveal'> = {
	index: 0,
	type: 'reveal',
	gameType: 'basegame',
	paddingPositions: [0, 0, 0, 0],
	anticipation: [0, 0, 0, 0],
	board: [
		[pad('L1'), { name: 'S', scatter: true }, { name: 'L2' }, { name: 'H3' }, pad('L3')],
		[
			pad('L2'),
			{ name: 'L1' },
			{ name: 'S', scatter: true },
			{ name: 'L3' },
			{ name: 'H4' },
			{ name: 'L4' },
			pad('L5'),
		],
		[pad('L3'), { name: 'H3' }, { name: 'L5' }, { name: 'S', scatter: true }, { name: 'L2' }, { name: 'H2' }, pad('L1')],
		[pad('L4'), { name: 'L5' }, { name: 'H4' }, { name: 'L1' }, pad('L2')],
	],
};

export const freeSpinTrigger8: BookEventOfType<'freeSpinTrigger'> = {
	index: 1,
	type: 'freeSpinTrigger',
	totalFs: 8,
	positions: [
		{ reel: 0, row: 1 },
		{ reel: 1, row: 2 },
		{ reel: 2, row: 3 },
	],
};

export const freeSpinEndNice: BookEventOfType<'freeSpinEnd'> = {
	index: 2,
	type: 'freeSpinEnd',
	amount: 5000,
	winLevel: 5,
};

export const setWinBig: BookEventOfType<'setWin'> = {
	index: 1,
	type: 'setWin',
	amount: 8000,
	winLevel: 6,
};

export const setWinSuper: BookEventOfType<'setWin'> = {
	index: 1,
	type: 'setWin',
	amount: 20000,
	winLevel: 7,
};

/** Visible C, no live L of a type — C still upgrades alone. */
export const revealWithCOnly: BookEventOfType<'reveal'> = {
	index: 2,
	type: 'reveal',
	gameType: 'basegame',
	paddingPositions: [0, 0, 0, 0],
	anticipation: [0, 0, 0, 0],
	board: [
		[pad('L1'), { name: 'H1', fireFrame: true }, { name: 'H2' }, { name: 'H3' }, pad('L3')],
		[
			pad('L2'),
			{ name: 'H4' },
			{ name: 'C', contraband: true },
			{ name: 'H1', fireFrame: true },
			{ name: 'H3' },
			{ name: 'L4' },
			pad('L5'),
		],
		[
			pad('L3'),
			{ name: 'H3', fireFrame: true },
			{ name: 'L5' },
			{ name: 'H1' },
			{ name: 'H2' },
			{ name: 'H2' },
			pad('L1'),
		],
		[pad('L4'), { name: 'L5', fireFrame: true }, { name: 'H4' }, { name: 'L1' }, pad('L2')],
	],
};

export const contrabandCToH3: BookEventOfType<'contrabandSwap'> = {
	index: 3,
	type: 'contrabandSwap',
	from: { reel: 1, row: 2, symbol: 'C' },
	to: { reel: 1, row: 2, symbol: 'H3' },
	positions: [{ reel: 1, row: 2 }],
};

export const contrabandSwapBook = {
	id: 'fixture-contraband',
	criteria: 'basegame',
	payoutMultiplier: 0,
	events: [fireFramesPlacedOpen, updateGridWithFire, revealWithFireAndLow, contrabandL2ToH4],
};

export const tumbleReplaceLows: BookEventOfType<'tumbleBoard'> = {
	index: 1,
	type: 'tumbleBoard',
	explodingSymbols: [
		{ reel: 1, row: 2 },
		{ reel: 1, row: 3 },
	],
	newSymbols: [[], [{ name: 'H2' }, { name: 'H4' }], [], []],
};


