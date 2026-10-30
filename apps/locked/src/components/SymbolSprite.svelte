<script lang="ts">
	import { Sprite, getContextApp, type LoadedSprite } from 'pixi-svelte';
	import { onMount } from 'svelte';

	import { getSymbolInfo } from '../game/utils';
	import { CELL_WINDOW_SIZE } from '../game/constants';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		oncomplete?: () => void;
	};

	const props: Props = $props();
	const app = getContextApp();
	const texture = $derived(
		app.stateApp.loadedAssets?.[props.symbolInfo.assetKey] as LoadedSprite | undefined,
	);

	/** Keep native art shape inside the steel window instead of stretching to a square. */
	const drawSize = $derived.by(() => {
		const maxW = CELL_WINDOW_SIZE * props.symbolInfo.sizeRatios.width;
		const maxH = CELL_WINDOW_SIZE * props.symbolInfo.sizeRatios.height;
		const texW = texture?.orig?.width || texture?.width || 0;
		const texH = texture?.orig?.height || texture?.height || 0;
		if (texW <= 1 || texH <= 1) return { width: maxW, height: maxH };
		const scale = Math.min(maxW / texW, maxH / texH);
		return { width: texW * scale, height: texH * scale };
	});

	onMount(() => {
		props.oncomplete?.();
	});

	$effect(() => {
		props.symbolInfo;
		props.oncomplete?.();
	});
</script>

<Sprite
	x={props.x}
	y={props.y}
	anchor={0.5}
	key={props.symbolInfo.assetKey}
	width={drawSize.width}
	height={drawSize.height}
/>
