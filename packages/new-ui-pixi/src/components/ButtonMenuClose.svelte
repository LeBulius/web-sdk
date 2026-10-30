<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateUi } from 'state-shared';

	import { getContext } from '../context';
	import { UI_BASE_SIZE } from '../constants';
	import { createHoverSpritesDerived } from '../hoverSprites';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const context = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const hoverSpritesEnabled = createHoverSpritesDerived();
	const hoverSprites = $derived(hoverSpritesEnabled());

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateUi.menuOpen = false;
		stateUi.betMenuOpen = false;
		stateUi.autoplayMenuOpen = false;
	};
</script>

<Button {...props} {sizes} {onpress}>
	{#snippet children({ center, hovered, pressed })}
		<Container {...center}>
			<Sprite
				key={(hoverSprites && hovered) || pressed ? 'menuCloseHover' : 'menuClose'}
				width={sizes.width}
				height={sizes.height}
				anchor={0.5}
			/>
		</Container>
	{/snippet}
</Button>
