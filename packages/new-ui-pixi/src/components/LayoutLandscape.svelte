<script lang="ts">
	import { stateBet, stateConfig, stateUi } from 'state-shared';
	import { isReplayUi } from '../replayUi';
	import {
		bookEventAmountToBalanceWinCurrencyString,
		numberToBalanceWinCurrencyString,
	} from 'utils-shared/amount';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle } from 'pixi-svelte';

	import {
		UI_BASE_SIZE,
		UI_CHROME_ALPHA,
		UI_CHROME_BG,
	} from '../constants';
	import { getContext } from '../context';
	import type { LayoutUiProps } from '../types';
	import MenuPanel, { MENU_PANEL_HEIGHT } from './MenuPanel.svelte';
	import BetMenuPanel, {
		betMenuPanelSize,
		betMenuMaxHeightForLayout,
		BET_MENU_TOP_RATIO,
		PORTRAIT_BET_MENU_OPTS,
	} from './BetMenuPanel.svelte';
	import AutoplayPanel, {
		autoplayPanelSize,
		PORTRAIT_AUTOPLAY_OPTS,
	} from './AutoplayPanel.svelte';
	import PanelTotalWin, { TOTAL_WIN_H, TOTAL_WIN_W } from './PanelTotalWin.svelte';
	import PanelFreeSpins, { FREE_SPINS_H, FREE_SPINS_W } from './PanelFreeSpins.svelte';
	import LabelBetReadonly from './LabelBetReadonly.svelte';

	const props: LayoutUiProps = $props();
	const context = getContext();

	/**
	 * Mini player / mobile landscape (400×225 Popout S → layoutType landscape).
	 * Coordinates are mainLayoutStandard landscape: 1920×1080.
	 * Rails sit at 20% / 80% width — inset from the borders.
	 */
	const BOTTOM_PAD = 0; // glue info pills to bottom (same as portrait mobile)
	const INFO_H = 96;
	const INFO_BG = 0x000000;
	const CHROME_RADIUS = 18;
	const INFO_PAD = 14;

	const SPIN_SCALE = 2.05;
	const BONUS_SCALE = SPIN_SCALE; // same size as spin
	const MENU_SCALE = 1.05;
	const TURBO_SCALE = 1.15;
	const AUTO_SCALE = 1.15;

	const MENU_POPUP_SCALE = 2.1;
	const AUTOPLAY_POPUP_SCALE = 1.55;
	const BET_MENU_POPUP_SCALE = 1.55;

	const BONUS_SIZE = UI_BASE_SIZE * BONUS_SCALE;
	const MENU_SIZE = UI_BASE_SIZE * MENU_SCALE;
	const MENU_BG_SIZE = MENU_SIZE + 22;
	const TURBO_SIZE = UI_BASE_SIZE * TURBO_SCALE;
	const SPIN_SIZE = UI_BASE_SIZE * SPIN_SCALE;
	const AUTO_SIZE = UI_BASE_SIZE * AUTO_SCALE;

	const isReplay = $derived(isReplayUi());
	const freeSpins = $derived(stateUi.freeSpinCounterShow);
	const bonusBar = $derived(freeSpins || isReplay);
	const hasWin = $derived((stateBet.winBookEventAmount ?? 0) > 0);

	const layout = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const W = $derived(layout.width);
	const H = $derived(layout.height);
	const cx = $derived(W * 0.5);
	const cy = $derived(H * 0.5);

	const LEFT_X = $derived(W * 0.2);
	const RIGHT_X = $derived(W * 0.8);

	// Black top-rounded pills, flat bottoms glued to screen edge
	const infoTop = $derived(H - BOTTOM_PAD - INFO_H);
	const infoY = $derived(infoTop + INFO_H * 0.5);
	const infoDrawH = $derived(INFO_H + CHROME_RADIUS);

	// Left: bonus @ vertical center; settings lowered toward the bottom bar
	const BONUS_Y = $derived(cy);
	const MENU_Y = $derived(infoTop - MENU_BG_SIZE * 0.5 - 28);

	// Right: turbo → spin → autoplay (above bottom bar)
	const SPIN_Y = $derived(cy);
	const TURBO_Y = $derived(cy - SPIN_SIZE * 0.55 - TURBO_SIZE * 0.55 - 16);
	const AUTO_Y = $derived(
		Math.min(
			cy + SPIN_SIZE * 0.55 + AUTO_SIZE * 0.55 + 16,
			infoTop - AUTO_SIZE * 0.5 - 20,
		),
	);

	const balanceStr = $derived(numberToBalanceWinCurrencyString(stateBet.balanceAmount));
	const winStr = $derived(
		hasWin ? bookEventAmountToBalanceWinCurrencyString(stateBet.winBookEventAmount) : '',
	);
	const amountPillW = (text: string) => {
		const chars = Math.max(4, text.length);
		return Math.min(320, Math.max(150, chars * 14 + 28));
	};
	const BALANCE_W = $derived(amountPillW(balanceStr));
	const BET_W = 200;
	const WIN_W = $derived(amountPillW(winStr || 'WIN000.00'));
	// Pills centered on the 20% / 50% / 80% columns
	const balanceX = $derived(LEFT_X - BALANCE_W * 0.5);
	const betX = $derived(RIGHT_X - BET_W * 0.5);
	const winX = $derived(cx - WIN_W * 0.5);

	const FS_GAP = 12;
	const FS_ROW_W = TOTAL_WIN_W + FS_GAP + FREE_SPINS_W;
	const FS_ROW_H = Math.max(TOTAL_WIN_H, FREE_SPINS_H);
	const FS_SCALE = 1.35;
	const fsRowW = $derived(freeSpins ? FS_ROW_W : TOTAL_WIN_W);
	// Free spins panels sit at center bottom, just above the glued info row
	const FS_Y = $derived(infoTop - FS_ROW_H * FS_SCALE - -80);

	const betOptionCount = $derived(
		(stateConfig.betAmountOptions.length > 0
			? stateConfig.betAmountOptions
			: stateConfig.betMenuOptions
		).length,
	);
	const betMenuBottom = $derived(infoTop - 16);
	const betMaxH = $derived(
		betMenuMaxHeightForLayout(H, betMenuBottom, BET_MENU_POPUP_SCALE, PORTRAIT_BET_MENU_OPTS),
	);
	const betPanel = $derived(
		betMenuPanelSize(betOptionCount, { ...PORTRAIT_BET_MENU_OPTS, maxHeight: betMaxH }),
	);
	const autoplayPanel = autoplayPanelSize(PORTRAIT_AUTOPLAY_OPTS);

	const isMini = $derived(context.stateLayoutDerived.canvasSizes().height <= 280);
