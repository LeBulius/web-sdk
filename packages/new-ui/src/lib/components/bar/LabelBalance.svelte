<script lang="ts">
	import { stateBet } from 'state-shared';
	// Was: uiStore.balance
</script>

<div class="flex flex-col items-center px-1 py-1">
	<span class="text-[10px] font-medium tracking-wide text-cyan-400">BAL</span>
	<span class="text-sm font-bold text-white">${stateBet.balanceAmount.toFixed(2)}</span>
</div>
