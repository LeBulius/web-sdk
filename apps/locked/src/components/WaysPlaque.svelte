<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		BOARD_FRAME_LAYOUT,
		SYMBOL_SIZE,
		WAYS_NUMBER_FILL,
		WAYS_PLAQUE_DISPLAY,
		WAYS_PLAQUE_WELL,
	} from '../game/constants';
	import { formatWaysCount } from '../game/formatWays';
	import BoardContainer from './BoardContainer.svelte';

	const context = getContext();
	const plaque = WAYS_PLAQUE_DISPLAY;
	const isPortrait = $derived(context.stateLayoutDerived.layoutType() === 'portrait');
	const plaqueScale = $derived(isPortrait ? 0.78 : 1);
	const plaqueW = $derived(plaque.width * plaqueScale);
	const plaqueH = $derived(plaque.height * plaqueScale);
	const frameRight = BOARD_FRAME_LAYOUT.x + BOARD_FRAME_LAYOUT.width / 2;
	const frameLeft = BOARD_FRAME_LAYOUT.x - BOARD_FRAME_LAYOUT.width / 2;
	const x = $derived.by(() => {
		const desired = SYMBOL_SIZE * 4 + plaque.insetX;
		const maxX = frameRight - plaqueW - plaque.insetX;
		const minX = frameLeft + plaque.insetX;
		return Math.min(maxX, Math.max(minX, desired));
	});
	const y = $derived(isPortrait ? plaque.insetY : 0);
	const wellX = $derived(plaqueW * (WAYS_PLAQUE_WELL.x + WAYS_PLAQUE_WELL.width / 2));
	const wellY = $derived(plaqueH * (WAYS_PLAQUE_WELL.y + WAYS_PLAQUE_WELL.height / 2));
	const waysFontSize = $derived(Math.round(plaqueH * WAYS_PLAQUE_WELL.height * 0.78));
	const waysText = $derived(formatWaysCount(context.stateGameDerived.waysCount()));
	const waysReady = $derived(Boolean(context.stateApp.loadedAssets?.ways));
</script>

{#if waysReady}
	<BoardContainer>
		<Container x={x} y={y} zIndex={50} eventMode="none">
			<Sprite key="ways" width={plaqueW} height={plaqueH} />
			<Text
				anchor={0.5}
				x={wellX}
				y={wellY}
				zIndex={51}
				text={waysText}
				style={{
					fontFamily: 'Outfit SemiBold',
					fontSize: waysFontSize,
					fontWeight: '700',
					letterSpacing: -1,
					fill: WAYS_NUMBER_FILL,
					stroke: { color: 0x0a1200, width: 4 },
					align: 'center',
				}}
			/>
		</Container>
	</BoardContainer>
{/if}
