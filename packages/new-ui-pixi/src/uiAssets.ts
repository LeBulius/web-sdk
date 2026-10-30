/**
 * Shared Pixi UI control sprites for new-ui-pixi.
 *
 * Games should merge these into their asset map:
 *   import { uiAssets } from 'new-ui-pixi';
 *   export default { ...gameAssets, ...uiAssets };
 *
 * Files live in packages/new-ui-pixi/assets/sprites/ui/
 */
const ui = (file: string) =>
	new URL(`../assets/sprites/ui/${file}`, import.meta.url).href;

const sprite = (file: string) =>
	({ type: 'sprite' as const, src: ui(file), preload: true });

export const uiAssets = {
	spinButton: sprite('spin.webp'),
	spinButtonHover: sprite('spin_hover.webp'),
	// In-progress spin art — button is not clickable in this state
	spinButtonActive: sprite('spin_active.webp'),
	spinButtonActiveHover: sprite('spin_active.webp'),
	// Main spin while autoplay menu is open — starts selected rounds
	spinButtonAutoStart: sprite('start_autospin.webp'),
	spinButtonAutoStartHover: sprite('start_autospin_hover.webp'),
	// Main spin while autoplay is running (stop)
	spinButtonStop: sprite('autospin_active.webp'),
	spinButtonStopHover: sprite('autospin_active_hover.webp'),
	autoPlayButton: sprite('auto_button.webp'),
	autoPlayHover: sprite('auto_button_hover.webp'),
	autoPlayActive: sprite('auto_button_hover.webp'),
	turboButton: sprite('turbo_button.webp'),
	turboHover: sprite('turbo_button_hover.webp'),
	turboActive: sprite('turbo_button_active.webp'),
	bonusButton: sprite('bonus_button.webp'),
	bonusHover: sprite('bonus_button_hover.webp'),
	disableButton: sprite('bonus_disable.webp'),
	disableHover: sprite('bonus_disable_hover.webp'),
	menuButton: sprite('menu_white.webp'),
	menuButtonHover: sprite('menu_hover.webp'),
	menuClose: sprite('close.webp'),
	menuCloseHover: sprite('close_hover.webp'),
	increaseButton: sprite('inc_white.webp'),
	increaseHover: sprite('inc_hover.webp'),
	decreaseButton: sprite('dec_white.webp'),
	decreaseHover: sprite('dec_hover.webp'),
	volume: sprite('volume.webp'),
	music: sprite('music.webp'),
	info: sprite('info.webp'),
} as const;

export type UiAssetKey = keyof typeof uiAssets;
