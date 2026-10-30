<script lang="ts">
	import { Zap, X, ChevronUp, ChevronDown } from 'lucide-svelte';
	import BuyBonusConfirmModal from './BuyBonusConfirmModal.svelte';

	let {
		onClose,
		balance,
		bet,
		onIncreaseBet,
		onDecreaseBet,
		onFeatureConfirmed
	}: {
		onClose: () => void;
		balance: number;
		bet: number;
		onIncreaseBet: () => void;
		onDecreaseBet: () => void;
		onFeatureConfirmed: (featureId: number) => void;
	} = $props();

	type Feature = {
		id: number;
		title: string;
		costMultiplier: number;
		description: string;
		buttonText: string;
		buttonColor: string;
		type: string;
		iconCount?: number;
	};

	let pendingFeature = $state<(Feature & { price: number }) | null>(null);

	const featureDefs: Feature[] = [
		{
			id: 1,
			title: 'EXTRA CHANCE',
			costMultiplier: 3,
			description: 'Add an extra chance mechanic to your next spin. Increases your odds of landing a bonus trigger.',
			buttonText: 'ACTIVATE',
			buttonColor: 'bg-yellow-400 hover:bg-yellow-500',
			type: 'text',
			iconCount: 3
		},
		{
			id: 2,
			title: 'ENGINE BONUS',
			costMultiplier: 100,
			description: 'Enter a bonus game with 10 free spins. Winning positions increases the multiplier by 1 and respins for a new symbol.',
			buttonText: 'BUY',
			buttonColor: 'bg-cyan-400 hover:bg-cyan-500',
			type: 'grid-x10',
			iconCount: 5
		},
		{
			id: 3,
			title: 'NITRO BONUS',
			costMultiplier: 300,
			description: 'Enter a high-volatility nitro bonus round with mystery multipliers on every win.',
			buttonText: 'BUY',
			buttonColor: 'bg-cyan-400 hover:bg-cyan-500',
			type: 'grid-x?',
			iconCount: 5
		}
	];

	// Derive live prices from current bet
	const features = $derived(featureDefs.map(f => ({ ...f, price: bet * f.costMultiplier })));

	const handleFeatureClick = (feature: Feature & { price: number }) => {
		pendingFeature = feature;
	};

	const handleConfirm = () => {
		if (pendingFeature) {
			onFeatureConfirmed(pendingFeature.id);
			pendingFeature = null;
			onClose();
		}
	};

	const handleCancelConfirm = () => {
		pendingFeature = null;
	};
</script>

<div class="fixed inset-0 z-50 flex flex-col">
	<!-- Close Button -->
	<button
		onclick={onClose}
		class="absolute top-4 right-4 z-10 flex h-12 w-12 items-center justify-center transition-opacity hover:opacity-80"
		aria-label="Close features modal"
	>
		<X class="h-10 w-10 text-white" strokeWidth={3} />
	</button>

	<!-- Features Cards - centered -->
	<div class="flex flex-1 items-center justify-center px-4 pb-24">
		<div class="flex gap-4">
			{#each features as feature (feature.id)}
				<div class="w-56 overflow-hidden rounded-2xl bg-white shadow-2xl">
					<!-- Image Section -->
					<div class="bg-gradient-to-b from-gray-700 to-gray-800 p-4">
						<div class="flex h-24 items-center justify-center">
							{#if feature.type === 'text'}
								<span
									class="text-3xl font-black tracking-tight text-cyan-400"
									style="text-shadow: 2px 2px 4px rgba(0,0,0,0.3)"
								>
									fsFS<span class="text-cyan-300">fs</span>
								</span>
							{:else if feature.type === 'grid-x10' || feature.type === 'grid-x?'}
								<div class="grid grid-cols-4 gap-1">
									{#each Array(8) as _, i}
										<div
											class="flex h-8 w-8 items-center justify-center rounded border border-gray-600 bg-gray-700/80 text-xs font-medium text-gray-400"
										>
											{feature.type === 'grid-x10' ? 'x10' : 'x?'}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- Content Section -->
					<div class="p-4 text-center">
						<!-- Lightning Icons -->
						<div class="mb-2 flex justify-center gap-0.5">
							{#each Array(5) as _, i}
								<Zap class="h-4 w-4 fill-cyan-400 text-cyan-400" />
							{/each}
						</div>

						<!-- Title -->
						<h3 class="mb-2 text-sm font-bold tracking-wide text-gray-700">
							{feature.title}
						</h3>

						<!-- Price -->
						<p class="mb-4 text-3xl font-bold text-gray-800">
							${feature.price.toFixed(2)}
						</p>

						<!-- Button -->
						<button
							onclick={() => handleFeatureClick(feature)}
							class={`w-full rounded-full py-3 text-sm font-bold tracking-wide text-white transition-colors ${feature.buttonColor}`}
						>
							{feature.buttonText}
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Simplified Control Bar - Balance and Bet only -->
	<div class="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
		<div class="flex items-center gap-6 rounded-lg bg-gray-900/95 px-6 py-3">
			<!-- Balance -->
			<div class="flex items-center gap-2">
				<div class="text-center">
					<p class="text-xs font-medium text-cyan-400 opacity-50">BALANCE</p>
					<p class="text-lg font-bold text-white opacity-50">${balance.toFixed(2)}</p>
				</div>
			</div>

			<!-- Bet -->
			<div class="flex items-center gap-2">
				<button onclick={onDecreaseBet} class="transition-opacity hover:opacity-80">
					<ChevronDown class="h-8 w-8 text-white" strokeWidth={3} />
				</button>
				
				<!-- Fixed width box matching SlotControls style -->
				<div class="flex w-24 flex-col items-center rounded-md bg-gray-700/60 py-1">
					<p class="text-xs font-medium text-cyan-400">BET</p>
					<p class="text-lg font-bold text-white">${bet.toFixed(2)}</p>
				</div>

				<button onclick={onIncreaseBet} class="transition-opacity hover:opacity-80">
					<ChevronUp class="h-8 w-8 text-white" strokeWidth={3} />
				</button>
			</div>
		</div>
	</div>

	<!-- Confirm Modal (renders on top when a feature is selected) -->
	{#if pendingFeature}
		<BuyBonusConfirmModal
			feature={pendingFeature}
			onConfirm={handleConfirm}
			onClose={handleCancelConfirm}
		/>
	{/if}
</div>
