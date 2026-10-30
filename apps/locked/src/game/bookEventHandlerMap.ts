import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet, stateUi } from 'state-shared';
import { sequence } from 'utils-shared/sequence';
import { waitForTimeout } from 'utils-shared/wait';
import { bookEventAmountToBetAmountMultiplier } from 'utils-shared/amount';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
import type { Position, RawSymbol } from './types';
import { ANTICIPATION_LAND, FIRE_RIM_FADE_MS, createInitialPositionMultipliers, REEL_ROWS } from './constants';
import { freeSpinBackgroundFromTotal, normalizeBonusMode } from './bonusMeta';
import { cellLandOrder, isLandSkipped, onLandSkip } from './createReelForCellSpinning.svelte';
import { clearScatterAnticipation, syncScatterAnticipation } from './scatterAnticipation';
import { mergeChooserWithBaits } from './wildChooserBait';
import { setFireFrames } from './fireRimSheet';

/** Center win counter only for wins at least this many × base bet. */
const WIN_COUNTER_MIN_BET_MULT = 25;

/** True max-win multiplier (matches math `wincap` / FE `max_win`). */
const MAX_WIN_BET_MULT = 20000;

/** After wincap, keep totals/finalization only — stop further spins/tumbles. */
const POST_WINCAP_CONTINUE_TYPES = new Set(['wincap', 'setTotalWin', 'finalWin']);

/** Clamp book winLevel so MAX WIN only presents at the true 20_000× cap. */
const resolvePresentWinLevel = (amount: number, winLevel: number): WinLevel => {
	const mult = bookEventAmountToBetAmountMultiplier(amount);
	if (mult >= MAX_WIN_BET_MULT) return 10;
	if (winLevel >= 10) return 9;
	return winLevel as WinLevel;
};

const winLevelSoundsPlay = async ({ winLevelData }: { winLevelData: WinLevelData }) => {
	// Await uiHide — floating broadcastAsync races uiShow/uiHide and can soft-lock.
	if (winLevelData?.alias === 'max') {
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
	}
	if (winLevelData?.sound?.sfx) {
		eventEmitter.broadcast({ type: 'soundOnce', name: winLevelData.sound.sfx });
	}
	if (winLevelData?.sound?.bgm) {
		eventEmitter.broadcast({ type: 'soundMusic', name: winLevelData.sound.bgm });
	}
	if (winLevelData?.type === 'big') {
		eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_bigwin_coinloop' });
	}
};

const winLevelSoundsStop = async () => {
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	if (stateGame.gameType === 'freegame') {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	}
	await eventEmitter.broadcastAsync({ type: 'uiShow' });
};

const animateSymbols = async ({ positions }: { positions: Position[] }) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	stateGame.winPositions = positions;
	await eventEmitter.broadcastAsync({
		type: 'boardWithAnimateSymbols',
		symbolPositions: positions,
	});
	stateGame.winPositions = [];
};

const showBonusIntro = async ({
	modeKey,
	totalFreeSpins,
	kind,
}: {
	modeKey: string;
	totalFreeSpins?: number;
	kind: 'trigger' | 'retrigger' | 'feature';
}) => {
	eventEmitter.broadcast({ type: 'bonusIntroShow' });
	await eventEmitter.broadcastAsync({
		type: 'bonusIntroUpdate',
		modeKey,
		totalFreeSpins,
		kind,
	});
	eventEmitter.broadcast({ type: 'bonusIntroHide' });
};

const presentWin = async (amount: number, winLevel: number) => {
	const resolvedLevel = resolvePresentWinLevel(amount, winLevel);
	const winLevelData = winLevelMap[resolvedLevel];
	if (!winLevelData) return;

	// Small wins stay on the bar / connection text only — no center count-up.
	if (bookEventAmountToBetAmountMultiplier(amount) < WIN_COUNTER_MIN_BET_MULT) return;

	// Hide UI before showing the overlay so we never soft-lock with an empty Win layer.
	await winLevelSoundsPlay({ winLevelData });
	eventEmitter.broadcast({ type: 'winShow' });
	await eventEmitter.broadcastAsync({
		type: 'winUpdate',
		amount,
		winLevelData,
	});
	eventEmitter.broadcast({ type: 'winHide' });
	await winLevelSoundsStop();
};

