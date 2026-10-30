<script lang="ts">
	import ReelSymbol from './ReelSymbol.svelte';
	import { getContext } from '../game/context';
	import { isVisibleBoardCell } from '../game/utils';

	const context = getContext();
</script>

{#each context.stateGame.board as reel, reelIndex (reelIndex)}
	{#each reel.reelState.symbols as reelSymbol, symbolIndex (`${reelIndex}-${symbolIndex}`)}
		{#if isVisibleBoardCell(reelIndex, reelSymbol.symbolIndexOfBoard)}
			<ReelSymbol {reelIndex} {reelSymbol} />
		{/if}
	{/each}
{/each}
