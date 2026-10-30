<script lang="ts">
	import { Zap, Menu, X } from 'lucide-svelte';
	import SettingsModal from './SettingsModal.svelte';

	let {
		balance,
		triggerBet,
		totalWin = 0,
		freeSpinsLeft,
		turboEnabled = false,
		onTurboToggle,
		onOpenInfo,
		isSettingsOpen = false,
		onToggleSettings
	}: {
		balance: number;
		triggerBet: number;
		totalWin?: number;
		freeSpinsLeft: number;
		turboEnabled?: boolean;
		onTurboToggle: () => void;
		onOpenInfo: () => void;
		isSettingsOpen?: boolean;
		onToggleSettings: () => void;
	} = $props();
</script>

<div class="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center px-4 pb-4">
	<!-- Main Control Bar -->
	<div class="relative flex h-14 w-full max-w-2xl items-center rounded-md bg-gray-900/75 px-2 shadow-lg">

		<!-- Settings Modal -->
		{#if isSettingsOpen}
			<div class="absolute bottom-full left-0 mb-1 z-[-1]">
				<SettingsModal {onOpenInfo} />
			</div>
		{/if}

		<!-- LEFT: Settings button + Balance + Bet (locked trigger bet) -->
		<div class="flex items-center gap-1">
			<!-- Settings Button -->
			<button
				onclick={onToggleSettings}
				class="flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-gray-700/50"
				aria-label={isSettingsOpen ? 'Close settings' : 'Open settings'}
			>
				{#if isSettingsOpen}
					<X class="h-5 w-5 text-white" />
				{:else}
					<Menu class="h-5 w-5 text-gray-400" />
				{/if}
			</button>

			<!-- Balance -->
			<div class="flex flex-col items-start px-2 py-1">
				<span class="text-xs font-medium tracking-wide text-cyan-400">BALANCE</span>
				<span class="text-lg font-bold text-white">${balance.toFixed(2)}</span>
			</div>

			<!-- Triggering Bet (locked) -->
			<div class="flex flex-col items-start px-2 py-1">
				<span class="text-xs font-medium tracking-wide text-cyan-400">BET</span>
				<span class="text-lg font-bold text-white">${triggerBet.toFixed(2)}</span>
			</div>
		</div>

		<!-- SPACER -->
		<div class="flex-1"></div>

		<!-- RIGHT: Total Win + Free Spins stacked, then Turbo button -->
		<div class="flex items-center gap-2">

			<!-- Stacked boxes: Total Win on top, Free Spins below, same width -->
			<div class="flex flex-col gap-0.25 w-44">

				<!-- Total Win — white card, cyan label centred top, large dark value -->
				<div class="flex flex-col items-center justify-center rounded-md border-2 border-gray-900 bg-white px-3 py-0.5">
					<span class="text-[10px] font-bold tracking-widest text-cyan-400">TOTAL WIN</span>
					<span class="text-xl font-bold leading-tight text-gray-900">${totalWin.toFixed(2)}</span>
				</div>

				<!-- Free Spins — same width, label left + number badge right -->
				<div class="flex overflow-hidden rounded-md border-2 border-gray-900 bg-white">
					<span class="flex flex-1 items-center px-3 text-xs font-bold tracking-widest text-gray-800">FREE SPINS</span>
					<div class="flex items-center justify-center border-l border-gray-300 bg-gray-100 px-3">
						<span class="text-xl font-bold text-gray-900">{freeSpinsLeft}</span>
					</div>
				</div>

			</div>

			<!-- Turbo button — right side, centred in bar like main bar -->
			<button
				onclick={onTurboToggle}
				class="mx-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 shadow-md transition-colors
					{turboEnabled ? 'bg-cyan-400 hover:bg-cyan-500' : 'bg-white hover:bg-gray-100'}"
				aria-label="Turbo mode"
			>
				<Zap class="h-4 w-4 {turboEnabled ? 'text-gray-900' : 'text-gray-800'}" />
			</button>
		</div>

	</div>
</div>
