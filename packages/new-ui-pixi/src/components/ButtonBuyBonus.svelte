<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateModal, stateBet, stateBetDerived, stateUi } from 'state-shared';

	import { UI_BASE_SIZE } from '../constants';
	import { getContext } from '../context';
	import { createHoverSpritesDerived } from '../hoverSprites';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const { stateXstateDerived, eventEmitter } = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const hoverSpritesEnabled = createHoverSpritesDerived();
	const hoverSprites = $derived(hoverSpritesEnabled());
	const disabled = $derived(!stateXstateDerived.isIdle());
	const active = $derived(stateBetDerived.activeBetMode()?.type === 'activate');

	const openModal = () => {
		stateUi.menuOpen = false;
		stateUi.betMenuOpen = false;
		stateUi.autoplayMenuOpen = false;
		stateModal.modal = { name: 'buyBonus' };
	};
	const disableActiveBetMode = () => (stateBet.activeBetModeKey = 'BASE');
	const onpress = () => {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });

		if (active) disableActiveBetMode();
		else openModal();
	};

	const getSpriteKey = (hovered: boolean, pressed: boolean) => {
		const h = (hoverSprites && hovered) || pressed;
		if (active) return h ? 'disableHover' : 'disableButton';
		return h ? 'bonusHover' : 'bonusButton';
	};
</script>

<Button {...props} {sizes} {disabled} {onpress}>
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
