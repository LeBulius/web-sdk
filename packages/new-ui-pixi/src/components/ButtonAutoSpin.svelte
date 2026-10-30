<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateBet, stateBetDerived, stateUi } from 'state-shared';

	import { getContext } from '../context';
	import { UI_BASE_SIZE } from '../constants';
	import { createHoverSpritesDerived } from '../hoverSprites';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const context = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const hoverSpritesEnabled = createHoverSpritesDerived();
	const hoverSprites = $derived(hoverSpritesEnabled());
	const active = $derived(stateBetDerived.hasAutoBetCounter() || stateUi.autoplayMenuOpen);
	const disabled = $derived.by(() => {
		if (stateBet.isSpaceHold) return true;
		if (!context.stateXstateDerived.isIdle() && !stateBetDerived.hasAutoBetCounter()) return true;
		if (!stateBetDerived.isBetCostAvailable()) return true;
		return false;
	});

	const stopAutoSpin = () => (stateBet.autoSpinsCounter = 0);
	const toggleMenu = () => {
		stateUi.menuOpen = false;
		stateUi.betMenuOpen = false;
		stateUi.autoplayMenuOpen = !stateUi.autoplayMenuOpen;
	};
	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBetDerived.hasAutoBetCounter() ? stopAutoSpin() : toggleMenu();
	};

	const getSpriteKey = (hovered: boolean, pressed: boolean) => {
		if (active || pressed) return 'autoPlayActive';
		if (hoverSprites && hovered) return 'autoPlayHover';
		return 'autoPlayButton';
	};
</script>

<Button {...props} {sizes} {onpress} {disabled}>
	{#snippet children({ center, hovered, pressed })}
		<Container {...center}>
			<Sprite
				key={getSpriteKey(hovered, pressed)}
				width={sizes.width}
				height={sizes.height}
				anchor={0.5}
				tint={disabled ? 0xaaaaaa : 0xffffff}
			/>
		</Container>
	{/snippet}
</Button>
