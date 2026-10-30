import _ from 'lodash';
import { stateBet, stateUi } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';

import {
	SYMBOL_SIZE,
	REEL_PADDING,
	SYMBOL_INFO_MAP,
	REEL_ROWS,
	MAX_ROWS,
	CELL_WINDOW_SIZE,
	CELL_WINDOW_INSET,
	createInitialPositionMultipliers,
} from './constants';
import { eventEmitter } from './eventEmitter';
import type { Bet, BookEventOfType } from './typesBookEvent';
import { bookEventHandlerMap, trimBookEventsAfterWincap } from './bookEventHandlerMap';
import type { RawSymbol, SymbolState } from './types';
import { stateGame } from './stateGame.svelte';
import { setFireFrames } from './fireRimSheet';
import { installBuilderPreviewBridge, withBuilderBookHook } from './builderBookHook';
import { gridCellRect } from './grid';

export const getEmptyBoard = () =>
	REEL_ROWS.map((rows) => _.range(rows + 2).map(() => null));

// layout-editor: in dev, each event is also announced to the builder after the game's own handler.
export const { playBookEvent, playBookEvents } = createPlayBookUtils({
	bookEventHandlerMap: import.meta.env.DEV
		? withBuilderBookHook(bookEventHandlerMap)
		: bookEventHandlerMap,
});
if (import.meta.env.DEV) installBuilderPreviewBridge(bookEventHandlerMap);
export const playBet = async (bet: Bet) => {
	stateBet.winBookEventAmount = 0;
	stateBet.wageredBetAmount = stateBet.betAmount;
	stateGame.positionMultipliers = createInitialPositionMultipliers();
	stateGame.hiddenOverlayCells = [];
	stateGame.coveredOverlayReels = [];
	setFireFrames([]);
	stateGame.fireFramesNew = [];
	stateGame.freeSpinBackground = null;
	stateGame.winPositions = [];
	stateGame.multiplierPulse = [];
	eventEmitter.broadcast({ type: 'wildOverlayClear' });
	stateUi.freeSpinCounterShow = false;
	stateUi.freeSpinCounterCurrent = 0;
	stateUi.freeSpinCounterTotal = 0;
	// Once max win hits, play the wincap presentation then end the round.
	await playBookEvents(trimBookEventsAfterWincap(bet.state));
	eventEmitter.broadcast({ type: 'stopButtonEnable' });
};

const BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT = [
	'updateGlobalMult',
	'freeSpinTrigger',
	'updateFreeSpin',
	'setTotalWin',
	'updateGrid',
	'fireFramesPlaced',
];

export const convertTorResumableBet = (betToResume: Bet) => {
	const resumingIndex = Number(betToResume.event);
	const bookEventsBeforeResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex < resumingIndex,
	);
	const bookEventsAfterResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex >= resumingIndex,
	);

	const bookEventToCreateSnapshot: BookEventOfType<'createBonusSnapshot'> = {
		index: 0,
		type: 'createBonusSnapshot',
		bookEvents: bookEventsBeforeResume.filter((bookEvent) =>
			BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT.includes(bookEvent.type),
		),
	};

	const stateToResume = [bookEventToCreateSnapshot, ...bookEventsAfterResume];

	return { ...betToResume, state: stateToResume };
};

/** Global-row offset so 3-high reels sit on the middle 3 of the 5-high grid. */
export const getReelOffsetRows = (reelIndex: number) =>
	(MAX_ROWS - REEL_ROWS[reelIndex]) / 2;

export const getReelOffsetY = (reelIndex: number) => getReelOffsetRows(reelIndex) * SYMBOL_SIZE;

export const isVisibleBoardCell = (reelIndex: number, symbolIndexOfBoard: number) => {
	const rows = REEL_ROWS[reelIndex];
	return symbolIndexOfBoard >= 0 && symbolIndexOfBoard < rows;
};

export const getSymbolX = (reelIndex: number) => SYMBOL_SIZE * (reelIndex + REEL_PADDING);
export const getSymbolY = (symbolIndexOfBoard: number) => (symbolIndexOfBoard + 0.5) * SYMBOL_SIZE;

/**
 * Pitch-cell top-left in board space (includes half the steel bar). Follows the builder grid
 * (layout-editor); defaults to x = reel * SYMBOL_SIZE, y = reelOffset + row * SYMBOL_SIZE.
 */
export const getCellRect = (reelIndex: number, symbolIndexOfBoard: number) =>
	gridCellRect(reelIndex, symbolIndexOfBoard);

/** Black window inside the pitch cell — same inset on all sides. */
export const getCellWindowRect = (reelIndex: number, symbolIndexOfBoard: number) => {
	const cell = getCellRect(reelIndex, symbolIndexOfBoard);
	return {
		x: cell.x + CELL_WINDOW_INSET,
		y: cell.y + CELL_WINDOW_INSET,
		width: CELL_WINDOW_SIZE,
		height: CELL_WINDOW_SIZE,
		cx: cell.x + SYMBOL_SIZE / 2,
		cy: cell.y + SYMBOL_SIZE / 2,
	};
};

export const getSymbolInfo = ({
	rawSymbol,
	state,
}: {
	rawSymbol: RawSymbol;
	state: SymbolState;
}) => {
	const bySymbol = SYMBOL_INFO_MAP[rawSymbol.name];
	if (!bySymbol) {
		console.error(`Missing SYMBOL_INFO_MAP entry for "${rawSymbol.name}"`);
		return SYMBOL_INFO_MAP.L1[state];
	}
	return bySymbol[state];
};

export const symbolDrawMax = (sizeRatios = { width: 0.9, height: 0.9 }) => ({
	width: CELL_WINDOW_SIZE * sizeRatios.width,
	height: CELL_WINDOW_SIZE * sizeRatios.height,
});

export const containFitSize = (texW: number, texH: number, maxW: number, maxH: number) => {
	if (texW <= 1 || texH <= 1) return { width: maxW, height: maxH };
	const scale = Math.min(maxW / texW, maxH / texH);
	return { width: texW * scale, height: texH * scale };
};

/** Chooser faces use the loaded sprite as-is; packing/trim happens at export time. */
export const trimmedSymbolTexture = <T>(key: string, loaded: T) => {
	void key;
	return loaded;
};
