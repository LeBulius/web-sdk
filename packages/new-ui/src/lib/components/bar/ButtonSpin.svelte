<script lang="ts">
	import { stateBet, stateModal } from 'state-shared';
	// Was: uiStore.isAutoplayRunning, handleSpin
	// ButtonSpin triggers a bet via the game's eventEmitter — imported via sdkBridge
	// For preview dev mode the stub in sdkBridge calls a no-op
	import { RefreshCw, Play } from 'lucide-svelte';
	import { sdkBridge } from '$lib/stores/sdkBridge';

	let { layoutType = 'desktop' }: { layoutType?: 'portrait' | 'landscape' | 'desktop' } = $props();

	const isAutoplayRunning = $derived(stateBet.autoSpinsCounter > 0);
	const isAutoplayOpen = $derived(stateModal.modal?.name === 'autoSpin');
	const hasSelectedAutoplay = $derived(isAutoplayOpen && stateBet.autoSpinsCounter === 0);

	const onpress = () => {
		if (isAutoplayRunning) {
			// Stop autoplay
			stateBet.autoSpinsCounter = 0;
		} else {
			// Trigger a spin via the bridge (calls eventEmitter.broadcast({ type: 'bet' }) when wired)
			sdkBridge.onSpin();
		}
	};
</script>

<button
	onclick={onpress}
	class="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border-2 border-gray-900 bg-white shadow-lg transition-colors hover:bg-gray-100 z-10
		{layoutType === 'landscape' ? 'my-2 -ml-8' : 'mx-2 -my-5'}"
	aria-label="Spin"
>
	{#if isAutoplayRunning && stateBet.autoSpinsCounter > 0}
		<!-- Autoplay counter badge -->
		<div class="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-gray-900 bg-white">
			<span class="text-xl font-bold text-gray-900">{stateBet.autoSpinsCounter}</span>
		</div>
	{:else if isAutoplayOpen}
		<!-- Play+refresh when autoplay modal is open -->
		<div class="relative flex h-full w-full items-center justify-center">
			<RefreshCw class="absolute h-[70px] w-[70px] text-gray-800" />
			<Play class="relative z-10 h-7 w-7 fill-gray-800 text-gray-800" />
		</div>
	{:else}
		<RefreshCw class="h-[70px] w-[70px] text-gray-800" />
	{/if}
</button>
