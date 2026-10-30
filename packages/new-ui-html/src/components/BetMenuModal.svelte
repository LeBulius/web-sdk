<script lang="ts">
	import BaseOverlay from './BaseOverlay.svelte';
	import BaseModalCard from './BaseModalCard.svelte';
	import BaseModalTitle from './BaseModalTitle.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	type Props = {
		isOpen: boolean;
		currentBet: number;
		betAmounts: number[];
		onSelectBet: (bet: number) => void;
		onClose: () => void;
	};

	const { isOpen, currentBet, betAmounts, onSelectBet, onClose }: Props = $props();

	const format = (v: number) => {
		if (Math.abs(v) > 999999) return `$${(Math.abs(v) / 1000000).toFixed(2)}M`;
		if (Math.abs(v) > 999) return `$${(Math.abs(v) / 1000).toFixed(2)}K`;
		return `$${Math.abs(v).toFixed(2)}`;
	};
</script>

<!-- Bet amount selection grid. Highlights the currently active bet. -->
{#if isOpen}
	<BaseOverlay onclick={onClose}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div onclick={(e) => e.stopPropagation()}>
			<BaseModalCard dark maxWidth="360px">
				<div class="p-4">
					<BaseModalTitle dark>{i18nDerived.betMenu()}</BaseModalTitle>
					<div class="grid max-h-[320px] grid-cols-4 gap-2 overflow-y-auto">
						{#each betAmounts as amount (amount)}
							<button
								type="button"
								onclick={() => {
									onSelectBet(amount);
									onClose();
								}}
								class="rounded-lg px-1 py-2 text-sm font-bold transition-colors
									{currentBet === amount
									? 'bg-cyan-400 text-gray-900'
									: 'bg-black/80 text-white hover:bg-gray-700'}"
							>
								{format(amount)}
							</button>
						{/each}
					</div>
				</div>
			</BaseModalCard>
		</div>
	</BaseOverlay>
{/if}
