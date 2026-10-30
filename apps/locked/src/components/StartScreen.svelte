<script lang="ts">
	import { FadeContainer, LoadingProgress } from 'components-pixi';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { stateUi, stateUrlDerived } from 'state-shared';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	import { getContext } from '../game/context';
	import { BACKGROUND_RATIO, PORTRAIT_BACKGROUND_RATIO } from '../game/constants';
	import PressToContinue from './PressToContinue.svelte';

	/** Push-in stops at the gate. Same cap on phone so the zoom cannot run past it. */
	const START_BG_ZOOM = 1.12;
	const START_BG_MS = 800;
	const START_BG_ALPHA = 0.88;

	type Props = {
		onloaded: () => void;
	};

	const BAR_HEIGHT = 14;

	const props: Props = $props();
	const context = getContext();
	const loaderUrl = new URL('../../loader.gif', import.meta.url).href;

	const ready = $derived(context.stateApp.loaded);
	const isReplay = $derived(stateUi.config.mode === 'replay' || stateUrlDerived.replay());
	const isPortrait = $derived(context.stateLayoutDerived.layoutType() === 'portrait');
	const layout = $derived(context.stateLayoutDerived.mainLayout());
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const bgScale = new Tween(1);
	const bgAlpha = new Tween(1);
	const bgKey = $derived(isPortrait ? 'backgroundStartPortrait' : 'backgroundStart');
	const showStart = $derived(ready && !isReplay);
	const bgProps = $derived.by(() => {
		const frame = isPortrait
			? context.stateLayoutDerived.portraitBackgroundLayout({ scale: bgScale.current })
			: context.stateLayoutDerived.normalBackgroundLayout({ scale: bgScale.current });
		const ratio = isPortrait ? PORTRAIT_BACKGROUND_RATIO : BACKGROUND_RATIO;
		// Layout sets one axis. Fill the other from the image ratio so the push-in stays uniform.
		if ('height' in frame) return { ...frame, width: frame.height * ratio };
		return { ...frame, height: frame.width / ratio };
	});
	const barWidth = $derived(layout.width * 0.62);
	const barY = $derived.by(() => {
		const scale = layout.scale || 1;
		const insetPx = Math.max(64, canvas.height * 0.07);
		const layoutTop = layout.y - (layout.height * scale) / 2;
		const yPx = canvas.height - insetPx - BAR_HEIGHT * scale;
		const y = (yPx - layoutTop) / scale;
		return Math.max(0, Math.min(layout.height - BAR_HEIGHT, y));
	});

	let showPress = $state(true);
	let entering = false;

	const continueToGame = async () => {
		if (!ready || entering) return;
		entering = true;
		showPress = false;
		await Promise.all([
			bgScale.set(START_BG_ZOOM, { duration: START_BG_MS, easing: cubicOut }),
			bgAlpha.set(START_BG_ALPHA, { duration: START_BG_MS, easing: cubicOut }),
		]);
		props.onloaded();
	};

	$effect(() => {
		if (isReplay && ready) props.onloaded();
	});
</script>

<div class="loader" class:dismissed={ready}>
	<img src={loaderUrl} alt="" />
</div>

<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={1} />

{#if !ready}
	<MainContainer>
		<LoadingProgress x={layout.width * 0.5} y={barY} width={barWidth} height={BAR_HEIGHT}>
			{#snippet background(sizes)}
				<Rectangle {...sizes} backgroundColor={0x1a1a1a} />
			{/snippet}
			{#snippet progress(sizes)}
				<Rectangle {...sizes} backgroundColor={0xffffff} />
			{/snippet}
			{#snippet frame(sizes)}
				<Rectangle {...sizes} backgroundAlpha={0} borderColor={0xffffff} borderWidth={1} />
			{/snippet}
		</LoadingProgress>
	</MainContainer>
{/if}

<FadeContainer show={showStart} duration={400}>
	<Sprite key={bgKey} anchor={0.5} alpha={bgAlpha.current} eventMode="none" {...bgProps} />
	<FadeContainer show={showPress} duration={300}>
		<PressToContinue onpress={continueToGame} />
	</FadeContainer>
</FadeContainer>

<style>
	.loader {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		opacity: 1;
		transition: opacity 400ms linear;
	}

	.loader.dismissed {
		opacity: 0;
	}

	img {
		width: 75%;
		max-width: min(75vw, 1440px);
		max-height: 68%;
		height: auto;
		object-fit: contain;
	}
</style>