/** True for the final setWin of a spin (after tumbles), not mid-cascade connection setWins. */
const isEndOfSpinSetWin = (
	bookEvent: BookEventOfType<'setWin'>,
	bookEvents: BookEvent[],
) => {
	const at = bookEvents.findIndex((event) => event === bookEvent);
	if (at < 0) return true;

	for (let i = at + 1; i < bookEvents.length; i += 1) {
		const type = bookEvents[i]?.type;
		if (type === 'setWin') return false;
		// wincap owns the max-win presentation — don't play the prior setWin first.
		if (type === 'wincap') return false;
		if (
			type === 'reveal' ||
			type === 'updateFreeSpin' ||
			type === 'freeSpinTrigger' ||
			type === 'freeSpinRetrigger' ||
			type === 'freeSpinEnd' ||
			type === 'finalWin'
		) {
			return true;
		}
	}

	return true;
};

/** Drop gameplay events after wincap so the round stops once max win plays. */
export const trimBookEventsAfterWincap = (bookEvents: BookEvent[]) => {
	const wincapAt = bookEvents.findIndex((event) => event.type === 'wincap');
	if (wincapAt < 0) return bookEvents;

	return bookEvents.filter((event, index) => {
		if (index <= wincapAt) return true;
		return POST_WINCAP_CONTINUE_TYPES.has(event.type);
	});
};

const fillExpandedReels = (wilds: { reel: number; mult?: number }[]) => {
	for (const wild of wilds) {
		const rows = REEL_ROWS[wild.reel] ?? 0;
		const symbols = stateGame.board[wild.reel]?.reelState.symbols;
		if (!symbols) continue;
		for (let visible = 0; visible < rows; visible += 1) {
			const reelSymbol = symbols[visible + 1];
			if (!reelSymbol) continue;
			if (reelSymbol.rawSymbol.name === 'S' || reelSymbol.rawSymbol.scatter) continue;
			reelSymbol.rawSymbol = {
				name: 'EW',
				wild: true,
				...(wild.mult != null ? { multiplier: wild.mult } : {}),
			};
		}
	}
};

const applyReelWildMultiplier = (reel: number, multiplier: number) => {
	const rows = REEL_ROWS[reel] ?? 0;
	const symbols = stateGame.board[reel]?.reelState.symbols;
	if (!symbols) return;
	for (let visible = 0; visible < rows; visible += 1) {
		const reelSymbol = symbols[visible + 1];
		if (!reelSymbol) continue;
		if (reelSymbol.rawSymbol.name !== 'EW' && reelSymbol.rawSymbol.name !== 'W') continue;
		reelSymbol.rawSymbol = {
			...reelSymbol.rawSymbol,
			name: 'EW',
			wild: true,
			multiplier,
		};
	}
};

const copyRawSymbol = (symbol: RawSymbol): RawSymbol => ({ ...symbol });

/** EW is assigned after reveal in published books — stamp it onto this stop so it spins in. */
const expandingWildsUntilNextReveal = (
	bookEvent: BookEvent,
	bookEvents: BookEvent[],
): BookEventOfType<'newExpandingWilds'>['newWilds'] => {
	const start = bookEvents.findIndex((event) => event === bookEvent);
	const from = start >= 0 ? start + 1 : bookEvents.length;
	for (let i = from; i < bookEvents.length; i += 1) {
		const event = bookEvents[i];
		if (event.type === 'reveal') break;
		if (event.type === 'newExpandingWilds') return event.newWilds ?? [];
	}
	return [];
};

