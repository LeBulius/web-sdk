<script lang="ts">
	import { uiStore } from '$lib/stores/uiStore.svelte';
	// Step 6: replace with → stateUi.freeSpinCounterShow + counter source
</script>

<!-- Free spin counter — replaces bet area when in free spins mode -->
{#if uiStore.freeSpinsLeft !== null}
	<div class="flex flex-col items-center px-2 py-1">
		<span class="text-[10px] font-medium tracking-wide text-cyan-400">SPINS LEFT</span>
		<span class="text-lg font-bold text-cyan-400">{uiStore.freeSpinsLeft}</span>
	</div>
{/if}
