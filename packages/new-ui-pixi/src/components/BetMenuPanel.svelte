<script lang="ts" module>
	export type BetMenuPanelOptions = {
		cols?: number;
		cellW?: number;
		cellH?: number;
		gap?: number;
		padX?: number;
		padY?: number;
		titleH?: number;
		/** Cap panel height (unscaled). Overflowing options scroll. */
		maxHeight?: number;
	};

	const DEFAULTS = {
		cols: 4,
		cellW: 96,
		cellH: 48,
		gap: 10,
		padX: 16,
		padY: 16,
		titleH: 40,
	} as const;

	const SCROLL_W = 8;
	const SCROLL_PAD = 6;

	/** Panel top as a fraction of layout height (mobile / popout). */
	export const BET_MENU_TOP_RATIO = 0.3;

	export const betMenuPanelSize = (optionCount: number, opts: BetMenuPanelOptions = {}) => {
		const cols = opts.cols ?? DEFAULTS.cols;
		const cellW = opts.cellW ?? DEFAULTS.cellW;
		const cellH = opts.cellH ?? DEFAULTS.cellH;
		const gap = opts.gap ?? DEFAULTS.gap;
		const padX = opts.padX ?? DEFAULTS.padX;
		const padY = opts.padY ?? DEFAULTS.padY;
		const titleH = opts.titleH ?? DEFAULTS.titleH;
		const rows = Math.max(1, Math.ceil(optionCount / cols));
		const gridH = rows * cellH + Math.max(0, rows - 1) * gap;
		const contentHeight = padY * 2 + titleH + gridH;
		const height =
			opts.maxHeight != null ? Math.min(contentHeight, Math.max(padY * 2 + titleH + cellH, opts.maxHeight)) : contentHeight;
		const gridTop = padY + titleH;
		const viewportH = Math.max(cellH, height - gridTop - padY);
		const scrollable = gridH > viewportH + 0.5;
		return {
			width: padX * 2 + cols * cellW + (cols - 1) * gap,
			height,
			contentHeight,
			rows,
			visibleRows: rows,
			cols,
			cellW,
			cellH,
			gap,
			padX,
			padY,
			titleH,
			gridTop,
			gridH,
			viewportH,
			scrollable,
			maxScroll: Math.max(0, gridH - viewportH),
		};
	};

	/** Unscaled maxHeight so the panel fits between 30% from top and `panelBottom`. */
	export const betMenuMaxHeightForLayout = (
		layoutHeight: number,
		panelBottom: number,
		scale: number,
		opts: BetMenuPanelOptions = {},
	) => {
		const padY = opts.padY ?? DEFAULTS.padY;
		const titleH = opts.titleH ?? DEFAULTS.titleH;
		const cellH = opts.cellH ?? DEFAULTS.cellH;
		const minH = padY * 2 + titleH + cellH * 2;
		const top = layoutHeight * BET_MENU_TOP_RATIO;
		return Math.max(minH, (panelBottom - top) / scale);
	};

	/**
	 * Mobile portrait — 2 columns.
	 * Cell + type sizes match AutoplayPanel; LayoutPortrait applies the same popup scale.
	 */
	export const PORTRAIT_BET_MENU_OPTS: BetMenuPanelOptions = {
		cols: 2,
		cellW: 168,
		cellH: 52,
		gap: 12,
		padX: 18,
		padY: 16,
		titleH: 40,
	};
</script>

