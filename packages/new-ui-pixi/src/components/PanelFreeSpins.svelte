<script lang="ts" module>
	export const FREE_SPINS_W = 168;
	export const FREE_SPINS_H = 78;
	export const FREE_SPINS_COUNT_W = 48;
	const PANEL_BORDER = 4;
</script>

<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { stateUi } from 'state-shared';

	import { UI_CHROME_RADIUS } from '../constants';
	import { i18nDerived } from '../i18n/i18nDerived';

	/** Spins remaining after the current one (0 on the last spin). */
	const remaining = $derived(Math.max(0, stateUi.freeSpinCounterCurrent));
</script>

<!-- Stacked label + count (bonus reference: white card, thick black outline). -->
<Container>
	<Rectangle
		width={FREE_SPINS_W}
		height={FREE_SPINS_H}
		borderRadius={UI_CHROME_RADIUS}
		backgroundColor={0xffffff}
		alpha={1}
		borderColor={0x000000}
		borderWidth={PANEL_BORDER}
		borderAlpha={1}
		eventMode="none"
	/>
	<Text
		text={i18nDerived.freeSpins()}
		x={FREE_SPINS_W * 0.5}
		y={FREE_SPINS_H * 0.28}
		anchor={0.5}
		style={{
			align: 'center',
			fontFamily: 'Kontora Black',
			fontWeight: '800',
			fontSize: 16,
			fill: 0x111827,
		}}
	/>
	<Text
		text={String(remaining)}
		x={FREE_SPINS_W * 0.5}
		y={FREE_SPINS_H * 0.68}
		anchor={0.5}
		style={{
			align: 'center',
			fontFamily: 'Kontora Black',
			fontWeight: '800',
			fontSize: 32,
			fill: 0x111827,
		}}
	/>
</Container>
