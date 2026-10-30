import { backOut, linear } from 'svelte/easing';
import { Tween } from 'svelte/motion';

import { stateBet } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';
import { createInterruptible } from 'utils-shared/interruptible';

import type { RawSymbol } from './types';
import { ANTICIPATION_LAND, CELL_SPIN_POOL, REEL_ROWS, SPIN_BLUR_FACES, SPIN_OPTIONS_FAST } from './constants';

type SpinType = 'normal' | 'fast' | 'anticipated';

export type CellSpinMotion = 'spinning' | 'stopped';

export type CellSpinOptions = {
	reelPreSpinSpeed: number;
	reelSpinSpeed: number;
	reelBounceBackSpeed: number;
	reelBounceSizeMulti: number;
	reelPaddingMultiplierNormal: number;
	reelPaddingMultiplierAnticipated: number;
	reelSpinDelay: number;
	symbolLandInterval: number;
};

type CreateOptions<TRawSymbol extends RawSymbol, TSymbolState extends string> = {
	initialSymbols: TRawSymbol[];
	initialSymbolState: TSymbolState;
	reelIndex: number;
	symbolHeight: number;
	onReelStopping: () => void;
	onSpinStart?: () => void;
	isAnticipationLand?: () => boolean;
	onSymbolLand: (args: { rawSymbol: TRawSymbol; reelIndex: number; row: number }) => void;
};

const copySymbol = <TRawSymbol extends RawSymbol>(rawSymbol: TRawSymbol): TRawSymbol =>
	({ ...rawSymbol }) as TRawSymbol;

const FALLBACK_SPIN_SPEED = 2.6;
const FALLBACK_PRE_SPIN_SPEED = 2.4;
const FALLBACK_BOUNCE_SPEED = 0.18;
const MAX_TWEEN_MS = 4000;
const TURBO_LAND_MS = 140;
const TURBO_BOUNCE_MS = 50;

/** Top-to-bottom on a reel, then the next reel to the right (leftmost reel first). */
export const cellLandOrder = (reelIndex: number, row: number) => {
	let order = 0;
	for (let reel = 0; reel < reelIndex; reel += 1) {
		order += REEL_ROWS[reel] ?? 0;
	}
	return order + row;
};

export const isLandSkipped = () => landGate.skip;

export const onLandSkip = (resolve: () => void) => landGate.onSkip(resolve);

type LandWaiter = { order: number; wave: number; resolve: () => void };

const landGate = {
	wave: 0,
	next: 0,
	skip: false,
	waiters: [] as LandWaiter[],
	skipWaiters: [] as Array<() => void>,
	reset() {
		this.wave += 1;
		this.next = 0;
		this.skip = false;
		const leftover = this.waiters;
		this.waiters = [];
		this.skipWaiters = [];
		leftover.forEach((waiter) => waiter.resolve());
	},
	onSkip(resolve: () => void) {
		if (this.skip) {
			resolve();
			return;
		}
		this.skipWaiters.push(resolve);
	},
	async wait(order: number, wave: number) {
		if (this.skip || wave !== this.wave || order <= this.next) return;
		await Promise.race([
			new Promise<void>((resolve) => {
				this.waiters.push({ order, wave, resolve });
			}),
			new Promise<void>((resolve) => this.onSkip(resolve)),
			waitForTimeout(12000),
		]);
	},
	advance() {
		this.next += 1;
		const ready: LandWaiter[] = [];
		const rest: LandWaiter[] = [];
		for (const waiter of this.waiters) {
			if (waiter.wave !== this.wave) {
				ready.push(waiter);
				continue;
			}
			if (waiter.order <= this.next) ready.push(waiter);
			else rest.push(waiter);
		}
		this.waiters = rest;
		ready.forEach((waiter) => waiter.resolve());
	},
	flush() {
		this.skip = true;
		const leftover = this.waiters;
		this.waiters = [];
		const skipWaiters = this.skipWaiters;
		this.skipWaiters = [];
		leftover.forEach((waiter) => waiter.resolve());
		skipWaiters.forEach((resolve) => resolve());
	},
};

/** Click during preSpin is consumed on the following land; click during land does not carry over. */
let skipRequested = false;
let landPrepared = false;

