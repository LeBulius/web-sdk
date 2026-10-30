<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Container, Sprite, Rectangle } from 'pixi-svelte';

	import { SYMBOL_SIZE } from '../game/constants';

	type Props = {
		x: number;
		y: number;
		rows: number;
		maskY: number;
		maskHeight: number;
		maskActive: boolean;
		children?: Snippet;
	};

	const props: Props = $props();
	const reelHeight = $derived(props.rows * SYMBOL_SIZE);
	const expandKey = $derived(props.rows <= 3 ? 'vsExpand3' : 'vsExpand5');
</script>

<Container x={props.x} y={props.y}>
	<Rectangle
		isMask={props.maskActive}
		backgroundAlpha={props.maskActive ? 1 : 0}
		x={0}
		y={props.maskY}
		width={SYMBOL_SIZE}
		height={Math.max(props.maskHeight, 1)}
	/>
	<Sprite key={expandKey} x={0} y={0} width={SYMBOL_SIZE} height={reelHeight} />
	{@render props.children?.()}
</Container>
