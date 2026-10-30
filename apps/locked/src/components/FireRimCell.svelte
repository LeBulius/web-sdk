<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { AnimatedSprite, Container } from 'pixi-svelte';
	import type { Texture } from 'pixi.js';
	import { stateBet } from 'state-shared';

	import {
		FIRE_RIM_ANIM_SPEED,
		FIRE_RIM_FADE_MS,
		FIRE_RIM_PULSE_MS,
		FIRE_RIM_SIZE,
	} from '../game/constants';

	type Props = {
		x: number;
		y: number;
		textures: Texture[];
		exiting?: boolean;
		highlight?: boolean;
	};

	const props: Props = $props();
	const fade = new Tween(0, { duration: FIRE_RIM_FADE_MS });
	const pulse = new Tween(0, { duration: Math.round(FIRE_RIM_PULSE_MS / 2) });
	let pulsedForHighlight = false;

	const fadeMs = () => (stateBet.isTurbo ? 60 : FIRE_RIM_FADE_MS);

	$effect(() => {
		fade.set(props.exiting ? 0 : 1, { duration: fadeMs() });
	});

	$effect(() => {
		if (!props.highlight) {
			pulsedForHighlight = false;
			return;
		}
		if (pulsedForHighlight) return;
		pulsedForHighlight = true;
		void (async () => {
			await pulse.set(1);
			await pulse.set(0);
		})();
	});

	const alpha = $derived(fade.current * (0.86 + 0.14 * pulse.current));
	const pulseScale = $derived(1 + 0.05 * pulse.current);
	const show = $derived(props.textures.length > 0 && (!props.exiting || fade.current > 0.01));
</script>

{#if show}
	<Container
		x={props.x}
		y={props.y}
		scale={pulseScale}
		alpha={alpha}
		eventMode="none"
		zIndex={24}
	>
		<AnimatedSprite
			textures={props.textures}
			play
			loop
			animationSpeed={FIRE_RIM_ANIM_SPEED}
			anchor={0.5}
			x={0}
			y={0}
			width={FIRE_RIM_SIZE}
			height={FIRE_RIM_SIZE}
			eventMode="none"
		/>
	</Container>
{/if}
