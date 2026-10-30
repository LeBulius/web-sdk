<script lang="ts">
	import { Zap } from 'lucide-svelte';
	import { stateBet, type BetModeData } from 'state-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { socializeText } from 'utils-shared/social';

	import BonusCard from './BonusCard.svelte';
	import { stateBonus } from '../stateBonus.svelte';
	import type { EmitterEventModal } from '../types';

	type Props = {
		list: BetModeData[];
	};

	const props: Props = $props();
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	const zapCount = (betModeData: BetModeData) => {
		const match = betModeData.assets.volatility?.match(/(\d+)/);
		const n = match ? Number(match[1]) : 0;
		return Math.min(5, Math.max(1, n || (betModeData.type === 'activate' ? 3 : 5)));
	};

	const openDetail = (betModeData: BetModeData) => {
		stateBonus.selectedBetModeKey = betModeData.mode;
		stateBonus.detailOpen = true;
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const canAfford = (betModeData: BetModeData) => {
		const price = stateBet.betAmount * betModeData.costMultiplier;
		return stateBet.betAmount > 0 && stateBet.balanceAmount >= price;
	};
</script>

{#each props.list as betModeData}
	{#if betModeData.type !== 'default'}
		<BonusCard
			variant={betModeData.type === 'activate' ? 'activate' : 'buy'}
			disabled={!canAfford(betModeData)}
			onclick={() => openDetail(betModeData)}
		>
			{#snippet image()}
				{#if betModeData.assets.dialogImage}
					<img class="preview-img" src={betModeData.assets.dialogImage} alt="" />
				{:else if betModeData.assets.icon}
					<img class="preview-img" src={betModeData.assets.icon} alt="" />
				{/if}
			{/snippet}

			{#snippet volatility()}
				{#each Array(zapCount(betModeData)) as _}
					<Zap size={16} color="#22d3ee" fill="#22d3ee" strokeWidth={0} />
				{/each}
			{/snippet}

			{#snippet title()}
				<h3 class="title">{socializeText(betModeData.text.title)}</h3>
			{/snippet}

			{#snippet price()}
				<p class="price">
					{numberToCurrencyString(stateBet.betAmount * betModeData.costMultiplier)}
				</p>
			{/snippet}

			{#snippet button()}
				<span class="action-label">{socializeText(betModeData.text.button)}</span>
			{/snippet}
		</BonusCard>
	{/if}
{/each}
