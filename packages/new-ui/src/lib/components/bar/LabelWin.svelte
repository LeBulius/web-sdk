<script lang="ts">
	import { stateBet } from 'state-shared';
	// Was: uiStore.win
</script>

<!-- Win label — only shown when there's a win -->
{#if stateBet.winBookEventAmount > 0}
	<div class="flex flex-col items-center px-1 py-1">
		<span class="text-[10px] font-medium tracking-wide text-cyan-400">WIN</span>
		<span class="text-sm font-bold text-cyan-400">${stateBet.winBookEventAmount.toFixed(2)}</span>
	</div>
{/if}
