<script lang="ts">
	import { X, Zap } from 'lucide-svelte';
	import BaseOverlay from './BaseOverlay.svelte';
	import BaseModalCard from './BaseModalCard.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	type Feature = {
		title: string;
		price: number;
		description: string;
		iconCount?: number;
	};

	type Props = {
		isOpen: boolean;
		feature: Feature;
		onConfirm: () => void;
		onClose: () => void;
	};

	const { isOpen, feature, onConfirm, onClose }: Props = $props();
</script>

<!-- Confirmation dialog shown before buying a bonus feature. Displays title, description, price, and a confirm button. -->
{#if isOpen}
	<BaseOverlay>
		<!-- Close button -->
		<button
			onclick={onClose}
			class="absolute top-4 right-4 z-10 flex h-12 w-12 items-center justify-center transition-opacity hover:opacity-80"
			aria-label="Close confirmation"
		>
			<X class="h-10 w-10 text-white" stroke-width={3} />
		</button>

		<BaseModalCard maxWidth="288px">
			<div class="flex justify-center gap-0.5 pt-6 pb-2">
				{#each Array(feature.iconCount ?? 5) as _}
					<Zap class="h-5 w-5 fill-cyan-400 text-cyan-400" />
				{/each}
			</div>
			<h2 class="text-center text-base font-bold tracking-wide text-gray-800 px-6">
				{feature.title}
			</h2>
			<p class="mt-2 px-8 text-center text-sm text-gray-500 leading-snug">
				{feature.description}
			</p>
			<p class="mt-4 text-center text-4xl font-bold text-gray-900">
				${feature.price.toFixed(2)}
			</p>
			<div class="px-6 pt-4 pb-6">
				<button
					onclick={onConfirm}
					class="w-full rounded-full bg-cyan-400 py-3 text-sm font-bold tracking-widest text-white transition-colors hover:bg-cyan-500"
				>
					{i18nDerived.confirm()}
				</button>
			</div>
		</BaseModalCard>
	</BaseOverlay>
{/if}
