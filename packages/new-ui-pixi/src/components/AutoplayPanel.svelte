<script lang="ts" module>
	import { INFINITY_MARK, type AutoSpinsText } from 'state-shared';

	export type AutoplayPanelOptions = {
		cols?: number;
		cellW?: number;
		cellH?: number;
		gap?: number;
		padX?: number;
		padY?: number;
		titleH?: number;
		subtitleH?: number;
	};

	const DEFAULTS = {
		cols: 4,
		cellW: 96,
		cellH: 48,
		gap: 10,
		padX: 16,
		padY: 16,
		titleH: 40,
		subtitleH: 22,
	} as const;

	/** Exact order from the autoplay reference: ∞, 10, 25, 50 / 100, 250, 500, 1000 */
	export const AUTOPLAY_ROUND_OPTIONS: AutoSpinsText[] = [
		INFINITY_MARK,
		'10',
		'25',
		'50',
		'100',
		'250',
		'500',
		'1000',
	];

	export const autoplayPanelSize = (opts: AutoplayPanelOptions = {}) => {
		const cols = opts.cols ?? DEFAULTS.cols;
		const cellW = opts.cellW ?? DEFAULTS.cellW;
		const cellH = opts.cellH ?? DEFAULTS.cellH;
		const gap = opts.gap ?? DEFAULTS.gap;
		const padX = opts.padX ?? DEFAULTS.padX;
		const padY = opts.padY ?? DEFAULTS.padY;
		const titleH = opts.titleH ?? DEFAULTS.titleH;
		const subtitleH = opts.subtitleH ?? DEFAULTS.subtitleH;
		const rows = Math.ceil(AUTOPLAY_ROUND_OPTIONS.length / cols);
		return {
			width: padX * 2 + cols * cellW + (cols - 1) * gap,
			height: padY * 2 + titleH + subtitleH + rows * cellH + (rows - 1) * gap,
			cols,
			cellW,
			cellH,
			gap,
			padX,
			padY,
			titleH,
			subtitleH,
		};
	};

	/** Mobile portrait — 3 columns, centered above spin (Motor Ways reference). */
	export const PORTRAIT_AUTOPLAY_OPTS: AutoplayPanelOptions = {
		cols: 3,
		cellW: 110,
		cellH: 52,
		gap: 12,
		padX: 18,
		padY: 16,
		titleH: 40,
		subtitleH: 24,
	};
</script>

<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { type AutoSpinsText, stateUi } from 'state-shared';

	import {
		UI_CHROME_ALPHA,
		UI_CHROME_BG,
		UI_CHROME_BORDER_ALPHA,
		UI_CHROME_BORDER_COLOR,
		UI_CHROME_BORDER_WIDTH,
		UI_CHROME_RADIUS,
	} from '../constants';
	import { getContext } from '../context';
	import { i18nDerived } from '../i18n/i18nDerived';
	import MenuOptionCell from './MenuOptionCell.svelte';

	type Props = AutoplayPanelOptions;

	const props: Props = $props();
	const context = getContext();
	const size = $derived(autoplayPanelSize(props));

	const select = (rounds: AutoSpinsText) => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateUi.autoSpinsText = rounds;
	};
</script>

<Container eventMode="static">
	<Rectangle
		width={size.width}
		height={size.height}
		borderRadius={UI_CHROME_RADIUS}
		backgroundColor={UI_CHROME_BG}
		alpha={UI_CHROME_ALPHA}
		borderColor={UI_CHROME_BORDER_COLOR}
		borderWidth={UI_CHROME_BORDER_WIDTH}
		borderAlpha={UI_CHROME_BORDER_ALPHA}
	/>

	<Text
		text={i18nDerived.autoplay()}
		x={size.width * 0.5}
		y={size.padY + size.titleH * 0.3}
		anchor={0.5}
		style={{
			fontFamily: 'Kontora Black',
			fontWeight: '800',
			fontSize: 22,
			fill: 0xffffff,
		}}
	/>

	<Text
		text={i18nDerived.numberOfRounds()}
		x={size.width * 0.5}
		y={size.padY + size.titleH + size.subtitleH * 0.15}
		anchor={0.5}
		style={{
			fontFamily: 'Kontora Black',
			fontWeight: '700',
			fontSize: 17,
			fill: 0xd1d5db,
		}}
	/>

	{#each AUTOPLAY_ROUND_OPTIONS as option, index (option)}
		{@const col = index % size.cols}
		{@const row = Math.floor(index / size.cols)}
		{@const selected = stateUi.autoSpinsText === option}
		<Container
			x={size.padX + col * (size.cellW + size.gap)}
			y={size.padY + size.titleH + size.subtitleH + row * (size.cellH + size.gap)}
		>
			<MenuOptionCell
				width={size.cellW}
				height={size.cellH}
				selected={selected}
				label={option}
				fontSize={option === INFINITY_MARK ? 28 : 20}
				labelYOffset={option === INFINITY_MARK ? 2 : 0}
				onpress={() => select(option)}
			/>
		</Container>
	{/each}
</Container>
