<script lang="ts">
	import TumbleSymbol from './TumbleSymbol.svelte';
	import { getContext } from '../game/context';

	const context = getContext();
</script>

{#each context.stateGame.tumbleBoardBase as tumbleReelBase, reelIndex (reelIndex)}
	{#each tumbleReelBase as tumbleSymbol (tumbleSymbol.id)}
		<TumbleSymbol {reelIndex} {tumbleSymbol} />
	{/each}
{/each}
