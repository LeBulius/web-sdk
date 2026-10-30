<script lang="ts">
	import { stateConfig, stateUi } from 'state-shared';
	import { isReplayUi } from '../replayUi';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle, anchorToPivot } from 'pixi-svelte';

	import {
		DESKTOP_BASE_SIZE,
		UI_BASE_SIZE,
		UI_CHROME_ALPHA,
		UI_CHROME_BG,
		UI_CHROME_BORDER_ALPHA,
		UI_CHROME_BORDER_COLOR,
		UI_CHROME_BORDER_WIDTH,
		UI_CHROME_INSET_BG,
		UI_CHROME_RADIUS,
	} from '../constants';
	import { getContext } from '../context';
	import type { LayoutUiProps } from '../types';
	import MenuPanel, { MENU_PANEL_HEIGHT } from './MenuPanel.svelte';
	import BetMenuPanel, { betMenuPanelSize } from './BetMenuPanel.svelte';
	import AutoplayPanel, { autoplayPanelSize } from './AutoplayPanel.svelte';
	import PanelTotalWin, { TOTAL_WIN_H, TOTAL_WIN_W } from './PanelTotalWin.svelte';
	import PanelFreeSpins, { FREE_SPINS_H, FREE_SPINS_W } from './PanelFreeSpins.svelte';
	import LabelBetReadonly from './LabelBetReadonly.svelte';
	import { BET_METER_GAP, BET_METER_H } from './LabelBet.svelte';

	const props: LayoutUiProps = $props();
	const context = getContext();

	const BAR_WIDTH = 920;
	// Spin slightly taller than the bar; auto/turbo are ~half spin and stack to its right
	const ACTION_SCALE = 1.25;
	const SIDE_SCALE = 0.52;
	const SPIN_SIZE = UI_BASE_SIZE * ACTION_SCALE;
	const SIDE_SIZE = UI_BASE_SIZE * SIDE_SCALE;
	const SIDE_GAP = 6;
	// Spin/bonus overflow past the bar; keep enough bottom clearance so they aren't clipped
	const ACTION_OVERFLOW = (SPIN_SIZE - DESKTOP_BASE_SIZE) * 0.5;
	const BOTTOM_PAD = Math.ceil(Math.max(0, ACTION_OVERFLOW)) + 16;
	const barCenterY = DESKTOP_BASE_SIZE * 0.5;
	/** Optical center for stacked label + amount */
	const TEXT_CENTER_Y = barCenterY - 3;
	const MENU_BTN_X = 42;
	const PANEL_GAP = 10;

	// Action cluster — spin + stacked auto/turbo
	const SPIN_X = 790;
	const SIDE_X = SPIN_X + SPIN_SIZE * 0.5 + SIDE_SIZE * 0.5 + 4;
	const SIDE_Y_OFFSET = (SIDE_SIZE + SIDE_GAP) * 0.5;

	/*
	 * Reference layout: Balance + Win grouped left of menu; Bet cluster near spin.
	 * Left-aligned stacks (not equal columns).
	 */
	const BALANCE_X = 88;
	const WIN_X = 230;
	const AMOUNT_MAX_W = 130;

	/*
	 * Bet box + meter height matches ↑/↓ arrow stack:
	 * arrowsH = arrowSize + 2 * BET_ARROW_GAP_Y
	 * boxH    = arrowsH - meterGap - meterH
	 */
	const BET_BOX_W = 140;
	const BET_ARROW_SCALE = 0.34;
	const BET_ARROW_SIZE = UI_BASE_SIZE * BET_ARROW_SCALE;
	const BET_ARROW_GAP_X = 22;
	const BET_ARROW_GAP_Y = 22;
	const BET_ARROWS_H = BET_ARROW_SIZE + 2 * BET_ARROW_GAP_Y;
	const BET_CLUSTER_H = BET_ARROWS_H;
	const BET_BOX_H = BET_CLUSTER_H - BET_METER_GAP - BET_METER_H;
	const BET_CLUSTER_W = BET_BOX_W + BET_ARROW_GAP_X + 18;
	const BET_RIGHT = SPIN_X - SPIN_SIZE * 0.5 - 28;
	const BET_BOX_X = BET_RIGHT - BET_CLUSTER_W;
	const BET_BOX_Y = (DESKTOP_BASE_SIZE - BET_CLUSTER_H) * 0.5;
	const BET_CLUSTER_CENTER_Y = BET_BOX_Y + BET_CLUSTER_H * 0.5;
	const BET_ARROWS_X = BET_BOX_X + BET_BOX_W + BET_ARROW_GAP_X;

	// Free spins bar — total win + free spins stack + turbo on the right
	const FS_STACK_GAP = 8;
	const FS_STACK_H = Math.max(TOTAL_WIN_H, FREE_SPINS_H);
	const FS_STACK_W = TOTAL_WIN_W + FS_STACK_GAP + FREE_SPINS_W;
	const FS_TURBO_X = BAR_WIDTH - 48;
	const FS_STACK_Y = (DESKTOP_BASE_SIZE - FS_STACK_H) * 0.5;
	const FS_BALANCE_X = BALANCE_X;
	const FS_BET_X = 230;

	const isReplay = $derived(isReplayUi());
	const freeSpins = $derived(stateUi.freeSpinCounterShow);
	const bonusBar = $derived(freeSpins || isReplay);
	const fsStackW = $derived(freeSpins ? FS_STACK_W : TOTAL_WIN_W);
	const fsStackX = $derived(FS_TURBO_X - 56 - fsStackW);
	const fsBetX = $derived(isReplay ? BALANCE_X : FS_BET_X);

	const barY = $derived(
		context.stateLayoutDerived.mainLayoutStandard().height - DESKTOP_BASE_SIZE - BOTTOM_PAD,
	);
	const barLeftX = $derived(
		context.stateLayoutDerived.mainLayoutStandard().width * 0.5 - BAR_WIDTH * 0.5,
	);
	const betOptionCount = $derived(
		(stateConfig.betAmountOptions.length > 0
			? stateConfig.betAmountOptions
			: stateConfig.betMenuOptions
		).length,
	);
	const betPanel = $derived(betMenuPanelSize(betOptionCount));
	const autoplayPanel = autoplayPanelSize();
