<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventExpandingWild =
		| { type: 'wildOverlayClear' }
		| {
				type: 'wildChooserPlay';
				positions: Position[];
				results: ('W' | 'VS')[];
		  }
		| {
				type: 'wildExpandPlay';
				reels: number[];
				sourceRows: number[];
		  }
		| {
				type: 'wildMultiplierPlay';
				wilds: { reel: number; multiplier: number }[];
		  };
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut, expoOut } from 'svelte/easing';
	import { stateBet } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import {
		REEL_ROWS,
		SYMBOL_SIZE,
		WILD_CHOOSER_VALUES,
		WILD_CHOOSER_WINDOW,
		expandingWildMultiplierCenterY,
	} from '../game/constants';
	import { gridCellCenter, gridReelOrigin } from '../game/grid';
	import {
		buildStopStrip,
		multiplierPool,
		type WildChooserResult,
	} from '../game/overlayMiniReel';
	import BoardContainer from './BoardContainer.svelte';
	import WildChooserReel from './WildChooserReel.svelte';
	import ExpandingWildReel from './ExpandingWildReel.svelte';
	import WildMultiplierReel from './WildMultiplierReel.svelte';

	type ChooserView = {
		reel: number;
		row: number;
		result: WildChooserResult;
		strip: WildChooserResult[];
		stopIndex: number;
	};

	type ExpandView = {
		reel: number;
		sourceRow: number;
		rows: number;
		maskActive: boolean;
	};

	type MultiplierView = {
		reel: number;
		rows: number;
		strip: number[];
		stopIndex: number;
		duration: number;
	};

	const context = getContext();

	// Display lists are reactive. Tweens stay outside $state so `.set()` can settle.
	let choosers = $state<ChooserView[]>([]);
	let expands = $state<ExpandView[]>([]);
	let multipliers = $state<MultiplierView[]>([]);
	const chooserY = new Map<string, Tween<number>>();
	const maskY = new Map<number, Tween<number>>();
	const maskHeight = new Map<number, Tween<number>>();
	const multLanded = new Map<number, () => void>();

	let skipSpin = $state(false);
	let startedTurbo = false;
	let skipWaiters: Array<() => void> = [];
	let turboWatchId: ReturnType<typeof setInterval> | null = null;

	const turbo = () => stateBet.isTurbo;
	const chooserKey = (reel: number, row: number) => `${reel}:${row}`;

	const requestSkip = () => {
		if (skipSpin) return;
		skipSpin = true;
		const waiters = skipWaiters;
		skipWaiters = [];
		waiters.forEach((resolve) => resolve());
	};

	const snapTween = (tween: Tween<number>, target: number) => {
		const y = Number.isFinite(target) ? target : 0;
		return tween.set(y, { duration: 0 });
	};

	const spinSkippable = async (
		tween: Tween<number>,
		target: number,
		duration: number,
		easing: typeof expoOut = expoOut,
	) => {
		const y = Number.isFinite(target) ? target : 0;
		const ms = Number.isFinite(duration) && duration > 0 ? duration : 0;
		if (skipSpin || ms <= 0) {
			await snapTween(tween, y);
			return;
		}

		let settled = false;
		await new Promise<void>((resolve) => {
			const done = () => {
				if (settled) return;
				settled = true;
				skipWaiters = skipWaiters.filter((waiter) => waiter !== done);
				resolve();
			};
			skipWaiters.push(done);
			void tween.set(y, { duration: ms, easing }).then(done);
		});
		await snapTween(tween, y);
	};

	const settlePause = async (ms: number) => {
		if (skipSpin || ms <= 0) return;
		let settled = false;
		await new Promise<void>((resolve) => {
			const done = () => {
				if (settled) return;
				settled = true;
				skipWaiters = skipWaiters.filter((waiter) => waiter !== done);
				resolve();
			};
			skipWaiters.push(done);
			void waitForTimeout(ms).then(done);
		});
	};

	const stopTurboWatch = () => {
		if (turboWatchId === null) return;
		clearInterval(turboWatchId);
		turboWatchId = null;
	};

	const beginOverlaySequence = () => {
		skipSpin = false;
		skipWaiters = [];
		startedTurbo = turbo();
		stopTurboWatch();
		turboWatchId = setInterval(() => {
			if (stateBet.isTurbo && !startedTurbo) requestSkip();
		}, 50);
		context.eventEmitter.broadcast({ type: 'stopButtonEnable' });
	};

	const hideCells = (positions: Position[]) => {
		context.stateGame.hiddenOverlayCells = [...positions];
	};

	const coverReels = (reels: number[]) => {
		context.stateGame.coveredOverlayReels = [...reels];
	};

	const clearOverlay = () => {
		choosers = [];
		expands = [];
		multipliers = [];
		chooserY.clear();
		maskY.clear();
		maskHeight.clear();
		multLanded.clear();
		skipSpin = false;
		skipWaiters = [];
		stopTurboWatch();
		context.stateGame.hiddenOverlayCells = [];
		context.stateGame.coveredOverlayReels = [];
	};

	// layout-editor grid (defaults = the old fixed formula).
	const cellCenter = (reel: number, row: number) => gridCellCenter(reel, row - 1);

	const reelOrigin = (reel: number) => gridReelOrigin(reel);

	context.eventEmitter.subscribeOnMount({
		wildOverlayClear: () => {
			clearOverlay();
		},
		stopButtonClick: () => {
			requestSkip();
		},
		wildChooserPlay: async ({ positions, results }) => {
			if (!positions.length) return;

			beginOverlaySequence();
			const fast = turbo();
			const cycles = fast ? 3 : 12;
			const duration = fast ? 280 : 1700;
			const next: ChooserView[] = positions.map((position, index) => {
				const result = results[index] ?? 'W';
				const { strip, stopIndex } = buildStopStrip(WILD_CHOOSER_VALUES, result, cycles);
				const key = chooserKey(position.reel, position.row);
				chooserY.set(key, new Tween(0));
				return {
					reel: position.reel,
					row: position.row,
					result,
					strip,
					stopIndex,
				};
			});

			choosers = next;
			hideCells(positions);
			await tick();

			await Promise.all(
				next.map((chooser) => {
					const tween = chooserY.get(chooserKey(chooser.reel, chooser.row));
					if (!tween) return Promise.resolve();
					return spinSkippable(tween, chooser.stopIndex * WILD_CHOOSER_WINDOW.size, duration);
				}),
			);
			await settlePause(fast ? 60 : 280);
		},
		wildExpandPlay: async ({ reels, sourceRows }) => {
			if (!reels.length) return;

			const fast = turbo() || skipSpin;
			const duration = fast ? 140 : 560;
			const next: ExpandView[] = reels.map((reel, index) => {
				const rows = REEL_ROWS[reel] ?? 3;
				const sourceRow = sourceRows[index] ?? 1;
				const visibleRow = Math.max(0, sourceRow - 1);
				maskY.set(reel, new Tween(visibleRow * SYMBOL_SIZE));
				maskHeight.set(reel, new Tween(SYMBOL_SIZE));
				return {
					reel,
					sourceRow,
					rows,
					maskActive: true,
				};
			});

			expands = next;
			coverReels(reels);
			choosers = choosers.filter((chooser) => !reels.includes(chooser.reel));
			await tick();

			await Promise.all(
				next.map((expand) => {
					const yTween = maskY.get(expand.reel);
					const hTween = maskHeight.get(expand.reel);
					if (!yTween || !hTween) return Promise.resolve();
					return Promise.all([
						spinSkippable(yTween, 0, duration, cubicOut),
						spinSkippable(hTween, expand.rows * SYMBOL_SIZE, duration, cubicOut),
					]);
				}),
			);
			await settlePause(fast ? 40 : 180);
			expands = expands.map((expand) => ({ ...expand, maskActive: false }));
		},
		wildMultiplierPlay: async ({ wilds }) => {
			if (!wilds.length) return;

			if (!skipSpin) context.eventEmitter.broadcast({ type: 'stopButtonEnable' });
			const fast = turbo();
			const cycles = skipSpin ? 1 : fast ? 3 : 6;
			const duration = skipSpin ? 0 : fast ? 280 : 1600;

			const next: MultiplierView[] = wilds.map((wild) => {
				const expand = expands.find((item) => item.reel === wild.reel);
				const rows = expand?.rows ?? REEL_ROWS[wild.reel] ?? 5;
				const { strip, stopIndex } = buildStopStrip(multiplierPool(), wild.multiplier, cycles);
				return { reel: wild.reel, rows, strip, stopIndex, duration };
			});

			const landed = next.map(
				(mult) =>
					new Promise<void>((resolve) => {
						multLanded.set(mult.reel, resolve);
					}),
			);
			multipliers = next;
			await tick();
			await Promise.race([Promise.all(landed), waitForTimeout(duration + 400)]);
			await settlePause(fast ? 60 : 240);
		},
	});
