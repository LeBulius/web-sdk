<script lang="ts">
	import { Container, Rectangle, Circle, Graphics, Sprite } from 'pixi-svelte';

	import { UI_CHROME_INSET_BG, UI_CHROME_RADIUS } from '../constants';

	type Props = {
		value: number;
		onchange: (value: number) => void;
		/** 'speaker' = game SFX, 'music' = music */
		icon: 'speaker' | 'music';
		/** Full clickable row width */
		rowWidth: number;
		rowHeight?: number;
	};

	type PixiPointerEvent = {
		global: { x: number; y: number };
		currentTarget: {
			toLocal: (
				point: { x: number; y: number },
				from?: unknown,
				out?: { x: number; y: number },
			) => { x: number; y: number };
		};
		stopPropagation: () => void;
	};

	const { value, onchange, icon, rowWidth, rowHeight = 44 }: Props = $props();

	const TRACK_H = 10;
	const THUMB_D = 20;
	// 28 layout-px reads as ~18px after MainContainer scale — too small to see.
	const ICON_SIZE = 32;
	const PAD_X = 12;
	const GAP = 10;
	const SLIDER_W = $derived(rowWidth - PAD_X * 2 - ICON_SIZE - GAP);
	const spriteKey = $derived(icon === 'speaker' ? 'volume' : 'music');

	let hovered = $state(false);
	let dragging = $state(false);
	let prevVolume = $state(value > 0 ? value : 75);

	const clamped = $derived(Math.max(0, Math.min(100, value)));
	const thumbX = $derived((clamped / 100) * SLIDER_W);

	$effect(() => {
		if (value > 0) prevVolume = value;
	});

	const toggleMute = () => {
		if (clamped > 0) {
			prevVolume = clamped;
			onchange(0);
		} else {
			onchange(prevVolume > 0 ? prevVolume : 75);
		}
	};

	const setFromEvent = (event: PixiPointerEvent) => {
		const local = event.currentTarget.toLocal(event.global);
		const next = Math.round(Math.max(0, Math.min(1, local.x / SLIDER_W)) * 100);
		onchange(next);
	};
</script>

<!-- Full row: hover darkens; click outside the slider mutes/unmutes to previous level -->
<Container
	eventMode="static"
	cursor="pointer"
	onpointerover={() => (hovered = true)}
	onpointerout={() => {
		if (!dragging) hovered = false;
	}}
	onpointerup={() => {
		if (dragging) return;
		toggleMute();
	}}
>
	<Rectangle
		width={rowWidth}
		height={rowHeight}
		borderRadius={UI_CHROME_RADIUS}
		backgroundColor={UI_CHROME_INSET_BG}
		alpha={hovered || dragging ? 1 : 0}
	/>

	<!-- Icon -->
	<Container x={PAD_X + ICON_SIZE * 0.5} y={rowHeight * 0.5}>
		<Sprite key={spriteKey} width={ICON_SIZE} height={ICON_SIZE} anchor={0.5} />
		{#if clamped === 0}
			<Graphics
				draw={(g) => {
					g.clear();
					g.moveTo(-18, -16);
					g.lineTo(18, 18);
					g.stroke({ color: 0xffffff, width: 3 });
				}}
			/>
		{/if}
	</Container>

	<!-- Slider — drag/click adjusts level only; does not mute -->
	<Container x={PAD_X + ICON_SIZE + GAP} y={rowHeight * 0.5}>
		<Container
			eventMode="static"
			cursor="pointer"
			onpointerdown={(e) => {
				e.stopPropagation();
				dragging = true;
				setFromEvent(e);
			}}
			onpointermove={(e) => {
				if (!dragging) return;
				e.stopPropagation();
				setFromEvent(e);
			}}
			onpointerup={(e) => {
				e.stopPropagation();
				dragging = false;
			}}
			onpointerupoutside={() => {
				dragging = false;
			}}
		>
			<Rectangle
				width={SLIDER_W}
				height={rowHeight}
				y={-rowHeight * 0.5}
				backgroundColor={0x000000}
				backgroundAlpha={0.001}
			/>
			<Rectangle
				width={SLIDER_W}
				height={TRACK_H}
				y={-TRACK_H * 0.5}
				borderRadius={TRACK_H}
				backgroundColor={0xffffff}
				backgroundAlpha={0.35}
			/>
			<Rectangle
				width={Math.max(TRACK_H, thumbX)}
				height={TRACK_H}
				y={-TRACK_H * 0.5}
				borderRadius={TRACK_H}
				backgroundColor={0xffffff}
			/>
			<Circle
				x={thumbX - THUMB_D * 0.5}
				y={-THUMB_D * 0.5}
				diameter={THUMB_D}
				backgroundColor={0xffffff}
			/>
		</Container>
	</Container>
</Container>
