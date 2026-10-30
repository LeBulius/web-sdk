<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { getContextLayout } from 'utils-layout';

	import {
		UI_CHROME_BORDER_ALPHA,
		UI_CHROME_BORDER_COLOR,
		UI_CHROME_BORDER_WIDTH,
		UI_CHROME_INSET_BG,
		UI_CHROME_RADIUS,
	} from '../constants';
	import FitText from './FitText.svelte';

	type Props = {
		width: number;
		height: number;
		selected: boolean;
		label: string;
		fontSize?: number;
		labelYOffset?: number;
		/** Shrink long currency strings to fit the cell */
		fitLabel?: boolean;
		onpress: () => void;
	};

	const props: Props = $props();
	const { stateLayoutDerived } = getContextLayout();

	/** Pointer hover on desktop / laptop / popouts — skip portrait (sticky tap hover). */
	const hoverFx = $derived(stateLayoutDerived.layoutType() !== 'portrait');

	const SELECTED = 0x22d3ee;
	const SELECTED_HOT = 0x67e8f9;
	const IDLE_HOT = 0x2d3748;
</script>

<Button sizes={{ width: props.width, height: props.height }} onpress={props.onpress}>
	{#snippet children({ hovered, pressed })}
		{@const hot = hoverFx && hovered}
		{@const fill = props.selected ? (hot ? SELECTED_HOT : SELECTED) : hot ? IDLE_HOT : UI_CHROME_INSET_BG}
		{@const scale = pressed ? 0.96 : hot ? 1.06 : 1}
		<Container
			x={props.width * 0.5}
			y={props.height * 0.5}
			pivot={{ x: props.width * 0.5, y: props.height * 0.5 }}
			{scale}
		>
			<Rectangle
				width={props.width}
				height={props.height}
				borderRadius={UI_CHROME_RADIUS}
				backgroundColor={fill}
				alpha={1}
				borderColor={UI_CHROME_BORDER_COLOR}
				borderWidth={props.selected ? 0 : UI_CHROME_BORDER_WIDTH}
				borderAlpha={props.selected ? 0 : hot ? 0.95 : UI_CHROME_BORDER_ALPHA * 0.6}
			/>
			{#if props.fitLabel}
				<FitText
					text={props.label}
					maxWidth={props.width - 16}
					x={props.width * 0.5}
					y={props.height * 0.5 + (props.labelYOffset ?? 0)}
					anchor={0.5}
					style={{
						fontFamily: 'Kontora Black',
						fontWeight: '700',
						fontSize: props.fontSize ?? 20,
						fill: props.selected ? 0x111827 : 0xffffff,
					}}
				/>
			{:else}
				<Text
					text={props.label}
					x={props.width * 0.5}
					y={props.height * 0.5 + (props.labelYOffset ?? 0)}
					anchor={0.5}
					style={{
						fontFamily: 'Kontora Black',
						fontWeight: '700',
						fontSize: props.fontSize ?? 20,
						fill: props.selected ? 0x111827 : 0xffffff,
					}}
				/>
			{/if}
		</Container>
	{/snippet}
</Button>
