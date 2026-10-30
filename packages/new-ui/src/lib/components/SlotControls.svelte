<script lang="ts">
	// SlotControls — pure layout assembler
	// All state is read by sub-components directly from state-shared.
	// This file only controls layout positioning based on orientation.
	import { stateModal } from 'state-shared';

	import SettingsModal from './SettingsModal.svelte';
	import AutoplayModal from './AutoplayModal.svelte';
	import BetMenuModal from './BetMenuModal.svelte';

	import ButtonBonus from './bar/ButtonBonus.svelte';
	import ButtonSettings from './bar/ButtonSettings.svelte';
	import LabelBalance from './bar/LabelBalance.svelte';
	import LabelWin from './bar/LabelWin.svelte';
	import ButtonBetDecrease from './bar/ButtonBetDecrease.svelte';
	import LabelBet from './bar/LabelBet.svelte';
	import ButtonBetIncrease from './bar/ButtonBetIncrease.svelte';
	import ButtonSpin from './bar/ButtonSpin.svelte';
	import ButtonAutoSpin from './bar/ButtonAutoSpin.svelte';
	import ButtonTurbo from './bar/ButtonTurbo.svelte';

	let { layoutType = 'desktop' }: { layoutType?: 'portrait' | 'landscape' | 'desktop' } = $props();

	const isSettingsOpen = $derived(stateModal.modal?.name === 'settings');
	const isAutoplayOpen = $derived(stateModal.modal?.name === 'autoSpin');
	const isBetMenuOpen = $derived(stateModal.modal?.name === 'betAmountMenu');
</script>

<div
	class="fixed z-40 flex px-4 pb-4 transition-all duration-300
		{layoutType !== 'landscape' ? 'bottom-0 left-0 right-0 items-center justify-center' : ''}
		{layoutType === 'landscape' ? 'right-4 top-1/2 -translate-y-1/2 flex-col' : ''}"
>
	<ButtonBonus {layoutType} />

	<div
		class="relative flex items-center rounded-md bg-gray-900/75 px-2 py-1 shadow-lg
			{layoutType === 'landscape' ? 'flex-col gap-2 h-auto w-16 py-4' : 'h-14'}"
	>
		<!-- Modals — driven by stateModal.modal -->
		{#if isSettingsOpen}
			<div class="absolute z-[-1]
				{layoutType === 'landscape' ? 'right-full mr-2 top-0' : 'bottom-full left-0 mb-1'}"
			>
				<SettingsModal />
			</div>
		{/if}

		{#if isAutoplayOpen}
			<div class="absolute z-[-1]
				{layoutType === 'landscape' ? 'right-full mr-2 top-0' : 'bottom-full right-0 mb-1'}"
			>
				<AutoplayModal
					onSelect={(rounds) => {
						// Store selected rounds count into stateBet.autoSpinsCounter
						// (actual spin start is triggered by ButtonSpin → sdkBridge.onSpin)
						import('state-shared').then(({ stateBet }) => {
							stateBet.autoSpinsCounter = rounds ?? 0;
						});
					}}
					selected={null}
				/>
			</div>
		{/if}

		{#if isBetMenuOpen}
			<div class="absolute z-[-1]
				{layoutType === 'landscape' ? 'right-full mr-2 top-1/2 -translate-y-1/2' : 'bottom-full left-1/2 mb-1 -translate-x-1/2'}"
			>
				<BetMenuModal
					currentBet={0}
					betAmounts={[]}
					onSelectBet={(amount) => {
						import('state-shared').then(({ stateBet, stateBetDerived, stateModal }) => {
							stateBetDerived.setBetAmount(amount);
							stateModal.modal = null;
						});
					}}
				/>
			</div>
		{/if}

		<ButtonSettings />
		<LabelBalance />
		<LabelWin />
		<ButtonBetDecrease />
		<LabelBet {layoutType} />
		<ButtonBetIncrease />
		<ButtonSpin {layoutType} />

		<div class="flex flex-col gap-1 items-center {layoutType === 'landscape' ? 'mt-2' : ''}">
			<ButtonAutoSpin />
			<ButtonTurbo />
		</div>
	</div>
</div>
