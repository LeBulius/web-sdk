<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { CELL_WINDOW_SIZE } from '../game/constants';
	import { gridCellCenter } from '../game/grid';
	import { cellFromIndex } from '../game/scatterAnticipation';

	const context = getContext();
	const pulse = new Tween(0.35);
	let looping = false;
	let live = false;

	const cell = $derived.by(() => {
		const index = context.stateGame.anticipationIndex;
		if (index === null) return null;
		return cellFromIndex(index);
	});

	const center = $derived(cell ? gridCellCenter(cell.reelIndex, cell.row) : null);
	const x = $derived(center?.x ?? 0);
	const y = $derived(center?.y ?? 0);

	const runPulse = async () => {
		if (looping) return;
		looping = true;
		while (live) {
			await pulse.set(1, { duration: 220 });
			if (!live) break;
			await pulse.set(0.28, { duration: 220 });
		}
		await pulse.set(0, { duration: 120 });
		looping = false;
	};

	$effect(() => {
		live = context.stateGame.anticipationIndex !== null;
		if (live) void runPulse();
	});

	$effect(() => {
		const burning = context.stateGame.anticipationIndex !== null;
		if (!burning) return;
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_anticipation_start' });
		context.eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_anticipation' });
		return () => {
			context.eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_anticipation' });
		};
	});
</script>

{#if cell && pulse.current > 0.02}
	<Rectangle
		anchor={0.5}
		{x}
		{y}
		width={CELL_WINDOW_SIZE}
		height={CELL_WINDOW_SIZE}
		borderRadius={10}
		backgroundAlpha={0}
		borderColor={0xffcc66}
		borderWidth={5}
		borderAlpha={pulse.current}
		eventMode="none"
		zIndex={40}
	/>
{/if}
