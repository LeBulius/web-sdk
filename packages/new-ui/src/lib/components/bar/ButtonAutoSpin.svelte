<script lang="ts">
	import { stateBet, stateBetDerived, stateModal } from 'state-shared';
	// Was: uiStore.isAutoplayRunning, handleToggleAutoplay
	import { RefreshCw } from 'lucide-svelte';

	const isRunning = $derived(stateBetDerived.hasAutoBetCounter());

	const onpress = () => {
		if (isRunning) {
			stateBet.autoSpinsCounter = 0;
		} else {
			stateModal.modal = { name: 'autoSpin' };
		}
	};
</script>

<button
	onclick={onpress}
	class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 shadow-md transition-colors
		{isRunning ? 'bg-cyan-400 hover:bg-cyan-500' : 'bg-white hover:bg-gray-100'}"
	aria-label="Autoplay"
>
	<RefreshCw class="h-4 w-4 {isRunning ? 'text-gray-900' : 'text-gray-800'}" />
</button>
