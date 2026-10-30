<script lang="ts">
	import FeaturesModal from '$lib/components/FeaturesModal.svelte';
	import InfoModal from '$lib/components/InfoModal.svelte';
	import SlotControls from '$lib/components/SlotControls.svelte';
	import FreeGamesBar from '$lib/components/FreeGamesBar.svelte';
	import ErrorModal from '$lib/components/ErrorModal.svelte';

	import { uiStore } from '$lib/stores/uiStore.svelte';
	import {
		handleIncreaseBet,
		handleDecreaseBet,
		handleFeatureConfirmed
	} from '$lib/stores/uiHandlers';

	// Layout detection
	let layoutType: 'portrait' | 'landscape' | 'desktop' = $state('desktop');
	$effect(() => {
		const update = () => {
			const w = window.innerWidth;
			const h = window.innerHeight;
			if (h > w) layoutType = 'portrait';
			else if (w < 1024) layoutType = 'landscape';
			else layoutType = 'desktop';
		};
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	});
</script>

<!-- DEV: press F = free games, E = insufficient-balance error, R = reload error -->
<svelte:window onkeydown={(e) => {
	if (e.key === 'f' || e.key === 'F') { uiStore.isFreeGames = !uiStore.isFreeGames; uiStore.freeGamesTriggerBet = uiStore.bet; }
	if (e.key === 'e' || e.key === 'E') { uiStore.errorType = 'insufficient-balance'; uiStore.showError = true; }
	if (e.key === 'r' || e.key === 'R') { uiStore.errorType = 'reload'; uiStore.showError = true; }
}} />

<main class="relative min-h-screen overflow-hidden bg-slot-bg">

	{#if uiStore.showError}
		<ErrorModal type={uiStore.errorType} onClose={() => (uiStore.showError = false)} />
	{/if}

	<div class="absolute inset-0 bg-cover bg-center" style="background-image: url('/Background.png');"></div>

	<div class="relative z-10 flex min-h-screen items-center justify-center pb-24">
		{#if uiStore.showInfo}
			<InfoModal onClose={() => (uiStore.showInfo = false)} />
		{/if}

		{#if uiStore.showFeatures}
			<div class="fixed inset-0 z-50 bg-black/60"></div>
			<FeaturesModal
				onClose={() => (uiStore.showFeatures = false)}
				balance={uiStore.balance}
				bet={uiStore.bet}
				onIncreaseBet={handleIncreaseBet}
				onDecreaseBet={handleDecreaseBet}
				onFeatureConfirmed={handleFeatureConfirmed}
			/>
		{/if}
	</div>

	{#if !uiStore.showFeatures && !uiStore.showInfo}
		{#if uiStore.isFreeGames}
			<FreeGamesBar />
		{:else}
			<!-- SlotControls now only needs layoutType; all state reads via uiStore internally -->
			<SlotControls {layoutType} />
		{/if}
	{/if}
</main>
