<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateBet, stateBetDerived, stateConfig } from 'state-shared';

	import { getContext } from '../context';
	import { UI_BASE_SIZE } from '../constants';
	import { createHoverSpritesDerived } from '../hoverSprites';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const context = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const hoverSpritesEnabled = createHoverSpritesDerived();
	const hoverSprites = $derived(hoverSpritesEnabled());
	const biggest = $derived(stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1]);
	const disabled = $derived(!context.stateXstateDerived.isIdle() || stateBet.betAmount === biggest);

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });

		const nextBigger = [...stateConfig.betAmountOptions]
			.sort((a, b) => a - b)
			.find((option) => option > stateBet.betAmount);

		stateBetDerived.setBetAmount(nextBigger || biggest);
	};
</script>

<Button {...props} {sizes} {onpress} {disabled}>
	{#snippet children({ center, hovered, pressed })}
		<Container {...center}>
			<Sprite
				key={pressed || (hoverSprites && hovered) ? 'increaseHover' : 'increaseButton'}
				width={sizes.width}
				height={sizes.height}
				anchor={0.5}
				tint={disabled ? 0xaaaaaa : 0xffffff}
			/>
		</Container>
	{/snippet}
</Button>