<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { stateBet, stateBetDerived, stateConfig, stateUi } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

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

	type Props = BetMenuPanelOptions;

	type PtrEv = {
		global: { x: number; y: number };
		currentTarget: {
			toLocal: (point: { x: number; y: number }) => { x: number; y: number };
		};
		stopPropagation?: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	const options = $derived(
		stateConfig.betAmountOptions.length > 0
			? stateConfig.betAmountOptions
			: stateConfig.betMenuOptions,
	);
	const size = $derived(betMenuPanelSize(options.length, props));

	let scrollTop = $state(0);
	let skipPress = $state(false);
	let dragging = $state(false);
	let dragStartY = 0;
	let scrollAtStart = 0;
	let thumbDragging = $state(false);

	const clampScroll = (value: number) => Math.max(0, Math.min(size.maxScroll, value));

	$effect(() => {
		const max = size.maxScroll;
		if (scrollTop > max) scrollTop = max;
	});

	$effect(() => {
		if (!stateUi.betMenuOpen) scrollTop = 0;
	});

	const thumbH = $derived(
		size.scrollable
			? Math.max(28, size.viewportH * (size.viewportH / size.gridH))
			: size.viewportH,
	);
	const thumbY = $derived(
		size.maxScroll > 0 ? (scrollTop / size.maxScroll) * (size.viewportH - thumbH) : 0,
	);
	const trackX = $derived(size.width - SCROLL_PAD - SCROLL_W);

	const select = (amount: number) => {
		if (skipPress) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBetDerived.setBetAmount(amount);
		stateUi.betMenuOpen = false;
	};

	const onGridDown = (e: PtrEv) => {
		if (!size.scrollable) return;
		dragging = true;
		skipPress = false;
		dragStartY = e.currentTarget.toLocal(e.global).y;
		scrollAtStart = scrollTop;
	};

	const onGridMove = (e: PtrEv) => {
		if (!dragging || !size.scrollable) return;
		const y = e.currentTarget.toLocal(e.global).y;
		const dy = y - dragStartY;
		if (Math.abs(dy) > 6) skipPress = true;
		scrollTop = clampScroll(scrollAtStart - dy);
	};

	const onGridUp = () => {
		dragging = false;
	};

	const onWheel = (e: { deltaY: number; stopPropagation?: () => void }) => {
		if (!size.scrollable) return;
		e.stopPropagation?.();
		scrollTop = clampScroll(scrollTop + e.deltaY);
	};

	const onThumbDown = (e: PtrEv) => {
		e.stopPropagation?.();
		thumbDragging = true;
		dragging = false;
		skipPress = true;
		dragStartY = e.currentTarget.toLocal(e.global).y;
		scrollAtStart = scrollTop;
	};

	const onThumbMove = (e: PtrEv) => {
		if (!thumbDragging || size.maxScroll <= 0) return;
		e.stopPropagation?.();
		const y = e.currentTarget.toLocal(e.global).y;
		const range = size.viewportH - thumbH;
		if (range <= 0) return;
		const dy = y - dragStartY;
		scrollTop = clampScroll(scrollAtStart + (dy / range) * size.maxScroll);
	};

	const onThumbUp = () => {
		thumbDragging = false;
	};
</script>

<Container eventMode="static" onwheel={onWheel}>
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
		text={i18nDerived.betMenu()}
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

	<Container
		x={0}
		y={size.gridTop}
		eventMode="static"
		onpointerdown={onGridDown}
		onpointermove={onGridMove}
		onpointerup={onGridUp}
		onpointerupoutside={onGridUp}
	>
		{#if size.scrollable}
			<Rectangle
				width={size.width}
				height={size.viewportH}
				isMask={true}
				eventMode="none"
				backgroundColor={0xffffff}
			/>
		{/if}

		<Container y={size.scrollable ? -scrollTop : 0}>
			{#each options as amount, index (amount)}
				{@const col = index % size.cols}
				{@const row = Math.floor(index / size.cols)}
				{@const selected = stateBet.betAmount === amount}
				<Container
					x={size.padX + col * (size.cellW + size.gap)}
					y={row * (size.cellH + size.gap)}
				>
					<MenuOptionCell
						width={size.cellW}
						height={size.cellH}
						selected={selected}
						label={numberToCurrencyString(amount)}
						fontSize={20}
						fitLabel
						onpress={() => select(amount)}
					/>
				</Container>
			{/each}
		</Container>
	</Container>

	{#if size.scrollable}
		<Container
			x={trackX}
			y={size.gridTop}
			eventMode="static"
			cursor="pointer"
			onpointerdown={onThumbDown}
			onpointermove={onThumbMove}
			onpointerup={onThumbUp}
			onpointerupoutside={onThumbUp}
		>
			<Rectangle
				width={SCROLL_W}
				height={size.viewportH}
				borderRadius={SCROLL_W}
				backgroundColor={0x000000}
				backgroundAlpha={0.25}
			/>
			<Rectangle
				y={thumbY}
				width={SCROLL_W}
				height={thumbH}
				borderRadius={SCROLL_W}
				backgroundColor={0xffffff}
				backgroundAlpha={0.35}
			/>
		</Container>
	{/if}
</Container>
