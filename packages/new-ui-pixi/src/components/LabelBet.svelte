<script lang="ts" module>
	/** Progress bar under the bet box (LayoutDesktop sizes the box to match arrows using these). */
	export const BET_METER_H = 3;
	export const BET_METER_GAP = 5;
</script>

<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { stateBet, stateBetDerived, stateConfig, stateUi, stateUrlDerived } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../context';
	import { i18nDerived } from '../i18n/i18nDerived';
	import FitText from './FitText.svelte';

	type Props = {
		extraChanceActive?: boolean;
		extraChanceCost?: number;
		stacked?: boolean;
		showMeter?: boolean;
		/** Draw meter under the box instead of inside it */
		meterOutside?: boolean;
		align?: 'left' | 'center';
		/** Desktop bet chrome width (must match LayoutDesktop BET_BOX_W). */
		width?: number;
		height?: number;
	};

	const {
		extraChanceActive = false,
		extraChanceCost = 0,
		showMeter = true,
		meterOutside = false,
		align = 'center',
		width = 140,
		height = 52,
	}: Props = $props();

	const context = getContext();
	const METER_H = BET_METER_H;
	const METER_PAD_X = 10;
	const METER_GAP = BET_METER_GAP;
	/**
	 * Text padding inside the bet box (desktop).
	 * BET_TEXT_PAD_Y — inset from top/bottom for label + amount
	 * BET_TEXT_PAD_X — horizontal inset for the amount
	 */
	const BET_TEXT_PAD_Y = 8;
	const BET_TEXT_PAD_X = 12;
	const disabled = $derived(!context.stateXstateDerived.isIdle());

	const betOptions = $derived(
		stateConfig.betAmountOptions.length > 0
			? stateConfig.betAmountOptions
			: stateConfig.betMenuOptions,
	);

	/** Min bet = 0%, max bet = 100% across available bet sizes */
	const betProgress = $derived.by(() => {
		const options = betOptions;
		if (options.length <= 1) return options.length === 1 ? 1 : 0;
		const index = options.findIndex((amount) => amount === stateBet.betAmount);
		const safeIndex = index < 0 ? 0 : index;
		return safeIndex / (options.length - 1);
	});

	const meterTrackW = $derived(width - METER_PAD_X * 2);
	const meterFillW = $derived(Math.max(0, meterTrackW * betProgress));
	const amountMaxWidth = $derived(width - BET_TEXT_PAD_X * 2);
	const meterY = $derived(meterOutside ? height + METER_GAP : height - 8);
	/** Label near top pad; amount near bottom pad */
	const labelY = $derived(BET_TEXT_PAD_Y + 9);
	const amountY = $derived(height - BET_TEXT_PAD_Y - 12);

	const ax = $derived(align === 'center' ? 0.5 : 0);
	const textAlign = $derived(align === 'center' ? 'center' : 'left');
	// Desktop LabelBet is top-left anchored in a box; mobile centers on parent
	const originCentered = $derived(!showMeter && align === 'center');
	const replayMode = $derived(stateUrlDerived.replay() || stateUi.config.mode === 'replay');

	const amountText = $derived(
		numberToCurrencyString(
			extraChanceActive
				? extraChanceCost
				: replayMode
					? stateBet.betAmount * stateBet.replayCostMultiplier
					: stateBetDerived.betCost(),
		),
	);

	const onpress = () => {
		if (disabled || replayMode) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateUi.menuOpen = false;
		stateUi.autoplayMenuOpen = false;
		stateUi.betMenuOpen = !stateUi.betMenuOpen;
	};
</script>

{#snippet meter()}
	<Rectangle
		width={meterTrackW}
		height={METER_H}
		x={METER_PAD_X}
		y={meterY}
		borderRadius={METER_H}
		backgroundColor={0xffffff}
		alpha={0.2}
		eventMode="none"
	/>
	{#if meterFillW > 0}
		<Rectangle
			width={meterFillW}
			height={METER_H}
			x={METER_PAD_X}
			y={meterY}
			borderRadius={METER_H}
			backgroundColor={0xffffff}
			alpha={0.95}
			eventMode="none"
		/>
	{/if}
{/snippet}

{#if originCentered}
	<!-- Mobile: text only, centered on parent (hit via chrome / arrows) -->
	<Container eventMode="static" cursor={disabled || replayMode ? 'default' : 'pointer'} onpointerup={onpress}>
		<Text
			text={extraChanceActive ? i18nDerived.extraChance() : i18nDerived.bet()}
			anchor={{ x: ax, y: 0.5 }}
			y={-12}
			style={{
				align: textAlign,
				fontFamily: 'Kontora Black',
				fontWeight: '600',
				fontSize: 18,
				fill: extraChanceActive ? 0xffff00 : 0x22d3ee,
			}}
		/>
		<FitText
			text={amountText}
			maxWidth={180}
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
{:else}
	<!-- Desktop: full-box hit target -->
	<Container
		eventMode="static"
		cursor={disabled || replayMode ? 'default' : 'pointer'}
		onpointerup={onpress}
	>
		<Rectangle {width} {height} backgroundColor={0x000000} backgroundAlpha={0.001} />
		<Text
			text={extraChanceActive ? i18nDerived.extraChance() : i18nDerived.bet()}
			x={width * 0.5}
			y={labelY}
			anchor={0.5}
			style={{
				align: 'center',
				fontFamily: 'Kontora Black',
				fontWeight: '600',
				fontSize: 18,
				fill: extraChanceActive ? 0xffff00 : 0x22d3ee,
			}}
		/>
		<FitText
			text={amountText}
			maxWidth={amountMaxWidth}
			x={width * 0.5}
			y={amountY}
			anchor={0.5}
			style={{
				align: 'center',
				fontFamily: 'Kontora Black',
				fontWeight: '700',
				fontSize: 25,
				fill: 0xffffff,
			}}
		/>

		{#if showMeter}
			{@render meter()}
		{/if}
	</Container>
{/if}
