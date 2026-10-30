<script lang="ts">
	import { ChevronUp, ChevronDown, RefreshCw, Zap, Menu, Play, X } from 'lucide-svelte';
	import SettingsModal from './SettingsModal.svelte';
	import AutoplayModal from './AutoplayModal.svelte';
	import BetMenuModal from './BetMenuModal.svelte';
	import type { SlotControlsProps, SlotControlsEvents } from '../types';

	let {
		// Props
		layoutType = 'desktop',
		balance,
		bet,
		win = null,
		freeSpinsLeft = null,
		isIdle = true,
		isAutoplayRunning = false,
		autoplaySpinsRemaining = null,
		turboEnabled = false,
		betAmounts,
		betModes,
		isSettingsOpen = false,
		isAutoplayOpen = false,
		isBetMenuOpen = false,
		showBonusButton = true,
		extraChanceActive = false,
		extraChanceCost = 0,
		showAutoplayPlay = false,
		selectedAutoplay = null,
		
		// Events
		onSpin,
		onBetIncrease,
		onBetDecrease,
		onBetSelect,
		onAutoplayStart,
		onAutoplayStop,
		onTurboToggle,
		onOpenFeatures,
		onBuyBonus,
		onBuyBonusConfirm,
		onToggleSettings,
		onToggleAutoplay,
		onToggleBetMenu,
		onOpenInfo,
		onSelectAutoplay,
		onDisableExtraChance
	}: SlotControlsProps & SlotControlsEvents = $props();
</script>

<div 
	class="fixed z-40 flex px-4 pb-4 transition-all duration-300
		{layoutType !== 'landscape' ? 'bottom-0 left-0 right-0 items-center justify-center' : ''}
		{layoutType === 'landscape' ? 'right-4 top-1/2 -translate-y-1/2 flex-col' : ''}"
