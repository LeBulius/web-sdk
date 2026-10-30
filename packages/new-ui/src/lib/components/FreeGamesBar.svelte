<script lang="ts">
	import ButtonSettings from './bar/ButtonSettings.svelte';
	import ButtonTurbo from './bar/ButtonTurbo.svelte';
	import LabelBalance from './bar/LabelBalance.svelte';
	import SettingsModal from './SettingsModal.svelte';
	import { uiStore } from '$lib/stores/uiStore.svelte';
</script>

<div class="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center px-4 pb-4">
	<!-- Main Control Bar -->
	<div class="relative flex h-14 w-full max-w-2xl items-center rounded-md bg-gray-900/75 px-2 shadow-lg">

		<!-- Settings Modal -->
		{#if uiStore.showSettings}
			<div class="absolute bottom-full left-0 mb-1 z-[-1]">
				<SettingsModal />
			</div>
		{/if}

		<!-- LEFT: Settings + Balance + Locked Trigger Bet -->
		<div class="flex items-center gap-1">
			<ButtonSettings />

			<LabelBalance />

			<!-- Triggering Bet (locked for this free spins session) -->
			<div class="flex flex-col items-start px-2 py-1">
				<span class="text-xs font-medium tracking-wide text-cyan-400">BET</span>
				<span class="text-lg font-bold text-white">${uiStore.freeGamesTriggerBet.toFixed(2)}</span>
			</div>
		</div>

		<!-- SPACER -->
		<div class="flex-1"></div>

		<!-- RIGHT: Total Win + Free Spins stacked, then Turbo -->
		<div class="flex items-center gap-2">
			<!-- Stacked display boxes -->
			<div class="flex flex-col gap-0.25 w-44">
				<!-- Total Win -->
				<div class="flex flex-col items-center justify-center rounded-md border-2 border-gray-900 bg-white px-3 py-0.5">
					<span class="text-[10px] font-bold tracking-widest text-cyan-400">TOTAL WIN</span>
					<span class="text-xl font-bold leading-tight text-gray-900">${uiStore.freeGamesTotalWin.toFixed(2)}</span>
				</div>

				<!-- Free Spins -->
				<div class="flex overflow-hidden rounded-md border-2 border-gray-900 bg-white">
					<span class="flex flex-1 items-center px-3 text-xs font-bold tracking-widest text-gray-800">FREE SPINS</span>
					<div class="flex items-center justify-center border-l border-gray-300 bg-gray-100 px-3">
						<span class="text-xl font-bold text-gray-900">{uiStore.freeSpinsLeft ?? 0}</span>
					</div>
				</div>
			</div>

			<ButtonTurbo />
		</div>
	</div>
</div>
