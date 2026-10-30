<script lang="ts">
	import { Sprite, type LoadedSprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { containFitSize } from '../game/utils';

	const context = getContext();
	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const show = $derived(layoutType === 'desktop' || layoutType === 'tablet');
	const main = $derived(context.stateLayoutDerived.mainLayout());
	const board = $derived(context.stateGameDerived.boardLayout());
	const texture = $derived(context.stateApp.loadedAssets?.logo as LoadedSprite | undefined);
	const layout = $derived.by(() => {
		const boardLeft = board.x - (board.width * board.scale) / 2;
		const maxW = Math.min(Math.max(0, boardLeft - 24), main.width * 0.28);
		const maxH = main.height * 0.34;
		if (maxW < 80 || !texture?.width || !texture.height) return null;
		const size = containFitSize(texture.width, texture.height, maxW, maxH);
		return {
			x: boardLeft * 0.5,
			y: main.height * 0.45,
			width: size.width,
			height: size.height,
		};
	});
</script>

{#if show && layout}
	<Sprite
		key="logo"
		anchor={0.5}
		eventMode="none"
		x={layout.x}
		y={layout.y}
		width={layout.width}
		height={layout.height}
	/>
{/if}
