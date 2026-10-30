<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { bookEventAmountToBalanceWinCurrencyString } from 'utils-shared/amount';
	import { i18nDerived } from '../i18n/i18nDerived';
	import FitText from './FitText.svelte';

	type Props = { stacked?: boolean; align?: 'left' | 'center'; maxWidth?: number };
	const { align = 'center', maxWidth = 165 }: Props = $props();

	const ax = $derived(align === 'center' ? 0.5 : 0);
	const textAlign = $derived(align === 'center' ? 'center' : 'left');
	const amount = $derived(stateBet.winBookEventAmount ?? 0);
	const hasWin = $derived(amount > 0);
</script>

<!-- Reference: white WIN label + cyan amount (inverted vs Balance). Hide until there is a win. -->
{#if hasWin}
	<Container>
		<Text
			text={i18nDerived.win()}
			anchor={{ x: ax, y: 0.5 }}
			y={-12}
			style={{
				align: textAlign,
				fontFamily: 'Kontora Black',
				fontWeight: '600',
				fontSize: 18,
				fill: 0xffffff,
			}}
		/>
		<FitText
			text={bookEventAmountToBalanceWinCurrencyString(amount)}
			{maxWidth}
			anchor={{ x: ax, y: 0.5 }}
			y={12}
			style={{
				align: textAlign,
				fontFamily: 'Kontora Black',
				fontWeight: '700',
				fontSize: 25,
				fill: 0x22d3ee,
			}}
		/>
	</Container>
{/if}
