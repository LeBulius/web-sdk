<script lang="ts">
	import { stateBet, stateModal } from 'state-shared';
	// Was: uiStore.extraChanceActive, handleOpenFeatures

	let { layoutType = 'desktop' }: { layoutType?: 'portrait' | 'landscape' | 'desktop' } = $props();

	const isExtraChance = $derived(stateBet.activeBetModeKey !== 'BASE');

	const onpress = () => {
		if (isExtraChance) {
			// Disable extra chance — revert to BASE mode
			stateBet.activeBetModeKey = 'BASE';
		} else {
			stateModal.modal = { name: 'buyBonus' };
		}
	};
</script>

<button
	onclick={onpress}
	class="flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-colors
		{layoutType === 'landscape' ? 'mb-3' : 'mr-3'}
		{isExtraChance ? 'bg-red-500 hover:bg-red-600' : 'bg-cyan-400 hover:bg-cyan-500'}"
	aria-label={isExtraChance ? 'Disable extra chance' : 'Open bonus features'}
>
	<div class="flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-gray-900">
		<span class="text-[10px] font-black tracking-tight text-gray-900">
			{isExtraChance ? 'DISABLE' : 'BONUS'}
		</span>
	</div>
</button>
