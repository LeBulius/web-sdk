<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	import { Sprite } from 'pixi-svelte';
	import { useLayout } from 'layout-editor';

	import { BOARD_FRAME_LAYOUT } from '../game/constants';

	// layout-editor: the frame art can be moved / scaled / resized on its own (board-local px).
	// Defaults are the fixed BOARD_FRAME_LAYOUT placement, so nothing moves until a value is saved.
	const frame = useLayout(
		'boardFrame',
		() => ({
			x: BOARD_FRAME_LAYOUT.x,
			y: BOARD_FRAME_LAYOUT.y,
			width: BOARD_FRAME_LAYOUT.width,
			height: BOARD_FRAME_LAYOUT.height,
		}),
		{
			frame: 'main',
			editable: ['x', 'y', 'scale', 'width', 'height', 'visible'],
			group: 'frame',
			name: 'Board frame art',
			mode: 'absolute',
			description: 'Board frame sprite (BoardFrame.svelte), board-local px; anchor 0.5',
		},
	);
	// Scale multiplies width/height (PIXI's width setter would otherwise override scale).
	const art = $derived.by(() => {
		const { scale, width, height, ...rest } = frame.props;
		const s = typeof scale === 'number' ? scale : (scale?.x ?? 1);
		return { ...rest, width: width * s, height: height * s };
	});
</script>

<Sprite key="board" anchor={0.5} eventMode="none" zIndex={-1} {...art} />
