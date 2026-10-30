import _ from 'lodash';
import type { Tween } from 'svelte/motion';

import { stateBet } from 'state-shared';
import { createEnhanceBoard, type CascadingReel } from 'utils-slots';
import { createReelForCellSpinning } from './createReelForCellSpinning.svelte';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';

import type { GameType, Position, RawSymbol, SymbolState } from './types';
import { readFrameLayout, resolveLayout } from 'layout-editor';
import { stateLayoutDerived } from './stateLayout';
import { winLevelMap } from './winLevelMap';
import { eventEmitter } from './eventEmitter';
import { gridWaysCount } from './formatWays';
import { cellLandOrder } from './createReelForCellSpinning.svelte';
import {
	clearScatterAnticipation,
	isScatterSymbol,
	onAnticipationCellLand,
} from './scatterAnticipation';
import {
	SYMBOL_SIZE,
	BOARD_SIZES,
	INITIAL_BOARD,
	BOARD_DIMENSIONS,
	SPIN_OPTIONS_DEFAULT,
	SPIN_OPTIONS_FAST,
	INITIAL_SYMBOL_STATE,
	SCATTER_LAND_SOUND_MAP,
	createInitialPositionMultipliers,
	BOARD_FRAME_DISPLAY,
	CONTROL_BAND_STANDARD,
} from './constants';

const onSpinStart = () => {
	stateGame.scatterCounter = 0;
	clearScatterAnticipation();
};

const onSymbolLand = (args: { rawSymbol: RawSymbol; reelIndex: number; row: number }) => {
	if (isScatterSymbol(args.rawSymbol)) {
		stateGame.scatterCounter += 1;
		const landIndex = Math.min(5, Math.max(1, stateGame.scatterCounter)) as 1 | 2 | 3 | 4 | 5;
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: SCATTER_LAND_SOUND_MAP[landIndex],
			forcePlay: !stateBet.isTurbo,
		});
	}
	onAnticipationCellLand(cellLandOrder(args.reelIndex, args.row));
};

const board = _.range(BOARD_DIMENSIONS.x).map((reelIndex) => {
	const reel = createReelForCellSpinning({
		reelIndex,
		symbolHeight: SYMBOL_SIZE,
		initialSymbols: INITIAL_BOARD[reelIndex],
		initialSymbolState: INITIAL_SYMBOL_STATE,
		onReelStopping: () => {
			eventEmitter.broadcast({
				type: 'soundOnce',
				name: 'sfx_reel_stop_1',
				forcePlay: !stateBet.isTurbo,
			});
		},
		onSpinStart,
		isAnticipationLand: () => stateGame.anticipationIndex !== null,
		onSymbolLand,
	});

	reel.reelState.spinOptions = () =>
		reel.reelState.spinType === 'fast' ? SPIN_OPTIONS_FAST : SPIN_OPTIONS_DEFAULT;

	return reel;
});

export type Reel = (typeof board)[number];
export type ReelSymbol = Reel['reelState']['symbols'][number];

export type TumbleSymbol = {
	id: string;
	symbolY: Tween<number>;
	symbolScale: Tween<number>;
	rawSymbol: RawSymbol;
	symbolState: SymbolState;
	oncomplete: () => void;
};

export type MultiplierSymbol = {
	initX: number;
	initY: number;
	symbolX: Tween<number>;
	symbolY: Tween<number>;
	rawSymbol: RawSymbol;
	symbolState: SymbolState;
	oncomplete: () => void;
};

export const stateGame = $state({
	board,
	gameType: 'basegame' as GameType,
	tumbleBoardAdding: [] as TumbleSymbol[][],
	tumbleBoardBase: [] as TumbleSymbol[][],
	multiplierBoard: [] as (MultiplierSymbol | undefined)[][],
	positionMultipliers: createInitialPositionMultipliers(),
	scatterCounter: 0,
	/** Grid-order cell currently burning, or null. */
	anticipationIndex: null as number | null,
	hiddenOverlayCells: [] as Position[],
	coveredOverlayReels: [] as number[],
	fireFrames: [] as Position[],
	fireFramesNew: [] as Position[],
	fireFramesLeaving: [] as Position[],
	freeSpinBackground: null as '3s' | '4s' | '5s' | null,
	winPositions: [] as Position[],
	multiplierPulse: [] as Position[],
});

const boardLayout = () => {
	const main = stateLayoutDerived.mainLayout();
	const standard = stateLayoutDerived.mainLayoutStandard();
	const layoutType = stateLayoutDerived.layoutType();
	const frameW = BOARD_FRAME_DISPLAY.width;
	const frameH = BOARD_FRAME_DISPLAY.height;
	const sidePad = layoutType === 'portrait' ? main.width * 0.04 : 0;
	const bandStandard = CONTROL_BAND_STANDARD[layoutType];
	const band = bandStandard * (main.height / Math.max(1, standard.height));
	const usableH = Math.max(1, main.height - band);
	const contain = Math.min((main.width - sidePad * 2) / frameW, usableH / frameH);
	const scale = layoutType === 'portrait' ? contain : Math.min(1, contain);
	const [ax, ay] = readFrameLayout().boardAnchor;

	// layout-editor: the board (reel grid) can be dragged/typed in the builder. Stored x/y are
	// main-layout px (absolute); without a builder.json value the formula below applies unchanged.
	const placed = resolveLayout(
		'board',
		() => ({ x: main.width * ax, y: usableH * ay, scale }),
		{
			frame: 'main',
			editable: ['x', 'y', 'scale'],
			group: 'grid',
			name: 'Reel grid (board)',
			mode: 'absolute',
			description: 'Board position/scale (main-layout px). Reels, cells and spacing: Layers → Grid.',
		},
	);

	return {
		x: placed.x ?? main.width * 0.5,
		y: placed.y ?? usableH * 0.5,
		scale: placed.scale ?? scale,
		anchor: { x: 0.5, y: 0.5 },
		pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
		...BOARD_SIZES,
	};
};

const boardRaw = () =>
	board.map((reel) => reel.reelState.symbols.map((reelSymbol) => reelSymbol.rawSymbol));

const tumbleBoardCombined = () =>
	stateGame.tumbleBoardBase.map((tumbleReelBase, reelIndex) => {
		const tumbleReelAdding = stateGame.tumbleBoardAdding[reelIndex] ?? [];
		return [...tumbleReelAdding, ...tumbleReelBase];
	});

const scatterLandIndex = () => {
	if (stateGame.scatterCounter > 5) return 5;
	if (stateGame.scatterCounter < 1) return 1;
	return stateGame.scatterCounter as 1 | 2 | 3 | 4 | 5;
};

const { enhanceBoard } = createEnhanceBoard();
const enhancedBoard = enhanceBoard({
	board: stateGame.board as unknown as CascadingReel<RawSymbol, SymbolState>[],
});

export const { getWinLevelDataByWinLevelAlias } = createGetWinLevelDataByWinLevelAlias({
	winLevelMap,
});

export const stateGameDerived = {
	onSymbolLand,
	boardLayout,
	boardRaw,
	tumbleBoardCombined,
	scatterLandIndex,
	enhancedBoard,
	getWinLevelDataByWinLevelAlias,
	waysCount: () => gridWaysCount(stateGame.positionMultipliers),
};
