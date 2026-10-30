<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';

	import { getContext } from '../game/context';

	type Props = {
		/** layout-editor: 'board' makes this container the reel grid's on-canvas target. */
		label?: string;
		zIndex?: number;
		children: Snippet;
	};

	const props: Props = $props();

	const context = getContext();
</script>

<Container
	label={props.label}
	zIndex={props.zIndex}
	x={context.stateGameDerived.boardLayout().x}
	y={context.stateGameDerived.boardLayout().y}
	pivot={context.stateGameDerived.boardLayout().pivot}
	scale={context.stateGameDerived.boardLayout().scale}
>
	{@render props.children()}
</Container>
