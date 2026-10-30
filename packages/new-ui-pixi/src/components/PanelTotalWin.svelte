<script lang="ts" module>
	export const TOTAL_WIN_W = 210;
	export const TOTAL_WIN_H = 78;
	const PANEL_BORDER = 4;
</script>

<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { bookEventAmountToBalanceWinCurrencyString } from 'utils-shared/amount';

	import { UI_CHROME_RADIUS } from '../constants';
	import { i18nDerived } from '../i18n/i18nDerived';
	import FitText from './FitText.svelte';
</script>

<Container>
	<Rectangle
		width={TOTAL_WIN_W}
		height={TOTAL_WIN_H}
		borderRadius={UI_CHROME_RADIUS}
		backgroundColor={0xffffff}
		alpha={1}
		borderColor={0x000000}
		borderWidth={PANEL_BORDER}
		borderAlpha={1}
		eventMode="none"
	/>
	<Text
		text={i18nDerived.totalWin()}
		x={TOTAL_WIN_W * 0.5}
		y={TOTAL_WIN_H * 0.28}
		anchor={0.5}
		style={{
			align: 'center',
			fontFamily: 'Kontora Black',
			fontWeight: '700',
			fontSize: 18,
			fill: 0x22d3ee,
		}}
	/>
	<FitText
		text={bookEventAmountToBalanceWinCurrencyString(stateBet.winBookEventAmount)}
		maxWidth={TOTAL_WIN_W - 24}
		x={TOTAL_WIN_W * 0.5}
		y={TOTAL_WIN_H * 0.68}
		anchor={0.5}
		style={{
			align: 'center',
			fontFamily: 'Kontora Black',
			fontWeight: '800',
			fontSize: 28,
			fill: 0x111827,
		}}
	/>
</Container>
