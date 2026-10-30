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
		handleSelectBet,
		handleSpin,
		handleAutoplaySelect,
		handleTurboToggle,
		handleFeatureConfirmed,
		handleToggleSettings,
		handleOpenInfo,
		handleToggleAutoplay,
		handleToggleBetMenu,
		handleOpenFeatures
	} from '$lib/stores/uiHandlers';

	// Detect layout on mount and on resize
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

<!-- DEV: press F to preview free games bar -->
<svelte:window onkeydown={(e) => {
	if (e.key === 'f' || e.key === 'F') { uiStore.isFreeGames = !uiStore.isFreeGames; uiStore.freeGamesTriggerBet = uiStore.bet; }
	// DEV: E = insufficient balance error, R = reload error
	if (e.key === 'e' || e.key === 'E') { uiStore.errorType = 'insufficient-balance'; uiStore.showError = true; }
	if (e.key === 'r' || e.key === 'R') { uiStore.errorType = 'reload'; uiStore.showError = true; }
}} />

<main class="relative min-h-screen overflow-hidden bg-slot-bg">

	{#if uiStore.showError}
		<ErrorModal type={uiStore.errorType} onClose={() => (uiStore.showError = false)} />
	{/if}
	<!-- Background - slot game blurred -->
	<div
		class="absolute inset-0 bg-cover bg-center"
		style="background-image: url('/Background.png');"
	></div>

	<!-- Game Area Placeholder -->
	<div class="relative z-10 flex min-h-screen items-center justify-center pb-24">
		<!-- Info Modal -->
		{#if uiStore.showInfo}
			<InfoModal onClose={() => (uiStore.showInfo = false)} />
		{/if}

		<!-- Features Modal - with background overlay above bar -->
		{#if uiStore.showFeatures}
			<!-- Overlay that covers the entire screen including the bar area -->
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

	<!-- Bottom Controls -->
	{#if !uiStore.showFeatures && !uiStore.showInfo}
		{#if uiStore.isFreeGames}
			<!-- Free Games Bar -->
			<FreeGamesBar
				balance={uiStore.balance}
				triggerBet={uiStore.freeGamesTriggerBet}
				totalWin={uiStore.freeGamesTotalWin}
				freeSpinsLeft={uiStore.freeSpinsLeft ?? 0}
				turboEnabled={uiStore.turboEnabled}
				onTurboToggle={handleTurboToggle}
				onOpenInfo={handleOpenInfo}
				isSettingsOpen={uiStore.showSettings}
				onToggleSettings={handleToggleSettings}
			/>
		{:else}
			<!-- Normal Slot Controls -->
			<SlotControls
				{layoutType}
				balance={uiStore.balance}
				bet={uiStore.bet}
				win={uiStore.win}
				betAmounts={uiStore.betAmounts}
				onBetIncrease={handleIncreaseBet}
				onBetDecrease={handleDecreaseBet}
				onSpin={handleSpin}
				onOpenFeatures={handleOpenFeatures}
				onOpenInfo={handleOpenInfo}
				onToggleSettings={handleToggleSettings}
				onToggleAutoplay={handleToggleAutoplay}
				onToggleBetMenu={handleToggleBetMenu}
				showAutoplayPlay={uiStore.selectedAutoplay !== null}
				isAutoplayRunning={uiStore.isAutoplayRunning}
				autoplaySpinsRemaining={uiStore.autoplaySpinsRemaining}
				isSettingsOpen={uiStore.showSettings}
				isAutoplayOpen={uiStore.showAutoplay}
				isBetMenuOpen={uiStore.showBetMenu}
				onBetSelect={handleSelectBet}
				onSelectAutoplay={handleAutoplaySelect}
				selectedAutoplay={uiStore.selectedAutoplay}
				extraChanceActive={uiStore.extraChanceActive}
				onDisableExtraChance={() => (uiStore.extraChanceActive = false)}
				extraChanceCost={uiStore.bet * 3}
			/>
		{/if}
	{/if}
</main>
