<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateBet } from 'state-shared';

	import { UI_BASE_SIZE } from '../constants';
	import { getContext } from '../context';
	import { createHoverSpritesDerived } from '../hoverSprites';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const context = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const hoverSpritesEnabled = createHoverSpritesDerived();
	const hoverSprites = $derived(hoverSpritesEnabled());

	const active = $derived(stateBet.isTurbo);

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBet.isTurbo = !stateBet.isTurbo;
	};

	const getSpriteKey = (hovered: boolean, pressed: boolean) => {
		if (active || pressed) return 'turboActive';
		if (hoverSprites && hovered) return 'turboHover';
		return 'turboButton';
	};
</script>

<Button {...props} {sizes} {onpress}>
	{#snippet children({ center, hovered, pressed })}
		<Container {...center}>
			<Sprite
				key={getSpriteKey(hovered, pressed)}
				width={sizes.width}
				height={sizes.height}
				anchor={0.5}
			/>
		</Container>
	{/snippet}
</Button>