>
	<!-- BONUS / DISABLE Button -->
	{#if showBonusButton}
		<button
			onclick={extraChanceActive ? onDisableExtraChance : onOpenFeatures}
			class="flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-colors
				{layoutType === 'landscape' ? 'mb-3' : 'mr-3'}
				{extraChanceActive
					? 'bg-red-500 hover:bg-red-600'
					: 'bg-cyan-400 hover:bg-cyan-500'}"
			aria-label={extraChanceActive ? 'Disable extra chance' : 'Open bonus features'}
		>
			<div class="flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-gray-900">
				<span class="text-[10px] font-black tracking-tight text-gray-900">
					{extraChanceActive ? 'DISABLE' : 'BONUS'}
				</span>
			</div>
		</button>
	{/if}

	<!-- Main Control Bar -->
	<div
		class="relative flex items-center rounded-md bg-gray-900/75 px-2 py-1 shadow-lg
			{layoutType === 'landscape' ? 'flex-col gap-2 h-auto w-16 py-4' : 'h-14'}"
	>
		<!-- Modals container - positioned relative to bar -->
		{#if isSettingsOpen}
			<div class="absolute z-[-1]
				{layoutType === 'landscape' ? 'right-full mr-2 top-0' : 'bottom-full left-0 mb-1'}"
			>
				<SettingsModal {onOpenInfo} />
			</div>
		{/if}

		{#if isAutoplayOpen}
			<div class="absolute z-[-1]
				{layoutType === 'landscape' ? 'right-full mr-2 top-0' : 'bottom-full right-0 mb-1'}"
			>
				<AutoplayModal onSelect={onSelectAutoplay} selected={selectedAutoplay} />
			</div>
		{/if}

		{#if isBetMenuOpen}
			<div class="absolute z-[-1]
				{layoutType === 'landscape' ? 'right-full mr-2 top-1/2 -translate-y-1/2' : 'bottom-full left-1/2 mb-1 -translate-x-1/2'}"
			>
				<BetMenuModal currentBet={bet} {betAmounts} onSelectBet={onBetSelect} />
			</div>
		{/if}

		<!-- Settings Button - shows X when open, 3 lines when closed -->
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
		<div class="flex flex-col items-center px-1 py-1">
			<span class="text-[10px] font-medium tracking-wide text-cyan-400">BAL</span>
			<span class="text-sm font-bold text-white">${balance.toFixed(2)}</span>
		</div>

		<!-- WIN - only shows when there's a win -->
		{#if win !== null && win > 0}
			<div class="flex flex-col items-center px-1 py-1">
				<span class="text-[10px] font-medium tracking-wide text-cyan-400">WIN</span>
				<span class="text-sm font-bold text-cyan-400">${win.toFixed(2)}</span>
			</div>
		{/if}

		<!-- Decrease Bet -->
		<button
			onclick={onBetDecrease}
			class="p-1 text-gray-400 transition-colors hover:text-white"
			aria-label="Decrease bet"
		>
			<ChevronDown class="h-7 w-7" />
		</button>

		<!-- Bet - clickable to toggle bet menu -->
		<button
			onclick={onToggleBetMenu}
			class="flex flex-col items-center justify-center rounded-md bg-gray-700/60 transition-colors hover:bg-gray-600/60
				{layoutType === 'landscape' ? 'w-14 py-2' : 'w-24 py-1'}"
		>
			<span class="text-[10px] sm:text-xs font-medium tracking-wide leading-none mb-1
				{extraChanceActive ? 'text-yellow-400' : 'text-cyan-400'}">
				{extraChanceActive ? (layoutType === 'landscape' ? 'EXTRA' : 'EXTRA CHANCE') : 'BET'}
			</span>
			<span class="text-sm sm:text-lg leading-none font-bold text-white">
				${extraChanceActive ? extraChanceCost.toFixed(2) : bet.toFixed(2)}
			</span>
		</button>

		<!-- Increase Bet -->
		<button
			onclick={onBetIncrease}
			class="p-1 text-gray-400 transition-colors hover:text-white"
			aria-label="Increase bet"
		>
			<ChevronUp class="h-7 w-7" />
		</button>

		<!-- Spin Button - larger than bar height, white background with black outline -->
		<button
			onclick={onSpin}
			class="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border-2 border-gray-900 bg-white shadow-lg transition-colors hover:bg-gray-100 z-10
				{layoutType === 'landscape' ? 'my-2 -ml-8' : 'mx-2 -my-5'}"
			aria-label="Spin"
		>
			{#if isAutoplayRunning && autoplaySpinsRemaining !== null}
				<!-- Show spins remaining counter -->
				<div
					class="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-gray-900 bg-white"
				>
					<span class="text-xl font-bold text-gray-900">{autoplaySpinsRemaining}</span>
				</div>
			{:else if showAutoplayPlay || isAutoplayOpen}
				<!-- Show play button when autoplay modal is open -->
				<div class="relative flex h-full w-full items-center justify-center">
					<!-- Outer arrows closer to border -->
					<RefreshCw class="absolute h-[70px] w-[70px] text-gray-800" />
					<!-- Play icon in center -->
					<Play class="relative z-10 h-7 w-7 fill-gray-800 text-gray-800" />
				</div>
			{:else}
				<!-- Normal spin icon - closer to border -->
				<RefreshCw class="h-[70px] w-[70px] text-gray-800" />
			{/if}
		</button>

		<!-- Autoplay & Turbo buttons stacked vertically or hidden depending on layout -->
		<div class="flex flex-col gap-1 items-center {layoutType === 'landscape' ? 'mt-2' : ''}">
			<!-- Autoplay Button - on top, white background with black outline -->
			<button
				onclick={onToggleAutoplay}
				class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 bg-white shadow-md transition-colors hover:bg-gray-100"
				aria-label="Autoplay"
			>
				<RefreshCw class="h-4 w-4 text-gray-800" />
			</button>

			<!-- Turbo/Lightning Button - below, white background with black outline -->
			<button
				class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 bg-white shadow-md transition-colors hover:bg-gray-100"
				aria-label="Turbo mode"
			>
				<Zap class="h-4 w-4 text-gray-800" />
			</button>
		</div>
	</div>
</div>
