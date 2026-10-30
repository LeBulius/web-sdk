<script lang="ts">
	import { Container, Rectangle } from 'pixi-svelte';

	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getReelOffsetY, getSymbolY } from '../game/utils';
	import { gridSymbolScale, gridSymbolX, gridSymbolY } from '../game/grid';
	import { CELL_WINDOW_SIZE, REEL_ROWS, SYMBOL_SIZE } from '../game/constants';
	import type { TumbleSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		tumbleSymbol: TumbleSymbol;
	};

	const props: Props = $props();
	const frameY = $derived(props.tumbleSymbol.symbolY.current + getReelOffsetY(props.reelIndex));
	const y = $derived(gridSymbolY(props.reelIndex, props.tumbleSymbol.symbolY.current));
	const scale = $derived(props.tumbleSymbol.symbolScale.current * gridSymbolScale());

	const inVisibleBand = $derived.by(() => {
		const rows = REEL_ROWS[props.reelIndex];
		const localY = props.tumbleSymbol.symbolY.current;
		const top = getSymbolY(0) - SYMBOL_SIZE * 0.55;
		const bottom = getSymbolY(rows - 1) + SYMBOL_SIZE * 0.55;
		return localY >= top && localY <= bottom;
	});

	const hideExploded = $derived(props.tumbleSymbol.symbolState === 'explosion');
</script>

{#if inVisibleBand && !hideExploded}
	<SymbolWrap
		x={gridSymbolX(props.reelIndex)}
		{y}
		{frameY}
		animating={
			props.tumbleSymbol.symbolState === 'land' ||
			props.tumbleSymbol.symbolState === 'win' ||
			props.tumbleSymbol.symbolState === 'spin'
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
		<Container scale={scale}>
			<Symbol
				state={props.tumbleSymbol.symbolState}
				rawSymbol={props.tumbleSymbol.rawSymbol}
				oncomplete={props.tumbleSymbol.oncomplete}
			/>
		</Container>
	</SymbolWrap>
{/if}
