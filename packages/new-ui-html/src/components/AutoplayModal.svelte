<script lang="ts">
	import { Infinity } from 'lucide-svelte';
	import BaseOverlay from './BaseOverlay.svelte';
	import BaseModalCard from './BaseModalCard.svelte';
	import BaseModalTitle from './BaseModalTitle.svelte';
	import BaseOptionButton from './BaseOptionButton.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	type Props = {
		isOpen: boolean;
		selected: number | null;
		onSelect: (rounds: number | null) => void;
		onClose: () => void;
	};

	const { isOpen, selected, onSelect, onClose }: Props = $props();

	const ROUND_OPTIONS = [
		{ value: -1, label: '∞', isInfinity: true },
		{ value: 10, label: '10' },
		{ value: 25, label: '25' },
		{ value: 50, label: '50' },
		{ value: 100, label: '100' },
		{ value: 250, label: '250' },
		{ value: 500, label: '500' },
		{ value: 1000, label: '1000' },
	];
</script>

<!-- Autoplay configuration popup. Displays round-count options in a grid. -->
{#if isOpen}
	<BaseOverlay onclick={onClose}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div onclick={(e) => e.stopPropagation()}>
			<BaseModalCard dark maxWidth="280px">
				<div class="p-5">
					<BaseModalTitle dark>{i18nDerived.autoplay()}</BaseModalTitle>
					<p class="text-xs text-gray-400 text-center mb-4">{i18nDerived.numberOfRounds()}</p>
					<div class="grid grid-cols-4 gap-2">
						{#each ROUND_OPTIONS as option (option.label)}
							{@const isSelected = (option.value === -1 && selected === null) || option.value === selected}
							<BaseOptionButton
								{isSelected}
								onclick={() => onSelect(option.value === -1 ? null : option.value)}
							>
								{#if option.isInfinity}
									<Infinity class="h-5 w-5" />
								{:else}
									{option.label}
								{/if}
							</BaseOptionButton>
						{/each}
					</div>
				</div>
			</BaseModalCard>
		</div>
	</BaseOverlay>
{/if}