const withSpinningExpandingWilds = (
	board: RawSymbol[][],
	wilds: BookEventOfType<'newExpandingWilds'>['newWilds'],
): RawSymbol[][] => {
	if (!wilds.length) return board;
	const next = board.map((reel) => reel.map(copyRawSymbol));
	for (const wild of wilds) {
		const reel = next[wild.reel];
		if (!reel || wild.row < 0 || wild.row >= reel.length) continue;
		reel[wild.row] = { name: 'EW', wild: true };
	}
	return next;
};

const fireFramesFromBoard = (board: RawSymbol[][]): Position[] => {
	const frames: Position[] = [];
	board.forEach((reel, reelIndex) => {
		reel.forEach((symbol, row) => {
			if (symbol?.fireFrame) frames.push({ reel: reelIndex, row });
		});
	});
	return frames;
};

const applyBoardCell = (reel: number, row: number, rawSymbol: RawSymbol) => {
	const cell = stateGame.board[reel]?.reelState.symbols[row];
	if (!cell) return;
	cell.rawSymbol = rawSymbol;
	cell.symbolState = 'land';
};

/** Pair exploded cells (padded board rows) with replacement symbols, top-to-bottom per reel. */
const applyTumbleFills = (
	board: RawSymbol[][],
	explodingPositions: Position[],
	newSymbols: RawSymbol[][],
): RawSymbol[][] => {
	const next = board.map((reel) => reel.map(copyRawSymbol));
	const rowsByReel = new Map<number, number[]>();
	for (const pos of explodingPositions) {
		const rows = rowsByReel.get(pos.reel) ?? [];
		rows.push(pos.row);
		rowsByReel.set(pos.reel, rows);
	}

	for (const [reel, rows] of rowsByReel) {
		const sortedRows = [...new Set(rows)].sort((a, b) => a - b);
		const incoming = newSymbols[reel] ?? [];
		sortedRows.forEach((row, i) => {
			const rawSymbol = incoming[i];
			if (!rawSymbol || !next[reel]) return;
			next[reel][row] = copyRawSymbol(rawSymbol);
		});
	}

	return next;
};

