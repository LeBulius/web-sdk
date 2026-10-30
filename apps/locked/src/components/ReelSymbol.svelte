<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { Container } from 'pixi-svelte';
	import { getSymbolInfo, getReelOffsetY, isVisibleBoardCell } from '../game/utils';
	import { gridSymbolScale, gridSymbolX, gridSymbolY } from '../game/grid';
	import type { ReelSymbol } from '../game/stateGame.svelte';
	import { getContext } from '../game/context';
	import { CELL_WINDOW_SIZE, NON_WINNER_DIM_ALPHA, SYMBOL_SIZE } from '../game/constants';

	type Props = {
		reelIndex: number;
		reelSymbol: ReelSymbol;
	};

	const props: Props = $props();
	const context = getContext();
	const symbolInfo = $derived(
		getSymbolInfo({ rawSymbol: props.reelSymbol.rawSymbol, state: props.reelSymbol.symbolState }),
	);
	// layout-editor grid: reel-local y (old units) mapped onto the builder grid.
	const frameY = $derived(props.reelSymbol.symbolY.current + getReelOffsetY(props.reelIndex));
	const y = $derived(gridSymbolY(props.reelIndex, props.reelSymbol.symbolY.current));
	const x = $derived(
		gridSymbolX(
			props.reelIndex,
			isVisibleBoardCell(props.reelIndex, props.reelSymbol.symbolIndexOfBoard)
				? props.reelSymbol.symbolIndexOfBoard
				: undefined,
		),
	);
	const artScale = $derived(gridSymbolScale());
	const eventRow = $derived(props.reelSymbol.symbolIndexOfBoard + 1);
	const overlayHidden = $derived.by(() => {
		if (context.stateGame.coveredOverlayReels.includes(props.reelIndex)) return true;
		return context.stateGame.hiddenOverlayCells.some(
			(cell) => cell.reel === props.reelIndex && cell.row === eventRow,
		);
	});
	const spinning = $derived(props.reelSymbol.spinStrip.length > 0);
	const isWinner = $derived(
		context.stateGame.winPositions.some(
			(pos) => pos.reel === props.reelIndex && pos.row === eventRow,
		),
	);
	const dimmed = $derived(context.stateGame.winPositions.length > 0 && !isWinner && !spinning);
	const stripY = $derived(props.reelSymbol.stripY.current);
	const visible = $derived(
		!overlayHidden &&
			(isVisibleBoardCell(props.reelIndex, props.reelSymbol.symbolIndexOfBoard) ||
				props.reelSymbol.symbolState === 'spin' ||
				props.reelSymbol.symbolState === 'land' ||
				props.reelSymbol.symbolState === 'win'),
	);
</script>

{#if visible}
	<SymbolWrap
		{x}
		{y}
		{frameY}
		alpha={dimmed ? NON_WINNER_DIM_ALPHA : 1}
		animating={
			spinning ||
			props.reelSymbol.symbolState === 'land' ||
			props.reelSymbol.symbolState === 'win' ||
			(symbolInfo.type === 'spine' && props.reelSymbol.symbolState === 'win')
		}
	>
		<Rectangle
			isMask
			anchor={0.5}
			x={0}
			y={0}
			width={CELL_WINDOW_SIZE}
			height={CELL_WINDOW_SIZE}
		/>
		<Container scale={artScale}>
		{#if spinning}
			{#each props.reelSymbol.spinStrip as face, index (`${face.name}-${index}`)}
				<Symbol
					state="spin"
					rawSymbol={face}
					y={stripY - index * SYMBOL_SIZE}
				/>
			{/each}
		{:else}
			<Symbol
				state={props.reelSymbol.symbolState}
				rawSymbol={props.reelSymbol.rawSymbol}
				oncomplete={() => {
					if (props.reelSymbol.symbolState === 'win') props.reelSymbol.oncomplete();
					if (props.reelSymbol.symbolState === 'land') props.reelSymbol.symbolState = 'static';
				}}
			/>
		{/if}
		</Container>
	</SymbolWrap>
{/if}