</script>

{#if !isMini}
	<Container x={20}>
		{@render props.gameName()}
	</Container>
	<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
		{@render props.logo()}
	</Container>
{/if}

<MainContainer standard>
	{#if stateUi.menuOpen}
		<!-- Settings opens toward the board (right of menu) -->
		<Container
			x={LEFT_X + MENU_BG_SIZE * 0.5 + 16}
			y={MENU_Y - MENU_PANEL_HEIGHT * MENU_POPUP_SCALE - 12}
			scale={MENU_POPUP_SCALE}
			eventMode="static"
		>
			<MenuPanel />
		</Container>
	{/if}

	{#if stateUi.betMenuOpen && !bonusBar}
		<!-- Fixed height from 30% down; extra bet levels scroll -->
		<Container
			x={cx - betPanel.width * BET_MENU_POPUP_SCALE * 0.5}
			y={H * BET_MENU_TOP_RATIO}
			scale={BET_MENU_POPUP_SCALE}
			eventMode="static"
		>
			<BetMenuPanel {...PORTRAIT_BET_MENU_OPTS} maxHeight={betMaxH} />
		</Container>
	{/if}

	{#if stateUi.autoplayMenuOpen && !bonusBar}
		<!-- Autoplay pops out to the left of the autoplay button -->
		<Container
			x={RIGHT_X - AUTO_SIZE * 0.5 - autoplayPanel.width * AUTOPLAY_POPUP_SCALE - 14}
			y={AUTO_Y - autoplayPanel.height * AUTOPLAY_POPUP_SCALE * 0.5}
			scale={AUTOPLAY_POPUP_SCALE}
			eventMode="static"
		>
			<AutoplayPanel {...PORTRAIT_AUTOPLAY_OPTS} />
		</Container>
	{/if}

	{#if !bonusBar}
		<Container x={LEFT_X} y={BONUS_Y} scale={BONUS_SCALE}>
			{@render props.buttonBuyBonus({ anchor: 0.5 })}
		</Container>
	{/if}

	<!-- Settings lowered toward bottom bar -->
	<Rectangle
		width={MENU_BG_SIZE}
		height={MENU_BG_SIZE}
		x={LEFT_X - MENU_BG_SIZE * 0.5}
		y={MENU_Y - MENU_BG_SIZE * 0.5}
		borderRadius={CHROME_RADIUS}
		backgroundColor={UI_CHROME_BG}
		alpha={UI_CHROME_ALPHA}
		eventMode="none"
	/>
	<Container x={LEFT_X} y={MENU_Y} scale={MENU_SCALE}>
		{#if stateUi.menuOpen}
			{@render props.buttonMenuClose({ anchor: 0.5 })}
		{:else}
			{@render props.buttonMenu({ anchor: 0.5 })}
		{/if}
	</Container>

	{#if bonusBar}
		<!-- TOTAL WIN, plus FREE SPINS while the feature is running -->
		<Container x={cx - fsRowW * FS_SCALE * 0.5} y={FS_Y} scale={FS_SCALE}>
			<PanelTotalWin />
			{#if freeSpins}
				<Container x={TOTAL_WIN_W + FS_GAP}>
					<PanelFreeSpins />
				</Container>
			{/if}
		</Container>

		<Container x={RIGHT_X} y={SPIN_Y} scale={TURBO_SCALE}>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>
	{:else}
		<Container x={RIGHT_X} y={TURBO_Y} scale={TURBO_SCALE}>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>

		<Container x={RIGHT_X} y={SPIN_Y} scale={SPIN_SCALE}>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>

		<Container x={RIGHT_X} y={AUTO_Y} scale={AUTO_SCALE}>
			{@render props.buttonAutoSpin({ anchor: 0.5 })}
		</Container>
	{/if}

	<!-- Bottom bar glued to screen: balance | win | bet -->
	{#if !isReplay}
		<Rectangle
			width={BALANCE_W}
			height={infoDrawH}
			x={balanceX}
			y={infoTop}
			borderRadius={CHROME_RADIUS}
			backgroundColor={INFO_BG}
			alpha={1}
			eventMode="none"
		/>
		<Container x={balanceX + BALANCE_W * 0.5} y={infoY}>
			{@render props.amountBalance({
				stacked: true,
				align: 'center',
				maxWidth: BALANCE_W - INFO_PAD,
			})}
		</Container>
	{/if}

	{#if bonusBar}
		<Rectangle
			width={BET_W}
			height={infoDrawH}
			x={betX}
			y={infoTop}
			borderRadius={CHROME_RADIUS}
			backgroundColor={INFO_BG}
			alpha={1}
			eventMode="none"
		/>
		<Container x={betX + BET_W * 0.5} y={infoY}>
			<LabelBetReadonly align="center" maxWidth={BET_W - INFO_PAD} />
		</Container>
	{:else}
		<Rectangle
			width={BET_W}
			height={infoDrawH}
			x={betX}
			y={infoTop}
			borderRadius={CHROME_RADIUS}
			backgroundColor={INFO_BG}
			alpha={1}
			eventMode="none"
		/>
		<Container x={betX + BET_W * 0.5} y={infoY}>
			{@render props.amountBet({
				stacked: true,
				showMeter: false,
				align: 'center',
			})}
		</Container>

		{#if hasWin}
			<Rectangle
				width={WIN_W}
				height={infoDrawH}
				x={winX}
				y={infoTop}
				borderRadius={CHROME_RADIUS}
				backgroundColor={INFO_BG}
				alpha={1}
				eventMode="none"
			/>
			<Container x={winX + WIN_W * 0.5} y={infoY}>
				{@render props.amountWin({
					stacked: true,
					align: 'center',
					maxWidth: WIN_W - INFO_PAD,
				})}
			</Container>
		{/if}
	{/if}
</MainContainer>
