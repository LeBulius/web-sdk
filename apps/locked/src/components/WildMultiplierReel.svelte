<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { expoOut } from 'svelte/easing';
	import { BaseSprite, Container, Rectangle } from 'pixi-svelte';

	import { WILD_MULT_WINDOW } from '../game/constants';
	import { multiplierTexture } from '../game/overlayMiniReel';

	type Props = {
		x: number;
		y: number;
		strip: number[];
		stopIndex: number;
		duration: number;
		skip: boolean;
		onLanded: () => void;
	};

	const props: Props = $props();
	const windowSize = WILD_MULT_WINDOW.size;
	const stripY = new Tween(0);
	let landed = false;

	const targetY = $derived(props.stopIndex * windowSize);

	const finish = () => {
		if (landed) return;
		landed = true;
		props.onLanded();
	};

	const land = async (ms: number) => {
		const y = Number.isFinite(targetY) ? targetY : 0;
		const duration = Number.isFinite(ms) && ms > 0 ? ms : 0;
		if (duration <= 0) {
			await stripY.set(y, { duration: 0 });
			finish();
			return;
		}
		await stripY.set(y, { duration, easing: expoOut });
		finish();
	};

	onMount(() => {
		void land(props.skip ? 0 : props.duration);
	});

	$effect(() => {
		if (props.skip) void land(0);
	});
</script>

<Container x={props.x} y={props.y}>
	<Container>
		<Rectangle
			isMask
			anchor={0.5}
			x={0}
			y={0}
			width={windowSize}
			height={windowSize}
		/>
		<Container y={stripY.current}>
			{#each props.strip as value, index (`${value}-${index}`)}
				<BaseSprite
					texture={multiplierTexture(value)}
					anchor={0.5}
					y={-index * windowSize}
					width={windowSize}
					height={windowSize}
				/>
			{/each}
		</Container>
	</Container>
</Container>
