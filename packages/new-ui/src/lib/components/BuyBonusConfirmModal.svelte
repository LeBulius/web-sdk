<script lang="ts">
	import { X, Zap } from 'lucide-svelte';

	let {
		feature,
		onConfirm,
		onClose
	}: {
		feature: {
			title: string;
			price: number;
			description: string;
			iconCount?: number;
		};
		onConfirm: () => void;
		onClose: () => void;
	} = $props();
</script>

<!-- Full-screen blurred overlay -->
<div class="fixed inset-0 z-[60] flex items-center justify-center">

	<!-- Blurred backdrop -->
	<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

	<!-- X close button — top-right to match FeaturesModal -->
	<button
		onclick={onClose}
		class="absolute top-4 right-4 z-10 flex h-12 w-12 items-center justify-center transition-opacity hover:opacity-80"
		aria-label="Close confirmation"
	>
		<X class="h-10 w-10 text-white" strokeWidth={3} />
	</button>

	<!-- Confirm card -->
	<div class="relative z-10 w-72 overflow-hidden rounded-2xl bg-white shadow-2xl">

		<!-- Lightning icons row -->
		<div class="flex justify-center gap-0.5 pt-6 pb-2">
			{#each Array(feature.iconCount ?? 5) as _, i}
				<Zap class="h-5 w-5 fill-cyan-400 text-cyan-400" />
			{/each}
		</div>

		<!-- Title -->
		<h2 class="text-center text-base font-bold tracking-wide text-gray-800 px-6">
			{feature.title}
		</h2>

		<!-- Description -->
		<p class="mt-2 px-8 text-center text-sm text-gray-500 leading-snug">
			{feature.description}
		</p>

		<!-- Price -->
		<p class="mt-4 text-center text-4xl font-bold text-gray-900">
			${feature.price.toFixed(2)}
		</p>

		<!-- Confirm button -->
		<div class="px-6 pt-4 pb-6">
			<button
				onclick={onConfirm}
				class="w-full rounded-full bg-cyan-400 py-3 text-sm font-bold tracking-widest text-white transition-colors hover:bg-cyan-500"
			>
				CONFIRM
			</button>
		</div>

	</div>
</div>
