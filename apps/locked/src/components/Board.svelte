<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	export type EmitterEventBoard =
		| { type: 'boardSettle'; board: RawSymbol[][] }
		| { type: 'boardShow' }
		| { type: 'boardHide' }
		| {
				type: 'boardWithAnimateSymbols';
				symbolPositions: Position[];
		  };
</script>

<script lang="ts">
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { BoardContext } from 'components-shared';

	import { getContext } from '../game/context';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import BoardBase from './BoardBase.svelte';

	const context = getContext();

	let show = $state(true);

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => context.stateGameDerived.enhancedBoard.stop(),
		boardSettle: ({ board }) => context.stateGameDerived.enhancedBoard.settle(board),
		boardShow: () => (show = true),
		boardHide: () => (show = false),
		boardWithAnimateSymbols: async ({ symbolPositions }) => {
			// Assign oncomplete BEFORE flipping to 'win'. SymbolSprite's $effect can
			// fire synchronously on state change; if resolve isn't set yet, the book
			// player waits forever ("Action Running...").
			await Promise.all(
				symbolPositions.map(async (position) => {
					const reelSymbol =
						context.stateGame.board[position.reel]?.reelState.symbols[position.row];
					if (!reelSymbol) return;

					const finished = waitForResolve((resolve) => {
						reelSymbol.oncomplete = resolve;
					});
					reelSymbol.symbolState = 'win';
					await Promise.race([finished, waitForTimeout(800)]);
					reelSymbol.symbolState = 'postWinStatic';
					reelSymbol.oncomplete = () => {};
				}),
			);
		},
	});

	context.stateGameDerived.enhancedBoard.readyToSpinEffect();
</script>

{#if show}
	<BoardContext animate={false}>
		<BoardContainer>
			<BoardMask />
			<BoardBase />
		</BoardContainer>
	</BoardContext>

	<BoardContext animate={true}>
		<BoardContainer>
			<BoardMask />
			<BoardBase />
		</BoardContainer>
	</BoardContext>
{/if}
