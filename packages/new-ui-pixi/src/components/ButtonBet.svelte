<script lang="ts">
	import { Container, Text, Sprite } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { stateBet } from 'state-shared';
	import ButtonBetProvider from './ButtonBetProvider.svelte';
	import { UI_BASE_SIZE } from '../constants';
	import { createHoverSpritesDerived } from '../hoverSprites';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const hoverSpritesEnabled = createHoverSpritesDerived();
	const hoverSprites = $derived(hoverSpritesEnabled());

	const getSpriteKey = (key: string, hovered: boolean) => {
		const h = hoverSprites && hovered;
		if (key === 'auto_start') return h ? 'spinButtonAutoStartHover' : 'spinButtonAutoStart';
		if (key === 'stop_auto') return h ? 'spinButtonStopHover' : 'spinButtonStop';
		if (key === 'spin_active') return 'spinButtonActive';
		if (key === 'spin_disabled') return 'spinButton';
		if (key === 'spin_default') return h ? 'spinButtonHover' : 'spinButton';
		return 'spinButton';
	};
</script>

<ButtonBetProvider>
	{#snippet children({ key, onpress, disabled })}
		<OnHotkey hotkey="Space" {disabled} {onpress} />
		<Button {...props} {sizes} {onpress} {disabled}>
			{#snippet children({ center, hovered })}
				<Container {...center}>
					<Sprite
						key={getSpriteKey(key, hovered)}
						width={sizes.width}
						height={sizes.height}
						anchor={0.5}
						tint={key === 'spin_disabled' ? 0xaaaaaa : 0xffffff}
					/>
					{#if key === 'stop_auto'}
						<Text
							anchor={0.5}
							text={stateBet.autoSpinsCounter === Infinity
								? '∞'
								: stateBet.autoSpinsCounter.toString()}
							style={{
								align: 'center',
								fontFamily: 'Kontora Black',
								fontWeight: '600',
								fontSize: Math.max(16, sizes.width * 0.3),
								fill: 0xffffff,
							}}
						/>
					{/if}
				</Container>
			{/snippet}
		</Button>
	{/snippet}
</ButtonBetProvider>
