<script lang="ts">
	import { stateUi } from 'state-shared';
	import { isReplayUi } from '../replayUi';
	import { MainContainer } from 'components-layout';
	import { Container, anchorToPivot } from 'pixi-svelte';

	import { getContext } from '../context';
	import type { LayoutUiProps } from '../types';
	import LabelFreeSpinCounter from './LabelFreeSpinCounter.svelte';
	import MenuPanel, { MENU_PANEL_HEIGHT } from './MenuPanel.svelte';
	import { DESKTOP_BASE_SIZE, DESKTOP_BACKGROUND_WIDTH_LIST } from '../constants';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const isReplay = $derived(isReplayUi());
</script>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<MainContainer standard alignVertical="bottom">
	<Container
		x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5}
		y={context.stateLayoutDerived.mainLayoutStandard().height - DESKTOP_BASE_SIZE - 30}
		pivot={anchorToPivot({
			anchor: { x: 0.5, y: 0 },
			sizes: {
				height: DESKTOP_BASE_SIZE,
				width: DESKTOP_BACKGROUND_WIDTH_LIST.reduce((sum, width) => sum + width, 0),
			},
		})}
	>
		{#if !isReplay}
			<Container y={DESKTOP_BASE_SIZE * 0.5 - 220} x={880 - 640}>
				{@render props.amountBalance({ stacked: true })}
			</Container>
		{/if}

		<Container y={DESKTOP_BASE_SIZE * 0.5 - 220} x={880}>
			{@render props.amountWin({ stacked: true })}
		</Container>

		<Container y={DESKTOP_BASE_SIZE * 0.5 - 220} x={880 + 640}>
			{@render props.amountBet({ stacked: true })}
		</Container>

		<Container y={DESKTOP_BASE_SIZE * 0.5} x={20}>
			{#if stateUi.menuOpen}
				{@render props.buttonMenuClose({ anchor: 0.5 })}
			{:else}
				{@render props.buttonMenu({ anchor: 0.5 })}
			{/if}
		</Container>

		{#if !isReplay}
			<Container y={DESKTOP_BASE_SIZE * 0.5} x={20 + 180}>
				{@render props.buttonBuyBonus({ anchor: 0.5 })}
			</Container>

			<Container y={DESKTOP_BASE_SIZE * 0.5} x={-10 + 180 * 4}>
				{@render props.buttonAutoSpin({ anchor: 0.5 })}
			</Container>

			<Container y={DESKTOP_BASE_SIZE * 0.5} x={-10 + 180 * 5}>
				{@render props.buttonBet({ anchor: 0.5 })}
			</Container>
		{/if}

		<Container y={DESKTOP_BASE_SIZE * 0.5} x={-10 + 180 * 6}>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>

		{#if !isReplay}
			<Container y={DESKTOP_BASE_SIZE * 0.5} x={1560}>
				{@render props.buttonDecrease({ anchor: 0.5 })}
			</Container>

			<Container y={DESKTOP_BASE_SIZE * 0.5} x={1560 + 180}>
				{@render props.buttonIncrease({ anchor: 0.5 })}
			</Container>
		{/if}

		{#if stateUi.freeSpinCounterShow}
			<Container y={DESKTOP_BASE_SIZE * 0.5 - 320} x={668}>
				<LabelFreeSpinCounter />
			</Container>
		{/if}
	</Container>
</MainContainer>

{#if stateUi.menuOpen}
	<MainContainer standard alignVertical="bottom">
		<Container
			x={40}
			y={context.stateLayoutDerived.mainLayoutStandard().height - DESKTOP_BASE_SIZE - 30 - MENU_PANEL_HEIGHT - 10}
			eventMode="static"
		>
			<MenuPanel />
		</Container>
	</MainContainer>
{/if}
