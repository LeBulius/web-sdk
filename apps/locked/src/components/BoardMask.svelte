<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { Graphics, Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { REEL_ROWS } from '../game/constants';
	import { gridCellRect } from '../game/grid';

	type Props = { debug?: boolean };

	const props: Props = $props();
	const context = getContext();

	// layout-editor grid: one rect per cell, so spacing / reel offsets / cell nudges stay unmasked.
	// Default grid = the old per-reel column silhouette (adjacent cells merge into one column).
	const drawSilhouette = (graphics: PIXI.Graphics) => {
		for (let reel = 0; reel < REEL_ROWS.length; reel += 1) {
			for (let row = 0; row < REEL_ROWS[reel]; row += 1) {
				const rect = gridCellRect(reel, row);
				graphics.rect(rect.x, rect.y, rect.width, rect.height);
			}
		}
		graphics.fill({ color: 0xffffff });
	};
</script>

{#if props.debug}
	<Rectangle
		alpha={0.35}
		backgroundColor={0xffffff}
		width={context.stateGameDerived.boardLayout().width}
		height={context.stateGameDerived.boardLayout().height}
	/>
{/if}

<Graphics isMask draw={drawSilhouette} />