const tweenDuration = (distance: number, speed: number) => {
	if (!Number.isFinite(distance) || distance <= 0) return 0;
	if (!Number.isFinite(speed) || speed <= 0) return 0;
	return Math.min(distance / speed, MAX_TWEEN_MS);
};

const tweenTo = async (
	tween: Tween<number>,
	target: number,
	duration: number,
	isLive: () => boolean,
	easing = linear,
) => {
	if (!isLive()) return;
	const ms = Number.isFinite(duration) && duration > 0 ? duration : 0;
	if (ms <= 0) {
		await tween.set(target, { duration: 0 });
		return;
	}

	await Promise.race([
		tween.set(target, { duration: ms, easing }),
		waitForTimeout(ms + 40),
	]);
	if (!isLive()) return;
	await tween.set(target, { duration: 0 });
};

const buildCellStrip = <TRawSymbol extends RawSymbol>(
	current: TRawSymbol,
	landing: TRawSymbol,
	blurCount: number,
	offset: number,
): { strip: TRawSymbol[]; stopIndex: number } => {
	const pool = CELL_SPIN_POOL as readonly TRawSymbol[];
	const count = Math.max(2, Math.floor(Number.isFinite(blurCount) ? blurCount : 2));
	const strip: TRawSymbol[] = [copySymbol(current)];

	for (let i = 0; i < count; i += 1) {
		strip.push(copySymbol(pool[(offset + i) % pool.length]!));
	}

	strip.push(copySymbol(landing));
	strip.push(copySymbol(pool[(offset + count) % pool.length]!));

	return { strip, stopIndex: strip.length - 2 };
};

const buildLoopStrip = <TRawSymbol extends RawSymbol>(
	current: TRawSymbol,
	offset: number,
): TRawSymbol[] => {
	const pool = CELL_SPIN_POOL as readonly TRawSymbol[];
	const strip: TRawSymbol[] = [copySymbol(current)];
	for (let i = 0; i < pool.length; i += 1) {
		strip.push(copySymbol(pool[(offset + i) % pool.length]!));
	}
	return strip;
};

export function createReelForCellSpinning<
	TRawSymbol extends RawSymbol,
	TSymbolState extends string,