/** Unique exploded visible cells, land order top-to-bottom then left-to-right. */
const uniqueVisibleHoles = (explodingPositions: Position[]) => {
	const seen = new Set<string>();
	const holes: { reelIndex: number; visibleRow: number }[] = [];
	for (const pos of explodingPositions) {
		const visibleRow = pos.row - 1;
		const rows = REEL_ROWS[pos.reel] ?? 0;
		if (visibleRow < 0 || visibleRow >= rows) continue;
		const key = `${pos.reel}:${visibleRow}`;
		if (seen.has(key)) continue;
		seen.add(key);
		holes.push({ reelIndex: pos.reel, visibleRow });
	}
	holes.sort(
		(a, b) => cellLandOrder(a.reelIndex, a.visibleRow) - cellLandOrder(b.reelIndex, b.visibleRow),
	);
	return holes;
};

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			recordBookEvent({ bookEvent });
		}

		// Fresh paid spin starts multipliers from updateGrid / fireFramesPlaced.
		stateGame.gameType = bookEvent.gameType;
		eventEmitter.broadcast({ type: 'stopButtonEnable' });
		eventEmitter.broadcast({ type: 'wildOverlayClear' });
		stateGame.scatterCounter = 0;
		clearScatterAnticipation();
		const spinningBoard = withSpinningExpandingWilds(
			bookEvent.board,
			expandingWildsUntilNextReveal(bookEvent, bookEvents),
		);
		await stateGameDerived.enhancedBoard.spin({
			revealEvent: { ...bookEvent, board: spinningBoard },
		});
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
		if (!stateGame.fireFrames.length) {
			setFireFrames(fireFramesFromBoard(spinningBoard));
		}
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		if (!bookEvent.wins?.length) return;
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
		await sequence(bookEvent.wins, async (win) => {
			const lastReel = Math.max(...win.positions.map((p) => p.reel));
			const endRows = win.positions.filter((p) => p.reel === lastReel);
			const end = endRows[Math.floor(endRows.length / 2)] ?? win.positions[win.positions.length - 1];

			await Promise.all([
				animateSymbols({ positions: win.positions }),
				eventEmitter.broadcastAsync({
					type: 'showConnectionWinAmounts',
					wins: [
						{
							amount: win.win,
							reel: end.reel,
							row: end.row,
						},
					],
				}),
			]);
		});
		stateGame.winPositions = [];
	},
	updateGrid: async (bookEvent: BookEventOfType<'updateGrid'>) => {
		const prev = stateGame.positionMultipliers;
		const next = bookEvent.gridMultipliers.map((reel) => [...reel]);
		const rose: Position[] = [];
		next.forEach((reel, reelIndex) => {
			reel.forEach((mult, row) => {
				if (mult > (prev[reelIndex]?.[row] ?? 1)) {
					rose.push({ reel: reelIndex, row });
				}
			});
		});
		stateGame.positionMultipliers = next;
		stateGame.multiplierPulse = rose;
		if (bookEvent.fireFrames !== undefined) {
			setFireFrames(bookEvent.fireFrames);
		}
		if (rose.length) {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
			await waitForTimeout(stateBet.isTurbo ? 80 : 180);
			stateGame.multiplierPulse = [];
			return;
		}
		if (!stateBet.isTurbo) await waitForTimeout(40);
	},
	tumbleBoard: async (
		bookEvent: BookEventOfType<'tumbleBoard'>,
		{ bookEvents }: BookEventContext,
	) => {
		eventEmitter.broadcast({ type: 'wildOverlayClear' });
		eventEmitter.broadcast({ type: 'boardHide' });
		if (!stateBet.isTurbo) await waitForTimeout(16);

		eventEmitter.broadcast({ type: 'tumbleBoardShow' });
		eventEmitter.broadcast({
			type: 'tumbleBoardInit',
			addingBoard: bookEvent.newSymbols,
			explodingPositions: bookEvent.explodingSymbols,
		});
		await eventEmitter.broadcastAsync({
			type: 'tumbleBoardExplode',
			explodingPositions: bookEvent.explodingSymbols,
		});

		const nextBoard = withSpinningExpandingWilds(
			applyTumbleFills(
				stateGameDerived.boardRaw(),
				bookEvent.explodingSymbols,
				bookEvent.newSymbols,
			),
			expandingWildsUntilNextReveal(bookEvent, bookEvents),
		);
		const holes = uniqueVisibleHoles(bookEvent.explodingSymbols);
		const rowsByReel = stateGame.board.map(() => [] as number[]);
		for (const hole of holes) {
			rowsByReel[hole.reelIndex]?.push(hole.visibleRow);
		}
		const spinType = stateBet.isTurbo ? 'fast' : 'normal';

		stateGame.board.reduce((previousPaddingSize, reel, reelIndex) => {
			return reel.prepareToSpin({
				noStop: false,
				spinType,
				symbols: nextBoard[reelIndex] ?? [],
				paddingPosition: 0,
				previousPaddingSize,
				onSpinFinishing: () => reel.onReelStopping(),
			});
		}, 0);

		stateGame.board.forEach((reel, reelIndex) => {
			reel.startHoleLoops(rowsByReel[reelIndex] ?? []);
		});
		syncScatterAnticipation();

		eventEmitter.broadcast({ type: 'tumbleBoardReset' });
		eventEmitter.broadcast({ type: 'tumbleBoardHide' });
		eventEmitter.broadcast({ type: 'boardShow' });

		try {
			const landHole = (hole: (typeof holes)[number]) =>
				stateGame.board[hole.reelIndex]?.landOneHole(hole.visibleRow) ?? Promise.resolve();

			if (stateBet.isTurbo || isLandSkipped()) {
				await Promise.all(holes.map(landHole));
			} else {
				for (let i = 0; i < holes.length; i += 1) {
					if (isLandSkipped()) {
						await Promise.all(holes.slice(i).map(landHole));
						break;
					}
					await landHole(holes[i]!);
					if (i < holes.length - 1 && !isLandSkipped()) {
						const interval =
							stateGame.anticipationIndex !== null
								? ANTICIPATION_LAND.symbolLandInterval
								: (stateGame.board[0]?.reelState.spinOptions().symbolLandInterval ?? 25);
						if (interval > 0) {
							await Promise.race([
								waitForTimeout(interval),
								new Promise<void>((resolve) => onLandSkip(resolve)),
							]);
						}
					}
				}
			}
		} finally {
			stateGame.board.forEach((reel) => reel.finishHoleSpin());
		}
	},
	newExpandingWilds: async (bookEvent: BookEventOfType<'newExpandingWilds'>) => {
		if (!bookEvent.newWilds?.length) return;
		await waitForTimeout(stateBet.isTurbo ? 80 : 280);
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_wild_explode' });
		await eventEmitter.broadcastAsync({
			type: 'wildExpandPlay',
			reels: bookEvent.newWilds.map((wild) => wild.reel),
			sourceRows: bookEvent.newWilds.map((wild) => wild.row),
		});
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_landing' });
		await eventEmitter.broadcastAsync({
			type: 'wildMultiplierPlay',
			wilds: bookEvent.newWilds.map((wild) => ({
				reel: wild.reel,
				multiplier: wild.mult,
			})),
		});
		fillExpandedReels(bookEvent.newWilds);
	},
	fireFramesPlaced: async (bookEvent: BookEventOfType<'fireFramesPlaced'>) => {
		setFireFrames(bookEvent.positions ?? []);
		stateGame.fireFramesNew = bookEvent.newPositions ?? [];
		if (stateGame.fireFramesNew.length) {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
		}
		const fadeMs = stateBet.isTurbo ? 60 : FIRE_RIM_FADE_MS;
		if (stateGame.fireFramesNew.length || stateGame.fireFramesLeaving.length) {
			await waitForTimeout(fadeMs);
		}
		stateGame.fireFramesNew = [];
		stateGame.fireFramesLeaving = [];
	},
	contrabandSwap: async (bookEvent: BookEventOfType<'contrabandSwap'>) => {
		const toSymbol = bookEvent.to?.symbol;
		if (!toSymbol) return;
		const positions = bookEvent.positions?.length
			? bookEvent.positions
			: [{ reel: bookEvent.to.reel, row: bookEvent.to.row }];
		if (!positions.length) return;

		const stamp = (reel: number, row: number, symbol: string) => {
			const cell = stateGame.board[reel]?.reelState.symbols[row];
			const fireFrame = Boolean(cell?.rawSymbol?.fireFrame);
			applyBoardCell(reel, row, {
				name: symbol as RawSymbol['name'],
				...(symbol === 'W' || symbol === 'EW' ? { wild: true } : {}),
				...(fireFrame ? { fireFrame: true } : {}),
			});
			if (cell) cell.symbolState = 'win';
		};

		for (const pos of positions) {
			const cell = stateGame.board[pos.reel]?.reelState.symbols[pos.row];
			if (cell) cell.symbolState = 'win';
		}
		stateGame.winPositions = positions.map((pos) => ({ reel: pos.reel, row: pos.row }));
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_wild_explode' });
		await waitForTimeout(stateBet.isTurbo ? 90 : 240);
		for (const pos of positions) stamp(pos.reel, pos.row, toSymbol);
		await waitForTimeout(stateBet.isTurbo ? 90 : 320);
		for (const pos of positions) {
			const cell = stateGame.board[pos.reel]?.reelState.symbols[pos.row];
			if (cell) cell.symbolState = 'static';
		}
		stateGame.winPositions = [];
	},
	wildUpgrade: async (bookEvent: BookEventOfType<'wildUpgrade'>) => {
		const chooser = mergeChooserWithBaits(bookEvent.positions ?? [], bookEvent.results ?? []);
		if (!chooser.positions.length) return;
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_reel_stop_1' });
		await eventEmitter.broadcastAsync({
			type: 'wildChooserPlay',
			positions: chooser.positions,
			results: chooser.results,
		});
	},
	expandWild: async (bookEvent: BookEventOfType<'expandWild'>) => {
		if (!bookEvent.reels?.length) return;
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_wild_explode' });
		await eventEmitter.broadcastAsync({
			type: 'wildExpandPlay',
			reels: bookEvent.reels,
			sourceRows: bookEvent.sourceRows,
		});
		fillExpandedReels(
			bookEvent.reels.map((reel, index) => ({
				reel,
				row: bookEvent.sourceRows[index] ?? 1,
				mult: undefined,
			})),
		);
	},
	wildMultiplier: async (bookEvent: BookEventOfType<'wildMultiplier'>) => {
		if (!bookEvent.wilds?.length) return;
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_landing' });
		await eventEmitter.broadcastAsync({
			type: 'wildMultiplierPlay',
			wilds: bookEvent.wilds,
		});
		for (const wild of bookEvent.wilds) {
			applyReelWildMultiplier(wild.reel, wild.multiplier);
		}
	},
	updateExpandingWilds: async () => {
		// EW is not sticky; each spin lands, expands, then leaves.
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		const modeKey = normalizeBonusMode(stateBet.activeBetModeKey);
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		await animateSymbols({ positions: bookEvent.positions });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await showBonusIntro({
			modeKey,
			totalFreeSpins: bookEvent.totalFs,
			kind: 'trigger',
		});
		stateGame.gameType = 'freegame';
		stateGame.freeSpinBackground = freeSpinBackgroundFromTotal(bookEvent.totalFs);
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		stateUi.freeSpinCounterShow = true;
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.totalFs,
			total: bookEvent.totalFs,
		});
		stateUi.freeSpinCounterCurrent = bookEvent.totalFs;
		stateUi.freeSpinCounterTotal = bookEvent.totalFs;
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
	},
	freeSpinRetrigger: async (bookEvent: BookEventOfType<'freeSpinRetrigger'>) => {
		const modeKey = normalizeBonusMode(stateBet.activeBetModeKey);
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await showBonusIntro({
			modeKey,
			totalFreeSpins: bookEvent.totalFs,
			kind: 'retrigger',
		});
		// Retrigger: new total; keep “remaining after current” by adding the granted spins.
		const prevTotal = stateUi.freeSpinCounterTotal || 0;
		const prevLeft = stateUi.freeSpinCounterCurrent || 0;
		const added = Math.max(0, bookEvent.totalFs - prevTotal);
		const left = prevLeft + added;
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: left,
			total: bookEvent.totalFs,
		});
		stateUi.freeSpinCounterShow = true;
		stateUi.freeSpinCounterCurrent = left;
		stateUi.freeSpinCounterTotal = bookEvent.totalFs;
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
	},
	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		stateUi.freeSpinCounterShow = true;
		// Math: amount = 0-based index at start of this spin.
		// Show spins still remaining AFTER this one (last spin → 0).
		const left = Math.max(0, bookEvent.total - bookEvent.amount - 1);
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: left,
			total: bookEvent.total,
		});
		stateUi.freeSpinCounterCurrent = left;
		stateUi.freeSpinCounterTotal = bookEvent.total;
	},
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		const resolvedLevel = resolvePresentWinLevel(bookEvent.amount, bookEvent.winLevel);
		const winLevelData = winLevelMap[resolvedLevel];

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		stateGame.gameType = 'basegame';
		stateGame.positionMultipliers = createInitialPositionMultipliers();
		setFireFrames([]);
		stateGame.fireFramesNew = [];
		await waitForTimeout(stateBet.isTurbo ? 40 : FIRE_RIM_FADE_MS);
		stateGame.fireFramesLeaving = [];
		eventEmitter.broadcast({ type: 'wildOverlayClear' });
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		// UI already hidden above — skip max's uiHide to avoid FadeContainer races.
		if (winLevelData?.sound?.sfx) {
			eventEmitter.broadcast({ type: 'soundOnce', name: winLevelData.sound.sfx });
		}
		if (winLevelData?.sound?.bgm) {
			eventEmitter.broadcast({ type: 'soundMusic', name: winLevelData.sound.bgm });
		}
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			amount: bookEvent.amount,
			winLevelData,
		});
		eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
		eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		stateUi.freeSpinCounterShow = false;
		stateUi.freeSpinCounterCurrent = 0;
		stateUi.freeSpinCounterTotal = 0;
		stateGame.freeSpinBackground = null;
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>, { bookEvents }: BookEventContext) => {
		// Spin win only drives the center win presentation. Cumulative TOTAL WIN
		// comes from setTotalWin — don't overwrite it each free spin.
		if (!isEndOfSpinSetWin(bookEvent, bookEvents)) return;
		// MAX WIN is owned by the wincap event — never start it from a pre-cap setWin.
		if (resolvePresentWinLevel(bookEvent.amount, bookEvent.winLevel) >= 10) return;
		await presentWin(bookEvent.amount, bookEvent.winLevel);
	},
	wincap: async (bookEvent: BookEventOfType<'wincap'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
		await presentWin(bookEvent.amount, 10);
		// Round ends here — clear freegame UI if max win hit mid-feature.
		stateGame.gameType = 'basegame';
		stateGame.positionMultipliers = createInitialPositionMultipliers();
		setFireFrames([]);
		stateGame.fireFramesNew = [];
		await waitForTimeout(stateBet.isTurbo ? 40 : FIRE_RIM_FADE_MS);
		stateGame.fireFramesLeaving = [];
		stateGame.freeSpinBackground = null;
		eventEmitter.broadcast({ type: 'wildOverlayClear' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		stateUi.freeSpinCounterShow = false;
		stateUi.freeSpinCounterCurrent = 0;
		stateUi.freeSpinCounterTotal = 0;
		await eventEmitter.broadcastAsync({ type: 'maxWinPopupAwait' });
	},
	finalWin: async () => {
		// keep last win on the bar until the next spin
	},
	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		const { bookEvents } = bookEvent;

		function findLastBookEvent<T>(type: T) {
			return _.findLast(bookEvents, (bookEvent) => bookEvent.type === type) as
				| BookEventOfType<T>
				| undefined;
		}

		const lastFreeSpinTriggerEvent = findLastBookEvent('freeSpinTrigger' as const);
		const lastUpdateFreeSpinEvent = findLastBookEvent('updateFreeSpin' as const);
		const lastSetTotalWinEvent = findLastBookEvent('setTotalWin' as const);
		const lastUpdateGridEvent = findLastBookEvent('updateGrid' as const);
		const lastFireFramesEvent = findLastBookEvent('fireFramesPlaced' as const);

		if (lastFreeSpinTriggerEvent) await playBookEvent(lastFreeSpinTriggerEvent, { bookEvents });
		if (lastUpdateFreeSpinEvent) playBookEvent(lastUpdateFreeSpinEvent, { bookEvents });
		if (lastSetTotalWinEvent) playBookEvent(lastSetTotalWinEvent, { bookEvents });
		if (lastUpdateGridEvent) await playBookEvent(lastUpdateGridEvent, { bookEvents });
		if (lastFireFramesEvent) await playBookEvent(lastFireFramesEvent, { bookEvents });
	},
};
