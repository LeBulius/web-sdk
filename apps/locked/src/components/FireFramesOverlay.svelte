<script lang="ts">
	import type { LoadedSprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { getCellWindowRect } from '../game/utils';
	import { cellKey } from '../game/overlayMiniReel';
	import { sliceFireRimSheet } from '../game/fireRimSheet';
	import type { Position } from '../game/types';
	import BoardContainer from './BoardContainer.svelte';
	import FireRimCell from './FireRimCell.svelte';

	type RimItem = Position & { exiting: boolean };

	const context = getContext();
	const sheet = $derived(context.stateApp.loadedAssets?.fireRimSheet as LoadedSprite | undefined);
	const textures = $derived.by(() => {
		if (!sheet?.width || !sheet.height) return [];
		return sliceFireRimSheet(sheet);
	});

	const rims = $derived.by((): RimItem[] => {
		const live = context.stateGame.fireFrames;
		const liveKeys = new Set(live.map(cellKey));
		return [
			...live.map((pos) => ({ ...pos, exiting: false })),
			...context.stateGame.fireFramesLeaving
				.filter((pos) => !liveKeys.has(cellKey(pos)))
				.map((pos) => ({ ...pos, exiting: true })),
		];
	});

	const isHighlighted = (reel: number, row: number) =>
		context.stateGame.fireFramesNew.some((pos) => pos.reel === reel && pos.row === row) ||
		context.stateGame.board[reel]?.reelState.symbols[row]?.symbolState === 'win';

	const rimPos = (reel: number, row: number) => getCellWindowRect(reel, row - 1);
</script>

<BoardContainer>
	{#if textures.length}
		{#each rims as rim (`fire-rim-${rim.reel}-${rim.row}`)}
			{@const pos = rimPos(rim.reel, rim.row)}
			<FireRimCell
				textures={textures}
				x={pos.cx}
				y={pos.cy}
				exiting={rim.exiting}
				highlight={isHighlighted(rim.reel, rim.row)}
			/>
		{/each}
	{/if}
</BoardContainer>