</script>

<BoardContainer>
	{#each choosers as chooser (`chooser-${chooser.reel}-${chooser.row}`)}
		{@const pos = cellCenter(chooser.reel, chooser.row)}
		<WildChooserReel
			x={pos.x}
			y={pos.y}
			strip={chooser.strip}
			stripY={chooserY.get(chooserKey(chooser.reel, chooser.row))?.current ?? 0}
		/>
	{/each}
	{#each expands as expand (`expand-${expand.reel}`)}
		{@const pos = reelOrigin(expand.reel)}
		{@const mult = multipliers.find((item) => item.reel === expand.reel)}
		<ExpandingWildReel
			x={pos.x}
			y={pos.y}
			rows={expand.rows}
			maskY={maskY.get(expand.reel)?.current ?? 0}
			maskHeight={maskHeight.get(expand.reel)?.current ?? 0}
			maskActive={expand.maskActive}
		>
			{#if mult}
				<WildMultiplierReel
					x={SYMBOL_SIZE * 0.5}
					y={expandingWildMultiplierCenterY(expand.rows)}
					strip={mult.strip}
					stopIndex={mult.stopIndex}
					duration={mult.duration}
					skip={skipSpin}
					onLanded={() => multLanded.get(mult.reel)?.()}
				/>
			{/if}
		</ExpandingWildReel>
	{/each}
</BoardContainer>