</script>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<MainContainer standard alignVertical="bottom">
	<!-- Settings popup above the bar (stays open until close button) -->
	{#if stateUi.menuOpen}
		<Container
			x={barLeftX}
			y={barY - MENU_PANEL_HEIGHT - PANEL_GAP}
			eventMode="static"
		>
			<MenuPanel />
		</Container>
	{/if}

	<!-- Bet menu popup — same chrome as settings menu, above the bet box -->
	{#if stateUi.betMenuOpen && !bonusBar}
		<Container
			x={barLeftX + BET_BOX_X + BET_BOX_W * 0.5 - betPanel.width * 0.5}
			y={barY - betPanel.height - PANEL_GAP}
			eventMode="static"
		>
			<BetMenuPanel />
		</Container>
	{/if}

	<!-- Autospin — same footprint as bet menu; right edge aligned with bar -->
	{#if stateUi.autoplayMenuOpen && !bonusBar}
		<Container
			x={barLeftX + BAR_WIDTH - autoplayPanel.width}
			y={barY - autoplayPanel.height - PANEL_GAP}
			eventMode="static"
		>
			<AutoplayPanel />
		</Container>
	{/if}

	<Container
		x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5}
		y={barY}
		pivot={anchorToPivot({
			anchor: { x: 0.5, y: 0 },
			sizes: {
				height: DESKTOP_BASE_SIZE,
				width: BAR_WIDTH,
			},
		})}
	>
		<!-- Bar background -->
		<Rectangle
			width={BAR_WIDTH}
			height={DESKTOP_BASE_SIZE}
			x={0}
			y={0}
			borderRadius={UI_CHROME_RADIUS}
			backgroundColor={UI_CHROME_BG}
			alpha={UI_CHROME_ALPHA}
			borderColor={UI_CHROME_BORDER_COLOR}
			borderWidth={UI_CHROME_BORDER_WIDTH}
			borderAlpha={UI_CHROME_BORDER_ALPHA}
		/>

		{#if bonusBar}
			<!-- Bonus / replay: menu | bet ........ total win / FS | turbo (no balance in replay) -->
			<Container x={MENU_BTN_X} y={barCenterY} scale={0.48}>
				{#if stateUi.menuOpen}
					{@render props.buttonMenuClose({ anchor: 0.5 })}
				{:else}
					{@render props.buttonMenu({ anchor: 0.5 })}
				{/if}
			</Container>

			{#if !isReplay}
				<Container x={FS_BALANCE_X} y={TEXT_CENTER_Y}>
					{@render props.amountBalance({
						stacked: true,
						align: 'left',
						maxWidth: AMOUNT_MAX_W,
					})}
				</Container>
			{/if}

			<Container x={fsBetX} y={TEXT_CENTER_Y}>
				<LabelBetReadonly align="left" maxWidth={AMOUNT_MAX_W} />
			</Container>

			<Container x={fsStackX} y={FS_STACK_Y}>
				<PanelTotalWin />
				{#if freeSpins}
					<Container x={TOTAL_WIN_W + FS_STACK_GAP}>
						<PanelFreeSpins />
					</Container>
				{/if}
			</Container>

			<Container x={FS_TURBO_X} y={barCenterY} scale={SIDE_SCALE}>
				{@render props.buttonTurbo({ anchor: 0.5 })}
			</Container>
		{:else}
			<!-- Base game layout -->
			<!-- Buy bonus (detached left, same size as spin) -->
			<Container x={-90} y={barCenterY} scale={ACTION_SCALE}>
				{@render props.buttonBuyBonus({ anchor: 0.5 })}
			</Container>

			<!-- Menu <-> Close swap -->
			<Container x={MENU_BTN_X} y={barCenterY} scale={0.48}>
				{#if stateUi.menuOpen}
					{@render props.buttonMenuClose({ anchor: 0.5 })}
				{:else}
					{@render props.buttonMenu({ anchor: 0.5 })}
				{/if}
			</Container>

			<!-- Balance + Win grouped left (reference) -->
			<Container x={BALANCE_X} y={TEXT_CENTER_Y}>
				{@render props.amountBalance({
					stacked: true,
					align: 'left',
					maxWidth: AMOUNT_MAX_W,
				})}
			</Container>

			<Container x={WIN_X} y={TEXT_CENTER_Y}>
				{@render props.amountWin({ stacked: true, align: 'left', maxWidth: AMOUNT_MAX_W })}
			</Container>

			<!-- Bet cluster near spin -->
			<Rectangle
				width={BET_BOX_W}
				height={BET_BOX_H}
				x={BET_BOX_X}
				y={BET_BOX_Y}
				borderRadius={UI_CHROME_RADIUS}
				backgroundColor={UI_CHROME_INSET_BG}
				alpha={1}
				borderColor={UI_CHROME_BORDER_COLOR}
				borderWidth={UI_CHROME_BORDER_WIDTH}
				borderAlpha={UI_CHROME_BORDER_ALPHA}
				eventMode="none"
			/>

			<Container x={BET_BOX_X} y={BET_BOX_Y}>
				{@render props.amountBet({
					stacked: true,
					width: BET_BOX_W,
					height: BET_BOX_H,
					showMeter: true,
					meterOutside: true,
				})}
			</Container>

			<Container
				x={BET_ARROWS_X}
				y={BET_CLUSTER_CENTER_Y - BET_ARROW_GAP_Y}
				scale={BET_ARROW_SCALE}
			>
				{@render props.buttonIncrease({ anchor: 0.5 })}
			</Container>
			<Container
				x={BET_ARROWS_X}
				y={BET_CLUSTER_CENTER_Y + BET_ARROW_GAP_Y}
				scale={BET_ARROW_SCALE}
			>
				{@render props.buttonDecrease({ anchor: 0.5 })}
			</Container>

			<!-- Spin — slightly taller than the bar -->
			<Container x={SPIN_X} y={barCenterY} scale={ACTION_SCALE}>
				{@render props.buttonBet({ anchor: 0.5 })}
			</Container>

			<!-- Auto + turbo — ~half spin, stacked to match spin height -->
			<Container x={SIDE_X} y={barCenterY - SIDE_Y_OFFSET} scale={SIDE_SCALE}>
				{@render props.buttonAutoSpin({ anchor: 0.5 })}
			</Container>
			<Container x={SIDE_X} y={barCenterY + SIDE_Y_OFFSET} scale={SIDE_SCALE}>
				{@render props.buttonTurbo({ anchor: 0.5 })}
			</Container>
		{/if}
	</Container>
</MainContainer>
