<script lang="ts">
	import { RefreshCw, Play } from 'lucide-svelte';
	import { stateBet, stateBetDerived } from 'state-shared';

	type Props = {
		onclick: () => void;
		layoutType?: 'portrait' | 'landscape' | 'desktop';
		isAutoplayOpen?: boolean;
	};

	const { onclick, layoutType = 'desktop', isAutoplayOpen = false }: Props = $props();

	const isAutoplayRunning = $derived(stateBetDerived.hasAutoBetCounter());
	const remaining = $derived(stateBet.autoSpinsCounter);
	// Show play icon when autoplay modal is open but not yet running
	const showPlayIcon = $derived(isAutoplayOpen && !isAutoplayRunning);
</script>

<!--
	Spin button with three visual states:
	1. Normal: refresh icon — triggers a single spin.
	2. Autoplay open: refresh + play overlay — confirms starting autoplay.
	3. Autoplay running: remaining spin count — click stops autoplay.
-->
<button
	{onclick}
	class="flex items-center justify-center rounded-full border-2 border-gray-900 bg-white shadow-lg transition-colors hover:bg-gray-100 z-10
		{layoutType === 'landscape' ? 'h-20 w-20 my-2 -ml-8' : 'h-20 w-20 sm:h-24 sm:w-24 mx-2 -my-5'}"
	aria-label="Spin"
>
	{#if isAutoplayRunning && remaining !== null}
		<div class="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-gray-900 bg-white">
			<span class="text-xl font-bold text-gray-900">{remaining}</span>
		</div>
	{:else if showPlayIcon}
		<div class="relative flex h-full w-full items-center justify-center">
			<RefreshCw class="absolute h-[70px] w-[70px] text-gray-800" />
			<Play class="relative z-10 h-7 w-7 fill-gray-800 text-gray-800" />
		</div>
	{:else}
		<RefreshCw class="h-[70px] w-[70px] text-gray-800" />
	{/if}
</button>
