<script lang="ts">
	import { Container, Text } from 'pixi-svelte';

	type Props = {
		text: string;
		maxWidth: number;
		anchor?: number | { x: number; y: number };
		x?: number;
		y?: number;
		style: {
			align?: string;
			fontFamily?: string;
			fontWeight?: string;
			fontSize?: number;
			fill?: number | string;
		};
	};

	const props: Props = $props();
	let baseWidth = $state(0);
	const scale = $derived(Math.min(1, props.maxWidth / (baseWidth || 1)));
</script>

<!-- Measure unscaled width, then shrink uniformly so long amounts stay in slot -->
<Container visible={false}>
	<Text
		text={props.text}
		style={props.style}
		onresize={(sizes) => (baseWidth = sizes.width)}
	/>
</Container>

<Container x={props.x ?? 0} y={props.y ?? 0} {scale}>
	<Text text={props.text} anchor={props.anchor} style={props.style} />
</Container>
