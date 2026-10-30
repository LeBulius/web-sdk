<script lang="ts">
	import { stateBet } from 'state-shared';
	import ButtonSettings from './ButtonSettings.svelte';
	import ButtonTurbo from './ButtonTurbo.svelte';
	import LabelBalance from './LabelBalance.svelte';
	import LabelTotalWin from './LabelTotalWin.svelte';
	import LabelFreeSpins from './LabelFreeSpins.svelte';

	type Props = {
		freeSpinsLeft: number;
		onOpenInfo: () => void;
	};

	const { freeSpinsLeft, onOpenInfo }: Props = $props();

	let isSettingsOpen = $state(false);
	const toggleSettings = () => { isSettingsOpen = !isSettingsOpen; };
</script>

<!--
	FreeGamesBar — replaces ControlBar during free spins mode.
	Shows balance, locked trigger-bet, total win, free spins remaining, and turbo toggle.
	Bet controls and spin button are hidden since spins are automatic.
-->
<div class="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center px-4 pb-4">
	<div class="relative flex h-14 w-full max-w-2xl items-center rounded-md bg-gray-900/75 px-2 shadow-lg">

		<!-- Left: Settings + Balance + Trigger Bet -->
		<div class="flex items-center gap-1">
			<ButtonSettings isOpen={isSettingsOpen} onclick={toggleSettings} />
			<LabelBalance />
			<div class="flex flex-col items-start px-2 py-1">
				<span class="text-xs font-medium tracking-wide text-cyan-400">BET</span>
				<span class="text-lg font-bold text-white">{stateBet.betAmount?.toFixed(2) ?? '—'}</span>
			</div>
		</div>

		<div class="flex-1"></div>

		<!-- Right: Total Win + Free Spins + Turbo -->
		<div class="flex items-center gap-2">
			<div class="flex flex-col gap-0.5 w-44">
				<LabelTotalWin />
				<LabelFreeSpins count={freeSpinsLeft} />
			</div>
			<ButtonTurbo onclick={() => { stateBet.isTurbo = !stateBet.isTurbo; }} />
		</div>

	</div>
</div>
