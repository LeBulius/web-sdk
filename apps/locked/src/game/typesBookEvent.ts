import type { BetType } from 'rgs-requests';

import type { SymbolName, RawSymbol, GameType, Position } from './types';

type BookEventReveal = {
	index: number;
	type: 'reveal';
	board: RawSymbol[][];
	paddingPositions: number[];
	anticipation: number[];
	gameType: GameType;
};

type BookEventSetTotalWin = {
	index: number;
	type: 'setTotalWin';
	amount: number;
};

type BookEventFinalWin = {
	index: number;
	type: 'finalWin';
	amount: number;
};

type BookEventFreeSpinTrigger = {
	index: number;
	type: 'freeSpinTrigger';
	totalFs: number;
	positions: Position[];
};

type BookEventFreeSpinRetrigger = {
	index: number;
	type: 'freeSpinRetrigger';
	totalFs: number;
	positions: Position[];
};

type BookEventUpdateFreeSpin = {
	index: number;
	type: 'updateFreeSpin';
	amount: number;
	total: number;
};

type BookEventSetWin = {
	index: number;
	type: 'setWin';
	amount: number;
	winLevel: number;
};

type BookEventFreeSpinEnd = {
	index: number;
	type: 'freeSpinEnd';
	amount: number;
	winLevel: number;
};

type BookEventWinInfo = {
	index: number;
	type: 'winInfo';
	totalWin: number;
	wins: {
		symbol: SymbolName;
		kind: number;
		win: number;
		positions: Position[];
		multiplier?: number;
		meta: {
			ways?: number;
			globalMult?: number;
			winWithoutMult?: number;
			symbolMult?: number;
			lineIndex?: number;
			multiplier?: number;
			lineMultiplier?: number;
		};
	}[];
};

type BookEventUpdateGrid = {
	index: number;
	type: 'updateGrid';
	gridMultipliers: number[][];
	fireFrames?: Position[];
};

type BookEventTumbleBoard = {
	index: number;
	type: 'tumbleBoard';
	newSymbols: RawSymbol[][];
	explodingSymbols: Position[];
};

type BookEventNewExpandingWilds = {
	index: number;
	type: 'newExpandingWilds';
	newWilds: { reel: number; row: number; mult: number }[];
};

type BookEventWildUpgrade = {
	index: number;
	type: 'wildUpgrade';
	positions: Position[];
	results: ('W' | 'VS')[];
};

type BookEventExpandWild = {
	index: number;
	type: 'expandWild';
	reels: number[];
	sourceRows: number[];
};

type BookEventWildMultiplier = {
	index: number;
	type: 'wildMultiplier';
	wilds: { reel: number; multiplier: number }[];
};

type BookEventUpdateExpandingWilds = {
	index: number;
	type: 'updateExpandingWilds';
	existingWilds: { reel: number; row: number; mult: number }[];
};

type BookEventWincap = {
	index: number;
	type: 'wincap';
	amount: number;
};

type BookEventFireFramesPlaced = {
	index: number;
	type: 'fireFramesPlaced';
	positions: Position[];
	newPositions: Position[];
};

type BookEventContrabandSwap = {
	index: number;
	type: 'contrabandSwap';
	from: Position & { symbol: SymbolName };
	to: Position & { symbol: SymbolName };
	positions?: Position[];
};

type BookEventCreateBonusSnapshot = {
	index: number;
	type: 'createBonusSnapshot';
	bookEvents: BookEvent[];
};

export type BookEvent =
	| BookEventReveal
	| BookEventWinInfo
	| BookEventSetTotalWin
	| BookEventFreeSpinTrigger
	| BookEventFreeSpinRetrigger
	| BookEventUpdateFreeSpin
	| BookEventFinalWin
	| BookEventSetWin
	| BookEventFreeSpinEnd
	| BookEventUpdateGrid
	| BookEventTumbleBoard
	| BookEventNewExpandingWilds
	| BookEventUpdateExpandingWilds
	| BookEventWildUpgrade
	| BookEventExpandWild
	| BookEventWildMultiplier
	| BookEventWincap
	| BookEventFireFramesPlaced
	| BookEventContrabandSwap
	| BookEventCreateBonusSnapshot;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
