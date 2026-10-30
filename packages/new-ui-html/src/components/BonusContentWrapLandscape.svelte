<script lang="ts">
	import type { Snippet } from 'svelte';

	import BonusContentWrapLarge from './BonusContentWrapLarge.svelte';

	type Props = {
		maxListLength?: number;
		cardCount?: number;
		betAmount: Snippet;
		bonusCardsActivate: Snippet;
		bonusCardsBuy: Snippet;
	};

	const props: Props = $props();
</script>

<BonusContentWrapLarge
	maxListLength={props.maxListLength}
	cardCount={props.cardCount}
	betAmount={props.betAmount}
	bonusCardsActivate={props.bonusCardsActivate}
	bonusCardsBuy={props.bonusCardsBuy}
/>
