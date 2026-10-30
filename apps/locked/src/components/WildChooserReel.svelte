<script lang="ts">
	import { Container, Rectangle, BaseSprite, getContextApp, type LoadedSprite } from 'pixi-svelte';

	import { CELL_WINDOW_SIZE, WILD_CHOOSER_WINDOW } from '../game/constants';
	import { chooserAssetKey, type WildChooserResult } from '../game/overlayMiniReel';
	import { containFitSize, symbolDrawMax, trimmedSymbolTexture } from '../game/utils';

	type Props = {
		x: number;
		y: number;
		strip: WildChooserResult[];
		stripY: number;
	};

	const props: Props = $props();
	const app = getContextApp();
	const windowSize = WILD_CHOOSER_WINDOW.size;
	const max = symbolDrawMax({ width: 1, height: 1 });

	const faceSize = (key: string) => {
		const loaded = app.stateApp.loadedAssets?.[key] as LoadedSprite | undefined;
		if (!loaded) return { width: max.width, height: max.height };
		const texture = trimmedSymbolTexture(key, loaded);
		const texW = texture.orig?.width || texture.width || 0;
		const texH = texture.orig?.height || texture.height || 0;
		return containFitSize(texW, texH, max.width, max.height);
	};
</script>

<Container x={props.x} y={props.y}>
	<Rectangle
		isMask
		anchor={0.5}
		x={0}
		y={0}
		width={CELL_WINDOW_SIZE}
		height={CELL_WINDOW_SIZE}
	/>
	<Container y={props.stripY}>
		{#each props.strip as face, index (`${face}-${index}`)}
			{@const key = chooserAssetKey(face)}
			{@const loaded = app.stateApp.loadedAssets?.[key] as LoadedSprite | undefined}
			{@const size = faceSize(key)}
			{#if loaded}
				<BaseSprite
					texture={trimmedSymbolTexture(key, loaded)}
					anchor={0.5}
					y={-index * windowSize}
					width={size.width}
					height={size.height}
				/>
			{/if}
		{/each}
	</Container>
</Container>
