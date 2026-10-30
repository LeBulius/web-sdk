<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { stateBet } from 'state-shared';

	import { normalizeBonusMode } from '../game/bonusMeta';
	import { getContext } from '../game/context';
	import { BACKGROUND_RATIO, PORTRAIT_BACKGROUND_RATIO, zIndexes } from '../game/constants';

	const context = getContext();
	const isPortrait = $derived(context.stateLayoutDerived.layoutType() === 'portrait');
	const landscapeProps = $derived(
		context.stateLayoutDerived.normalBackgroundLayout({ scale: 1 }),
	);
	const portraitProps = $derived(
		context.stateLayoutDerived.portraitBackgroundLayout({ scale: 1 }),
	);
	const fsKey = $derived.by(() => {
		const bg = context.stateGame.freeSpinBackground;
		if (bg === '3s') return '3s';
		if (bg === '4s') return '4s';
		if (bg === '5s') return '5s';
		return null;
	});
	const isDegen = $derived(normalizeBonusMode(stateBet.activeBetModeKey) === 'degen_spin');
	const spriteKey = $derived.by(() => {
		if (fsKey === '3s') return isPortrait ? 'bgFreegame3Portrait' : 'bgFreegame3';
		if (fsKey === '4s') return isPortrait ? 'bgFreegame4Portrait' : 'bgFreegame4';
		if (fsKey === '5s') return isPortrait ? 'bgFreegame5Portrait' : 'bgFreegame5';
		if (isDegen) return isPortrait ? 'backgroundDegenPortrait' : 'backgroundDegen';
		return isPortrait ? 'backgroundPortrait' : 'background';
	});
	const spriteProps = $derived.by(() => {
		const layout = isPortrait ? portraitProps : landscapeProps;
		const ratio = isPortrait ? PORTRAIT_BACKGROUND_RATIO : BACKGROUND_RATIO;
		if ('height' in layout) return { ...layout, width: layout.height * ratio };
		return { ...layout, height: layout.width / ratio };
	});
</script>

<Rectangle
	{...context.stateLayoutDerived.canvasSizes()}
	backgroundColor={0x000000}
	zIndex={zIndexes.background.backdrop}
/>

<Sprite
	key={spriteKey}
	anchor={0.5}
	zIndex={zIndexes.background.normal}
	{...spriteProps}
/>
