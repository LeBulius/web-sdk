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

	/** Portrait UI global scale (×1.5 vs earlier base) */
	const S = 1.5;
	/** Settings popup scale (Lazy Thief / Motor Ways reference) */
	const MENU_POPUP_SCALE = 2.35;
	/** Shared scale for bet + autoplay popups so text matches */
	const AUTOPLAY_POPUP_SCALE = 1.85;
	const BET_MENU_POPUP_SCALE = AUTOPLAY_POPUP_SCALE;
	/** Extra lift so settings sits clearly above the action row */
	const MENU_POPUP_GAP = -20 * S;

	// Info pills — black, top-rounded, flat bottom glued to screen
	const BOTTOM_PAD = 0;
	const INFO_H = 72 * S;
	const INFO_BG = 0x000000;
	const INFO_SEG_BG = 0x2a2a2a; // bet arrow segments
	const ACTION_GAP_ABOVE_INFO = 20 * S;
	const ACTION_GAP = 12 * S;
	const CHROME_RADIUS = 14 * S;
	const SIDE_PAD = 56 * S; // menu + balance inset from left
	const ARROW_SEG_W = 72 * S;
	const INFO_PAD = 16; // unscaled padding inside amountFit maxWidth

	// Action scales — spin ≈ bonus; auto/turbo smaller; menu chrome square
	const SPIN_SCALE = 1.55 * S;
	const SIDE_SCALE = 0.7 * S;
	const MENU_SCALE = 0.55 * S;
	const BONUS_SCALE = 1.55 * S;
	const ARROW_SCALE = 0.55 * S;

	const SPIN_SIZE = UI_BASE_SIZE * SPIN_SCALE;
	const SIDE_SIZE = UI_BASE_SIZE * SIDE_SCALE;
	const MENU_SIZE = UI_BASE_SIZE * MENU_SCALE;
	const BONUS_SIZE = UI_BASE_SIZE * BONUS_SCALE;
	const MENU_BG_SIZE = MENU_SIZE + 18 * S;

	const isReplay = $derived(isReplayUi());
	const freeSpins = $derived(stateUi.freeSpinCounterShow);
	const bonusBar = $derived(freeSpins || isReplay);
	const hasWin = $derived((stateBet.winBookEventAmount ?? 0) > 0);

	const layout = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const cx = $derived(layout.width * 0.5);
	// Visible pill top; height overhangs past layout bottom so only top corners show rounded
	const infoTop = $derived(layout.height - BOTTOM_PAD - INFO_H);
	const infoY = $derived(infoTop + INFO_H * 0.5);
	const infoDrawH = $derived(INFO_H + CHROME_RADIUS);
	const actionY = $derived(infoTop - ACTION_GAP_ABOVE_INFO - SPIN_SIZE * 0.5);

	// Menu far left; bonus far right (same row as spin)
	const MENU_X = SIDE_PAD + MENU_BG_SIZE * 0.5;

	// Balance / win pills — width grows with formatted amount, text FitText-clamped inside
	const balanceStr = $derived(numberToBalanceWinCurrencyString(stateBet.balanceAmount));
	const winStr = $derived(
		hasWin ? bookEventAmountToBalanceWinCurrencyString(stateBet.winBookEventAmount) : '',
	);
	const amountPillW = (text: string) => {
		const chars = Math.max(4, text.length);
		const unscaled = Math.min(240, Math.max(120, chars * 12 + 24));
		return unscaled * S;
	};
	const BALANCE_W = $derived(amountPillW(balanceStr));
	const WIN_W = $derived(amountPillW(winStr || 'WIN000.00'));
	const balanceX = $derived(Math.max(8, MENU_X - BALANCE_W * 0.5));

	const BET_W = 280 * S;
	const BET_W_BONUS = 168 * S;
	const betW = $derived(bonusBar ? BET_W_BONUS : BET_W);
	const betX = $derived(cx - betW * 0.5);

	// Center cluster — auto / spin / turbo
	const SPIN_X = $derived(cx);
	const AUTO_X = $derived(cx - SPIN_SIZE * 0.5 - SIDE_SIZE * 0.5 - ACTION_GAP);
	const TURBO_X = $derived(cx + SPIN_SIZE * 0.5 + SIDE_SIZE * 0.5 + ACTION_GAP);
	const BONUS_X = $derived(TURBO_X + SIDE_SIZE * 0.5 + BONUS_SIZE * 0.5 + ACTION_GAP);
	// Bonus round: turbo parks on the far right (where bonus button sat)
	const TURBO_X_BONUS = $derived(
		Math.min(layout.width - SIDE_PAD - SIDE_SIZE * 0.5, BONUS_X + BONUS_SIZE * 0.15),
	);
	const winX = $derived(
		Math.min(layout.width - WIN_W - 8, BONUS_X - WIN_W * 0.5),
	);

	const FS_GAP = 14;
	const FS_ROW_W = TOTAL_WIN_W + FS_GAP + FREE_SPINS_W;
	const FS_ROW_H = Math.max(TOTAL_WIN_H, FREE_SPINS_H);
	const fsRowW = $derived(freeSpins ? FS_ROW_W : TOTAL_WIN_W);

	const betOptionCount = $derived(
		(stateConfig.betAmountOptions.length > 0
			? stateConfig.betAmountOptions
			: stateConfig.betMenuOptions
		).length,
	);
	const betMenuBottom = $derived(actionY - SPIN_SIZE * 0.5 - 16 * S);
	const betMaxH = $derived(
		betMenuMaxHeightForLayout(layout.height, betMenuBottom, BET_MENU_POPUP_SCALE, PORTRAIT_BET_MENU_OPTS),
	);
	const betPanel = $derived(
		betMenuPanelSize(betOptionCount, { ...PORTRAIT_BET_MENU_OPTS, maxHeight: betMaxH }),
	);
	const autoplayPanel = autoplayPanelSize(PORTRAIT_AUTOPLAY_OPTS);
