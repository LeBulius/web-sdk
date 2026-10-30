<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { i18nDerived } from '../i18n/i18nDerived';
	import FitText from './FitText.svelte';

	type Props = { align?: 'left' | 'center'; maxWidth?: number };
	const { align = 'left', maxWidth = 165 }: Props = $props();

	const ax = $derived(align === 'center' ? 0.5 : 0);
	const textAlign = $derived(align === 'center' ? 'center' : 'left');
</script>

<!-- Bet amount only — used in free spins (no +/- / bet menu). Same font sizes as balance. -->
<Container>
	<Text
		text={i18nDerived.bet()}
		anchor={{ x: ax, y: 0.5 }}
		y={-12}
		style={{
			align: textAlign,
			fontFamily: 'Kontora Black',
			fontWeight: '600',
			fontSize: 18,
			fill: 0x22d3ee,
		}}
	/>
	<FitText
		text={numberToCurrencyString(stateBet.betAmount)}
		{maxWidth}
		anchor={{ x: ax, y: 0.5 }}
		y={12}
		style={{
			align: textAlign,
			fontFamily: 'Kontora Black',
			fontWeight: '700',
			fontSize: 25,
			fill: 0xffffff,
		}}
	/>
</Container>
