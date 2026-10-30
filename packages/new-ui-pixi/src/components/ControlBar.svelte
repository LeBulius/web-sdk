<script lang="ts">
	import { stateBet, stateBetDerived, stateModal } from 'state-shared';

	import ButtonSettings from './ButtonSettings.svelte';
	import ButtonBonus from './ButtonBonus.svelte';
	import ButtonBetDecrease from './ButtonBetDecrease.svelte';
	import ButtonBetIncrease from './ButtonBetIncrease.svelte';
	import ButtonSpin from './ButtonSpin.svelte';
	import ButtonAutoplay from './ButtonAutoplay.svelte';
	import ButtonTurbo from './ButtonTurbo.svelte';
	import LabelBalance from './LabelBalance.svelte';
	import LabelBet from './LabelBet.svelte';
	import LabelWin from './LabelWin.svelte';

	type Props = {
		layoutType?: 'portrait' | 'landscape' | 'desktop';
		showBonusButton?: boolean;
		extraChanceActive?: boolean;
		extraChanceCost?: number;
		onSpin: () => void;
		onBetIncrease: () => void;
		onBetDecrease: () => void;
		onOpenFeatures: () => void;
		onDisableExtraChance?: () => void;
	};

	const {
		layoutType = 'desktop',
		showBonusButton = true,
		extraChanceActive = false,
		extraChanceCost = 0,
		onSpin,
		onBetIncrease,
		onBetDecrease,
		onOpenFeatures,
		onDisableExtraChance,
	}: Props = $props();

	let isSettingsOpen = $state(false);
	let isAutoplayOpen = $state(false);

	const toggleSettings = () => { isSettingsOpen = !isSettingsOpen; isAutoplayOpen = false; };
	const toggleAutoplay = () => {
		if (stateBetDerived.hasAutoBetCounter()) {
			stateBet.autoSpinsCounter = 0;
		} else {
			isAutoplayOpen = !isAutoplayOpen;
			isSettingsOpen = false;
		}
	};
	const handleBonusClick = () => {
		if (extraChanceActive) onDisableExtraChance?.();
		else onOpenFeatures();
	};
	const handleSpinClick = () => {
		if (isAutoplayOpen) {
			// Autoplay modal is open but no selection yet — close it
			isAutoplayOpen = false;
		} else {
			onSpin();
		}
	};
</script>

<!--
	ControlBar — the main game control strip.
	Composes all bar sub-components and manages settings/autoplay panel visibility locally.
	Adapts layout orientation via the layoutType prop.
-->
<div class="fixed z-40 flex px-4 pb-4 transition-all duration-300
	{layoutType !== 'landscape' ? 'bottom-0 left-0 right-0 items-center justify-center' : ''}
	{layoutType === 'landscape' ? 'right-4 top-1/2 -translate-y-1/2 flex-col' : ''}"
>
	{#if showBonusButton}
		<ButtonBonus {extraChanceActive} {extraChanceCost} {layoutType} onclick={handleBonusClick} />
	{/if}

	<div class="relative flex items-center rounded-md bg-gray-900/75 px-2 py-1 shadow-lg
		{layoutType === 'landscape' ? 'flex-col gap-2 h-auto w-16 py-4' : 'h-14'}"
	>
		<ButtonSettings isOpen={isSettingsOpen} onclick={toggleSettings} />
		<LabelBalance />
		<LabelWin />
		<ButtonBetDecrease onclick={onBetDecrease} />
		<LabelBet {extraChanceActive} {extraChanceCost} {layoutType} />
		<ButtonBetIncrease onclick={onBetIncrease} />
		<ButtonSpin onclick={handleSpinClick} {layoutType} {isAutoplayOpen} />
		<div class="flex flex-col gap-1 items-center {layoutType === 'landscape' ? 'mt-2' : ''}">
			<ButtonAutoplay onclick={toggleAutoplay} />
			<ButtonTurbo onclick={() => stateBetDerived.updateIsTurbo(!stateBet.isTurbo, { persistent: true })} />
		</div>
	</div>
</div>