</script>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<MainContainer standard alignVertical="bottom">
	{#if stateUi.menuOpen}
		<!-- Raised above action row / close button -->
		<Container
			x={MENU_X - MENU_BG_SIZE * 0.5}
			y={actionY - SPIN_SIZE * 0.5 - MENU_PANEL_HEIGHT * MENU_POPUP_SCALE - MENU_POPUP_GAP}
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
			y={layout.height * BET_MENU_TOP_RATIO}
			scale={BET_MENU_POPUP_SCALE}
			eventMode="static"
		>
			<BetMenuPanel {...PORTRAIT_BET_MENU_OPTS} maxHeight={betMaxH} />
		</Container>
	{/if}

	{#if stateUi.autoplayMenuOpen && !bonusBar}
		<!-- Centered horizontally on spin, floating above it -->
		<Container
			x={SPIN_X - autoplayPanel.width * AUTOPLAY_POPUP_SCALE * 0.5}
			y={actionY - SPIN_SIZE * 0.5 - autoplayPanel.height * AUTOPLAY_POPUP_SCALE - 14 * S}
			scale={AUTOPLAY_POPUP_SCALE}
			eventMode="static"
		>
			<AutoplayPanel {...PORTRAIT_AUTOPLAY_OPTS} />
		</Container>
	{/if}

	<!-- Action row: menu | auto spin turbo | bonus -->
	<Rectangle
		width={MENU_BG_SIZE}
		height={MENU_BG_SIZE}
		x={MENU_X - MENU_BG_SIZE * 0.5}
		y={actionY - MENU_BG_SIZE * 0.5}
		borderRadius={CHROME_RADIUS}
		backgroundColor={UI_CHROME_BG}
		alpha={UI_CHROME_ALPHA}
		eventMode="none"
	/>
	<Container x={MENU_X} y={actionY} scale={MENU_SCALE}>
		{#if stateUi.menuOpen}
			{@render props.buttonMenuClose({ anchor: 0.5 })}
		{:else}
			{@render props.buttonMenu({ anchor: 0.5 })}
		{/if}
	</Container>

	{#if bonusBar}
		<!-- Bonus / replay bar: TOTAL WIN, plus FREE SPINS while the feature is running -->
		<Container
			x={cx - fsRowW * S * 0.5}
			y={actionY - FS_ROW_H * S * 0.5}
			scale={S}
		>
			<PanelTotalWin />
			{#if freeSpins}
				<Container x={TOTAL_WIN_W + FS_GAP}>
					<PanelFreeSpins />
				</Container>
			{/if}
		</Container>

		<Container x={TURBO_X_BONUS} y={actionY} scale={SIDE_SCALE}>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>
	{:else}
		<Container x={AUTO_X} y={actionY} scale={SIDE_SCALE}>
			{@render props.buttonAutoSpin({ anchor: 0.5 })}
		</Container>

		<Container x={SPIN_X} y={actionY} scale={SPIN_SCALE}>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>

		<Container x={TURBO_X} y={actionY} scale={SIDE_SCALE}>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>

		<Container x={BONUS_X} y={actionY} scale={BONUS_SCALE}>
			{@render props.buttonBuyBonus({ anchor: 0.5 })}
		</Container>
	{/if}

	<!-- Info row: black top-rounded pills, flat bottoms glued to screen -->
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
		<Container x={balanceX + BALANCE_W * 0.5} y={infoY} scale={S}>
			{@render props.amountBalance({
				stacked: true,
				align: 'center',
				maxWidth: BALANCE_W / S - INFO_PAD,
			})}
		</Container>
	{/if}

	{#if bonusBar}
		<Rectangle
			width={betW}
			height={infoDrawH}
			x={betX}
			y={infoTop}
			borderRadius={CHROME_RADIUS}
			backgroundColor={INFO_BG}
			alpha={1}
			eventMode="none"
		/>
		<Container x={betX + betW * 0.5} y={infoY} scale={S}>
			<LabelBetReadonly align="center" maxWidth={betW / S - INFO_PAD} />
		</Container>
	{:else}
		<!-- Bet shell -->
		<Rectangle
			width={betW}
			height={infoDrawH}
			x={betX}
			y={infoTop}
			borderRadius={CHROME_RADIUS}
			backgroundColor={INFO_BG}
			alpha={1}
			eventMode="none"
		/>
		<!-- Arrow segments (slightly lighter; top outer corners rounded) -->
		<Rectangle
			width={ARROW_SEG_W}
			height={infoDrawH}
			x={betX}
			y={infoTop}
			borderRadius={[CHROME_RADIUS, 0, 0, 0]}
			backgroundColor={INFO_SEG_BG}
			alpha={1}
			eventMode="none"
		/>
		<Rectangle
			width={ARROW_SEG_W}
			height={infoDrawH}
			x={betX + betW - ARROW_SEG_W}
			y={infoTop}
			borderRadius={[0, CHROME_RADIUS, 0, 0]}
			backgroundColor={INFO_SEG_BG}
			alpha={1}
			eventMode="none"
		/>

		<Container x={betX + ARROW_SEG_W * 0.5} y={infoY} scale={ARROW_SCALE}>
			{@render props.buttonDecrease({ anchor: 0.5 })}
		</Container>

		<Container x={betX + betW * 0.5} y={infoY} scale={S}>
			{@render props.amountBet({ stacked: true, showMeter: false, align: 'center' })}
		</Container>

		<Container x={betX + betW - ARROW_SEG_W * 0.5} y={infoY} scale={ARROW_SCALE}>
			{@render props.buttonIncrease({ anchor: 0.5 })}
		</Container>
	{/if}

	<!-- Win pill under bonus (opposite balance); only when there is a win -->
	{#if hasWin && !bonusBar}
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
		<Container x={winX + WIN_W * 0.5} y={infoY} scale={S}>
			{@render props.amountWin({
				stacked: true,
				align: 'center',
				maxWidth: WIN_W / S - INFO_PAD,
			})}
		</Container>
	{/if}
</MainContainer>
