<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { onMount, onDestroy, type Snippet } from 'svelte';
	import { devicePixelRatio } from 'svelte/reactivity/window';

	import { getContextApp } from '../context.svelte';
	import { preloadFont } from '../utils.svelte';

	type Props = { children: Snippet };

	const props: Props = $props();
	const context = getContextApp();

	let wrap: HTMLDivElement;
	let initialised = $state(false);

	const initialiseApplication = async () => {
		PIXI.Assets.reset();

		await preloadFont();
		context.stateApp.pixiApplication = new PIXI.Application<PIXI.Renderer<HTMLCanvasElement>>();
		await context.stateApp.pixiApplication.init({
			autoDensity: true,
			backgroundAlpha: 0,
			hello: true,
			multiView: false,
			antialias: true,
			clearBeforeRender: true,
			preference: 'webgpu',
			powerPreference: 'high-performance',
			resolution: devicePixelRatio.current,
			// Size to the fixed shell, not window — avoids document scrollbars in Storybook iframes
			resizeTo: wrap,
		});

		wrap.appendChild(context.stateApp.pixiApplication.canvas);

		// to prevent that you can't scroll the page with touch on the canvas. https://github.com/pixijs/pixijs/issues/4824
		context.stateApp.pixiApplication.renderer.events.autoPreventDefault = false;
		context.stateApp.pixiApplication.renderer.canvas.style.touchAction = 'none';
		context.stateApp.pixiApplication.canvas.style.display = 'block';
	};

	onMount(async () => {
		try {
			if (!initialised) await initialiseApplication();
			initialised = true;
		} catch (error) {
			console.error(error);
		}
	});

	onDestroy(() => {
		if (context.stateApp.pixiApplication) {
			context.stateApp.pixiApplication.destroy();
		}
	});
</script>

<div class="pixi-root" bind:this={wrap}>
	{#if initialised}
		{@render props.children()}
	{/if}
</div>

<style>
	/* Out of document flow so a full-size canvas cannot create body scrollbars */
	.pixi-root {
		position: fixed;
		inset: 0;
		overflow: hidden;
	}
</style>
