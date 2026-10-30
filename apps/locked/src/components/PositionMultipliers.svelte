<script lang="ts">
	import { Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { REEL_ROWS, SYMBOL_SIZE } from '../game/constants';
	import { gridCellCenter } from '../game/grid';
	import BoardContainer from './BoardContainer.svelte';

	const context = getContext();

	const fontSize = $derived(
		context.stateLayoutDerived.canvasSizes().height <= 280 ? 11 : 16,
	);

	const isPulsing = (reelIndex: number, row: number) =>
		context.stateGame.multiplierPulse.some((pos) => pos.reel === reelIndex && pos.row === row);
</script>

<BoardContainer>
	{#each REEL_ROWS as rows, reelIndex (reelIndex)}
		{#each Array(rows) as _, row (`${reelIndex}-${row}`)}
			{@const covered = context.stateGame.coveredOverlayReels.includes(reelIndex)}
			{@const eventRow = row + 1}
			{@const cellHidden = context.stateGame.hiddenOverlayCells.some(
				(cell) => cell.reel === reelIndex && cell.row === eventRow,
			)}
			{#if !covered && !cellHidden}
				{@const mult = context.stateGame.positionMultipliers[reelIndex][row]}
				{@const center = gridCellCenter(reelIndex, row)}
				{@const x = center.x}
				{@const y = center.y}
				{@const pulse = isPulsing(reelIndex, row)}
				{#if mult > 1}
					<Text
						anchor={{ x: 1, y: 0 }}
						x={x + SYMBOL_SIZE * 0.42}
						y={y - SYMBOL_SIZE * 0.42}
						text={`x${mult}`}
						style={{
							fontFamily: 'Outfit SemiBold',
							fontSize: pulse ? fontSize + 6 : fontSize,
							fontWeight: '700',
							fill: pulse ? 0xfff4cc : 0xffd76a,
							stroke: { color: 0x000000, width: 3 },
						}}
						alpha={0.95}
					/>
				{/if}
			{/if}
		{/each}
	{/each}
</BoardContainer>
