<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';
	import { getContextBoard } from 'components-shared';

	import { SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';

	type Props = {
		debug?: boolean;
		x: number;
		y: number;
		/** y in the old fixed-grid units for the in-frame test (layout-editor grid can move y). */
		frameY?: number;
		animating: boolean;
		alpha?: number;
		children: Snippet;
	};

	const props: Props = $props();
	const boardContext = getContextBoard();
	const show = $derived(
		(boardContext.animate && props.animating) || (!boardContext.animate && !props.animating),
	);
	const top = -SYMBOL_SIZE;
	const bottom = SYMBOL_SIZE * (BOARD_DIMENSIONS.y + 1);
	const inFrame = $derived.by(() => {
		const y = props.frameY ?? props.y;
		return y >= top && y <= bottom;
	});
</script>

{#if props.debug || (show && inFrame)}
	<Container x={props.x} y={props.y} alpha={props.alpha ?? 1}>
		{@render props.children()}
	</Container>
{/if}
