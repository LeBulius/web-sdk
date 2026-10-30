<script lang="ts">
	import { stateBet, stateModal } from 'state-shared';
	// Was: uiStore.bet, uiStore.extraChanceActive, handleToggleBetMenu

	let { layoutType = 'desktop' }: { layoutType?: 'portrait' | 'landscape' | 'desktop' } = $props();

	const isExtraChance = $derived(stateBet.activeBetModeKey !== 'BASE');
	const displayBet = $derived(stateBet.betAmount.toFixed(2));

	const onpress = () => {
		stateModal.modal = { name: 'betAmountMenu' };
	};
</script>

<!-- Bet label — clickable to open bet menu modal -->
<button
	onclick={onpress}
	class="flex flex-col items-center justify-center rounded-md bg-gray-700/60 transition-colors hover:bg-gray-600/60
		{layoutType === 'landscape' ? 'w-14 py-2' : 'w-24 py-1'}"
>
	<span class="text-[10px] sm:text-xs font-medium tracking-wide leading-none mb-1
		{isExtraChance ? 'text-yellow-400' : 'text-cyan-400'}">
		{isExtraChance ? (layoutType === 'landscape' ? 'EXTRA' : 'EXTRA CHANCE') : 'BET'}
	</span>
	<span class="text-sm sm:text-lg leading-none font-bold text-white">
		${displayBet}
	</span>
</button>