>(reelOptions: CreateOptions<TRawSymbol, TSymbolState>) {
	const getSymbolY = (symbolIndexOfBoard: number) =>
		(symbolIndexOfBoard + 0.5) * reelOptions.symbolHeight;

	const visibleRows = REEL_ROWS[reelOptions.reelIndex] ?? reelOptions.initialSymbols.length - 2;

	const createReelSymbol = (reelSymbolOptions: { rawSymbol: TRawSymbol; symbolIndex: number }) => {
		const symbolIndexOfBoard = reelSymbolOptions.symbolIndex - 1;
		const initY = getSymbolY(symbolIndexOfBoard);

		const reelSymbol = $state({
			rawSymbol: reelSymbolOptions.rawSymbol,
			symbolIndexOfBoard,
			symbolY: new Tween(initY),
			stripY: new Tween(0),
			spinStrip: [] as TRawSymbol[],
			symbolState: reelOptions.initialSymbolState,
			oncomplete: () => {},
		});

		return reelSymbol;
	};

	type ReelSymbol = ReturnType<typeof createReelSymbol>;

	const createReelSymbols = (rawSymbols: TRawSymbol[]) =>
		rawSymbols.map((rawSymbol, symbolIndex) => createReelSymbol({ rawSymbol, symbolIndex }));

	const isVisibleCell = (reelSymbol: ReelSymbol) =>
		reelSymbol.symbolIndexOfBoard >= 0 && reelSymbol.symbolIndexOfBoard < visibleRows;

	const visibleCells = () => reelState.symbols.filter(isVisibleCell);

	const updateSymbols = (value: TRawSymbol[]) => {
		reelState.symbols.forEach((reelSymbol, symbolIndex) => {
			const next = value[symbolIndex];
			if (!next) return;
			reelSymbol.rawSymbol = next;
			reelSymbol.symbolState = 'static' as TSymbolState;
			reelSymbol.spinStrip = [];
			void reelSymbol.stripY.set(0, { duration: 0 });
			void reelSymbol.symbolY.set(getSymbolY(reelSymbol.symbolIndexOfBoard), { duration: 0 });
		});
	};

	const reelLength = reelOptions.initialSymbols.length;
	const interruptible = createInterruptible();
	const loopIdByCell = new WeakMap<ReelSymbol, number>();
	const loopingCells = new WeakSet<ReelSymbol>();

	let readyToSpinFn = () => {};

	const reelState = $state({
		symbols: createReelSymbols(reelOptions.initialSymbols),
		motion: 'stopped' as CellSpinMotion,
		spinType: 'normal' as SpinType,
		anticipating: false,
		get readyToSpin() {
			return readyToSpinFn;
		},
		set readyToSpin(fn: () => void) {
			readyToSpinFn = fn;
			fn();
		},
		spinOptions: () => ({}) as CellSpinOptions,
	});

	const basePaddingSize = () => reelState.spinOptions().reelPaddingMultiplierNormal ?? 9;
	const anticipatedPaddingSize = () =>
		reelState.spinOptions().reelPaddingMultiplierAnticipated ?? 16;

	let targetSymbols = reelOptions.initialSymbols;
	let onSpinFinishing: () => void = () => {};
	let noStop = false;
	let paddingSize = 0;
	let isPreSpinning = false;
	let preSpinSession = 0;

	const loopId = (cell: ReelSymbol) => loopIdByCell.get(cell) ?? 0;

	const bumpLoopId = (cell: ReelSymbol) => {
		const next = loopId(cell) + 1;
		loopIdByCell.set(cell, next);
		loopingCells.delete(cell);
		return next;
	};

	const delaySpinByReelIndex = async () => {
		const delay = reelState.spinOptions().reelSpinDelay ?? 0;
		if (delay > 0) await waitForTimeout(delay * reelOptions.reelIndex);
	};

	const preSpinCellLoop = async (cell: ReelSymbol, id: number) => {
		const isLive = () => loopId(cell) === id;
		const offset = (reelOptions.reelIndex * 5 + cell.symbolIndexOfBoard * 3) % CELL_SPIN_POOL.length;
		cell.symbolState = 'spin' as TSymbolState;

		while (isLive()) {
			const strip = buildLoopStrip(cell.rawSymbol, offset);
			if (!isLive()) break;
			cell.spinStrip = strip;
			await tweenTo(cell.stripY, 0, 0, isLive);
			if (!isLive()) break;
			const distance = (strip.length - 1) * reelOptions.symbolHeight;
			const speed = reelState.spinOptions().reelPreSpinSpeed || FALLBACK_PRE_SPIN_SPEED;
			await tweenTo(cell.stripY, distance, tweenDuration(distance, speed), isLive);
		}
	};

	const ensureLooping = (cell: ReelSymbol) => {
		if (loopingCells.has(cell)) return;
		const id = bumpLoopId(cell);
		loopingCells.add(cell);
		void (async () => {
			try {
				await preSpinCellLoop(cell, id);
			} finally {
				if (loopId(cell) === id) loopingCells.delete(cell);
			}
		})();
	};

	const stopLoop = (cell: ReelSymbol) => {
		bumpLoopId(cell);
	};

	const preSpin = async ({ isTurboBeforeAll }: { isTurboBeforeAll: boolean }) => {
		const session = ++preSpinSession;
		isPreSpinning = true;
		if (reelOptions.reelIndex === 0) {
			skipRequested = false;
			landPrepared = false;
			landGate.skip = false;
			reelOptions.onSpinStart?.();
		}
		reelState.spinType = isTurboBeforeAll ? 'fast' : 'normal';
		if (!isTurboBeforeAll) await delaySpinByReelIndex();
		if (session !== preSpinSession || !isPreSpinning) return;

		reelState.motion = 'spinning';
		for (const cell of visibleCells()) {
			ensureLooping(cell);
		}
		reelState.readyToSpin();
	};

	const slideStrip = async (cell: ReelSymbol, targetY: number, duration: number) => {
		if (duration <= 0) {
			await tweenTo(cell.stripY, targetY, 0, () => true);
			return;
		}

		if (stateBet.isTurbo || landGate.skip) {
			await tweenTo(cell.stripY, targetY, Math.min(duration, TURBO_LAND_MS), () => true);
			return;
		}

		if (noStop) {
			await tweenTo(cell.stripY, targetY, duration, () => true);
			return;
		}

		const stillSequential = () => !landGate.skip;
		const { interrupted } = await interruptible.add(() =>
			tweenTo(cell.stripY, targetY, duration, stillSequential),
		);
		if (interrupted || landGate.skip) {
			await tweenTo(cell.stripY, targetY, TURBO_LAND_MS, () => true);
		}
	};

	const playLandAnimation = async (cell: ReelSymbol, landing: TRawSymbol, turbo: boolean) => {
		stopLoop(cell);
		const options = reelState.spinOptions();
		const anticipate = !turbo && Boolean(reelOptions.isAnticipationLand?.());
		const offset =
			(reelOptions.reelIndex * 5 + cell.symbolIndexOfBoard * 3 + paddingSize) %
			CELL_SPIN_POOL.length;
		const blurCount = turbo
			? Math.max(SPIN_OPTIONS_FAST.reelPaddingMultiplierNormal, 5)
			: anticipate
				? ANTICIPATION_LAND.blurCount
				: SPIN_BLUR_FACES;
		const { strip, stopIndex } = buildCellStrip(cell.rawSymbol, landing, blurCount, offset);

		cell.spinStrip = strip;
		cell.symbolState = 'spin' as TSymbolState;
		await tweenTo(cell.stripY, 0, 0, () => true);

		const landY = stopIndex * reelOptions.symbolHeight;
		const bounceSizeMulti = turbo
			? SPIN_OPTIONS_FAST.reelBounceSizeMulti
			: options.reelBounceSizeMulti || 0.08;
		const bounce = reelOptions.symbolHeight * bounceSizeMulti;
		const speed = turbo
			? SPIN_OPTIONS_FAST.reelSpinSpeed
			: anticipate
				? ANTICIPATION_LAND.reelSpinSpeed
				: options.reelSpinSpeed || FALLBACK_SPIN_SPEED;
		const duration = tweenDuration(Math.abs(landY + bounce), speed);

		await slideStrip(cell, landY + bounce, duration);

		cell.rawSymbol = landing;
		cell.symbolState = 'land' as TSymbolState;
		reelOptions.onSymbolLand({
			rawSymbol: landing,
			reelIndex: reelOptions.reelIndex,
			row: cell.symbolIndexOfBoard,
		});

		if (cell.symbolIndexOfBoard === visibleRows - 1) {
			onSpinFinishing();
		}

		const bounceSpeed = turbo
			? SPIN_OPTIONS_FAST.reelBounceBackSpeed
			: options.reelBounceBackSpeed || FALLBACK_BOUNCE_SPEED;
		const bounceMs = turbo || landGate.skip ? TURBO_BOUNCE_MS : tweenDuration(bounce, bounceSpeed);
		await tweenTo(cell.stripY, landY, bounceMs, () => true, backOut);

		cell.spinStrip = [];
		await tweenTo(cell.stripY, 0, 0, () => true);
	};

	const landCell = async (
		cell: ReelSymbol,
		sequential: boolean,
		wave: number,
		order = cellLandOrder(reelOptions.reelIndex, cell.symbolIndexOfBoard),
	) => {
		if (sequential) await landGate.wait(order, wave);
		if (wave !== landGate.wave) return;

		const symbolIndex = cell.symbolIndexOfBoard + 1;
		const landing = targetSymbols[symbolIndex] ?? cell.rawSymbol;
		const turbo = landGate.skip || stateBet.isTurbo;
		if (turbo && !sequential) {
			await waitForTimeout(40 * reelOptions.reelIndex);
		}

		await playLandAnimation(cell, landing, turbo);

		if (sequential && !turbo && wave === landGate.wave) {
			const interval = reelOptions.isAnticipationLand?.()
				? ANTICIPATION_LAND.symbolLandInterval
				: (reelState.spinOptions().symbolLandInterval ?? 0);
			if (interval > 0) {
				await Promise.race([
					waitForTimeout(interval),
					new Promise<void>((resolve) => landGate.onSkip(resolve)),
				]);
			}
			landGate.advance();
		}
	};

	const prepareToSpin = (prepareToSpinOptions: {
		noStop: boolean;
		spinType: SpinType;
		symbols: TRawSymbol[];
		paddingPosition: number;
		onSpinFinishing: () => void;
		previousPaddingSize: number;
	}) => {
		if (reelOptions.reelIndex === 0) {
			landGate.reset();
			if (skipRequested) landGate.skip = true;
			skipRequested = false;
			landPrepared = true;
		}

		reelState.spinType = prepareToSpinOptions.spinType;
		noStop = prepareToSpinOptions.noStop;
		targetSymbols = prepareToSpinOptions.symbols;
		onSpinFinishing = prepareToSpinOptions.onSpinFinishing;

		const GET_PADDING_SIZE_MAP = {
			fast: 5,
			normal: basePaddingSize(),
			anticipated: anticipatedPaddingSize() + prepareToSpinOptions.previousPaddingSize,
		};

		paddingSize = GET_PADDING_SIZE_MAP[prepareToSpinOptions.spinType];
		return paddingSize;
	};

	const spin = async () => {
		preSpinSession += 1;
		isPreSpinning = false;
		reelState.motion = 'spinning';
		reelState.readyToSpin();

		const cells = visibleCells();
		for (const cell of cells) ensureLooping(cell);

		const options = reelState.spinOptions();
		const sequential = !stateBet.isTurbo && (options.symbolLandInterval ?? 0) > 0;
		const wave = landGate.wave;

		await Promise.all(cells.map((cell) => landCell(cell, sequential, wave)));

		reelState.symbols.forEach((reelSymbol, symbolIndex) => {
			const next = targetSymbols[symbolIndex];
			if (!next) return;
			stopLoop(reelSymbol);
			reelSymbol.rawSymbol = next;
			if (!isVisibleCell(reelSymbol)) {
				reelSymbol.symbolState = 'static' as TSymbolState;
				reelSymbol.spinStrip = [];
			}
		});

		reelState.motion = 'stopped';
		interruptible.clear();
	};

	const startHoleLoops = (visibleRows: number[]) => {
		const rowSet = new Set(visibleRows);
		const cells = visibleCells().filter((cell) => rowSet.has(cell.symbolIndexOfBoard));
		if (cells.length === 0) return;
		isPreSpinning = false;
		reelState.motion = 'spinning';
		reelState.readyToSpin();
		for (const cell of cells) ensureLooping(cell);
	};

	const landOneHole = async (visibleRow: number) => {
		const cell = visibleCells().find((item) => item.symbolIndexOfBoard === visibleRow);
		if (!cell) return;
		const landing = targetSymbols[cell.symbolIndexOfBoard + 1] ?? cell.rawSymbol;
		await playLandAnimation(cell, landing, landGate.skip || stateBet.isTurbo);
	};

	const finishHoleSpin = () => {
		reelState.symbols.forEach((reelSymbol, symbolIndex) => {
			const next = targetSymbols[symbolIndex];
			stopLoop(reelSymbol);
			if (!next) return;
			reelSymbol.rawSymbol = next;
			reelSymbol.symbolState = 'static' as TSymbolState;
			reelSymbol.spinStrip = [];
			void reelSymbol.stripY.set(0, { duration: 0 });
		});
		reelState.motion = 'stopped';
		interruptible.clear();
	};

	const setSymbolsWithRawSymbols = (value?: TRawSymbol[]) => {
		preSpinSession += 1;
		isPreSpinning = false;
		reelState.motion = 'stopped';
		visibleCells().forEach(stopLoop);
		if (value) updateSymbols(value);
	};

	const stop = () => {
		landGate.flush();
		if (!landPrepared) skipRequested = true;
		interruptible.interrupt();
	};

	const readyToSpinEffect = () => {
		$effect(() => {
			void reelState.motion;
			reelState.readyToSpin();
		});
	};

	return {
		reelIndex: reelOptions.reelIndex,
		symbolHeight: reelOptions.symbolHeight,
		onReelStopping: reelOptions.onReelStopping,
		reelLength,
		reelState,
		preSpin,
		prepareToSpin,
		spin,
		startHoleLoops,
		landOneHole,
		finishHoleSpin,
		stop,
		setSymbolsWithRawSymbols,
		readyToSpinEffect,
	};
}
