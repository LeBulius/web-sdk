<script lang="ts">
	import { Sprite, Text } from 'pixi-svelte';

	import SymbolSprite from './SymbolSprite.svelte';
	import { getSymbolInfo } from '../game/utils';
	import type { SymbolState, RawSymbol } from '../game/types';
	import { SYMBOL_SIZE } from '../game/constants';

	type Props = {
		x?: number;
		y?: number;
		state: SymbolState;
		rawSymbol: RawSymbol;
		oncomplete?: () => void;
		loop?: boolean;
	};

	const props: Props = $props();
	const symbolInfo = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));
	const showMultiplier = $derived(Boolean(props.rawSymbol.multiplier));
</script>

<SymbolSprite {symbolInfo} x={props.x} y={props.y} oncomplete={props.oncomplete} />

{#if showMultiplier}
	<Text
		anchor={0.5}
		x={props.x}
		y={(props.y ?? 0) + SYMBOL_SIZE * 0.28}
		text={`x${props.rawSymbol.multiplier}`}
		style={{
			fontFamily: 'Outfit SemiBold',
			fontSize: 22,
			fontWeight: '700',
			fill: 0xffe08a,
			stroke: { color: 0x1a1208, width: 3 },
		}}
	/>
{/if}
