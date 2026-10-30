<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	type AddingBoard = RawSymbol[][];
	type ExplodingPositions = Position[];

	export type EmitterEventTumbleBoard =
		| { type: 'tumbleBoardShow' }
		| { type: 'tumbleBoardHide' }
		| { type: 'tumbleBoardInit'; addingBoard: AddingBoard; explodingPositions: ExplodingPositions }
		| { type: 'tumbleBoardReset' }
		| { type: 'tumbleBoardExplode'; explodingPositions: ExplodingPositions }
		| { type: 'tumbleBoardFillHoles' };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';

	import { BoardContext } from 'components-shared';
	import { stateBet } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import TumbleBoardBase from './TumbleBoardBase.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import { getSymbolY } from '../game/utils';
	import { getContext } from '../game/context';
	import type { SymbolState } from '../game/types';

	type HoleFill = {
		reel: number;
		row: number;
		rawSymbol: RawSymbol;
	};

	const context = getContext();

	let show = $state(false);
	let tumbleIdSeq = 0;
	let pendingFills: HoleFill[] = [];

	const createTumbleSymbol = ({
		initY,
		rawSymbol,
		initScale = 1,
	}: {
		initY: number;
		rawSymbol: RawSymbol;
		initScale?: number;
	}) => {
		const symbolY = new Tween(initY);
		const symbolScale = new Tween(initScale);
		const oncomplete = () => {};
		tumbleIdSeq += 1;

		const tumbleSymbol = $state({
			id: `tumble-${tumbleIdSeq}`,
			symbolY,
			symbolScale,
			rawSymbol,
			symbolState: 'static' as SymbolState,
			oncomplete,
		});

		return tumbleSymbol;
	};

	const initTumbleBoardBase = () =>
		context.stateGameDerived.boardRaw().map((rawSymbolReel) =>
			rawSymbolReel.map((rawSymbol, symbolIndex) => {
				const initY = getSymbolY(symbolIndex - 1);
				return createTumbleSymbol({ initY, rawSymbol });
			}),
		);

	/** Pair each exploded cell with its replacement, top-to-bottom per reel. */
	const buildHoleFills = ({
		addingBoard,
		explodingPositions,
	}: {
		addingBoard: AddingBoard;
		explodingPositions: ExplodingPositions;
	}): HoleFill[] => {
		const rowsByReel = new Map<number, number[]>();
		for (const pos of explodingPositions) {
			const rows = rowsByReel.get(pos.reel) ?? [];
			rows.push(pos.row);
			rowsByReel.set(pos.reel, rows);
		}

		const fills: HoleFill[] = [];
		for (const [reel, rows] of rowsByReel) {
			const sortedRows = [...rows].sort((a, b) => a - b);
			const newSymbols = addingBoard[reel] ?? [];
			sortedRows.forEach((row, i) => {
				const rawSymbol = newSymbols[i];
				if (!rawSymbol) return;
				fills.push({ reel, row, rawSymbol });
			});
		}
		return fills;
	};

	context.eventEmitter.subscribeOnMount({
		tumbleBoardShow: () => (show = true),
		tumbleBoardHide: () => (show = false),
		tumbleBoardInit: ({ addingBoard, explodingPositions }) => {
			pendingFills = buildHoleFills({ addingBoard, explodingPositions });
			context.stateGame.tumbleBoardAdding = [];
			context.stateGame.tumbleBoardBase = initTumbleBoardBase();
		},
		tumbleBoardReset: () => {
			pendingFills = [];
			context.stateGame.tumbleBoardAdding = [];
			context.stateGame.tumbleBoardBase = [];
		},
		tumbleBoardExplode: async ({ explodingPositions }) => {
			for (const position of explodingPositions) {
				const tumbleSymbol = context.stateGame.tumbleBoardBase[position.reel]?.[position.row];
				if (tumbleSymbol) tumbleSymbol.symbolState = 'explosion';
			}
			await waitForTimeout(stateBet.isTurbo ? 40 : 90);
		},
		tumbleBoardFillHoles: async () => {
			// Spin in place — no vertical travel, so neighbors never get overlapped.
			const duration = stateBet.isTurbo ? 160 : 320;

			await Promise.all(
				pendingFills.map(async (fill, i) => {
					const targetY = getSymbolY(fill.row - 1);
					const incoming = createTumbleSymbol({
						initY: targetY,
						rawSymbol: fill.rawSymbol,
						initScale: 0.15,
					});
					incoming.symbolState = 'spin';
					context.stateGame.tumbleBoardBase[fill.reel][fill.row] = incoming;

					await waitForTimeout((stateBet.isTurbo ? 20 : 40) * (i % 3));
					await incoming.symbolScale.set(1, {
						duration,
						easing: backOut,
					});
					incoming.symbolState = 'land';
					context.stateGameDerived.onSymbolLand({
						rawSymbol: incoming.rawSymbol,
						reelIndex: fill.reel,
						row: fill.row - 1,
					});
					await waitForTimeout(stateBet.isTurbo ? 40 : 100);
					incoming.symbolState = 'static';
				}),
			);
		},
	});
</script>

{#if show}
	<BoardContext animate={false}>
		<BoardContainer>
			<BoardMask />
			<TumbleBoardBase />
		</BoardContainer>
	</BoardContext>

	<BoardContext animate={true}>
		<BoardContainer>
			<BoardMask />
			<TumbleBoardBase />
		</BoardContainer>
	</BoardContext>
{/if}
