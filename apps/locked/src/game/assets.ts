import { uiAssets } from 'new-ui-pixi';

// layout-editor (visual builder): generated table of builder outputs (src/assets/builder).
export { builderAssets } from '../assets/builder/manifest';

const deferredUiAssets = Object.fromEntries(
	Object.entries(uiAssets).map(([key, asset]) => [key, { ...asset, preload: false }]),
);

export default {
	pressToContinueText: {
		type: 'sprites',
		src: new URL('../assets/sprites/pressToContinueText/spritesheet.json', import.meta.url).href,
		preload: false,
	},
	background: {
		type: 'sprite',
		src: new URL('../assets/sprites/background/bg.png', import.meta.url).href,
		preload: false,
	},
	backgroundPortrait: {
		type: 'sprite',
		src: new URL('../assets/sprites/background/mobile_bg.png', import.meta.url).href,
		preload: false,
	},
	backgroundStart: {
		type: 'sprite',
		src: new URL('../assets/sprites/background/start.png', import.meta.url).href,
		preload: true,
	},
	backgroundStartPortrait: {
		type: 'sprite',
		src: new URL('../assets/sprites/background/mobile_start.png', import.meta.url).href,
		preload: true,
	},
	backgroundDegen: {
		type: 'sprite',
		src: new URL('../assets/sprites/background/degen.png', import.meta.url).href,
		preload: false,
	},
	backgroundDegenPortrait: {
		type: 'sprite',
		src: new URL('../assets/sprites/background/mobile_degen.png', import.meta.url).href,
		preload: false,
	},
	bgFreegame3: {
		type: 'sprite',
		src: new URL('../assets/sprites/background/bg_3s.png', import.meta.url).href,
		preload: false,
	},
	bgFreegame4: {
		type: 'sprite',
		src: new URL('../assets/sprites/background/bg_4s.png', import.meta.url).href,
		preload: false,
	},
	bgFreegame5: {
		type: 'sprite',
		src: new URL('../assets/sprites/background/bg_5s.png', import.meta.url).href,
		preload: false,
	},
	bgFreegame3Portrait: {
		type: 'sprite',
		src: new URL('../assets/sprites/background/mobile_bg_3s.png', import.meta.url).href,
		preload: false,
	},
	bgFreegame4Portrait: {
		type: 'sprite',
		src: new URL('../assets/sprites/background/mobile_bg_4s.png', import.meta.url).href,
		preload: false,
	},
	bgFreegame5Portrait: {
		type: 'sprite',
		src: new URL('../assets/sprites/background/mobile_bg_5s.png', import.meta.url).href,
		preload: false,
	},
	board: {
		type: 'sprite',
		src: new URL('../assets/sprites/board/board.png', import.meta.url).href,
		preload: false,
	},
	logo: {
		type: 'sprite',
		src: new URL('../assets/sprites/logo/logo.png', import.meta.url).href,
		preload: false,
	},
	ways: {
		type: 'sprite',
		src: new URL('../assets/sprites/board/ways.webp', import.meta.url).href,
		preload: false,
	},
	h1: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/h1.webp', import.meta.url).href,
		preload: false,
	},
	h2: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/h2.webp', import.meta.url).href,
		preload: false,
	},
	h3: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/h3.webp', import.meta.url).href,
		preload: false,
	},
	h4: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/h4.webp', import.meta.url).href,
		preload: false,
	},
	l1: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/l1.webp', import.meta.url).href,
		preload: false,
	},
	l2: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/l2.webp', import.meta.url).href,
		preload: false,
	},
	l3: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/l3.webp', import.meta.url).href,
		preload: false,
	},
	l4: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/l4.webp', import.meta.url).href,
		preload: false,
	},
	l5: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/l5.webp', import.meta.url).href,
		preload: false,
	},
	wEmpty: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/w.webp', import.meta.url).href,
		preload: false,
	},
	wChooser: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/w.webp', import.meta.url).href,
		preload: false,
	},
	vsChooser: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/ew/ew.webp', import.meta.url).href,
		preload: false,
	},
	vsExpand3: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/ew/ew3.webp', import.meta.url).href,
		preload: false,
	},
	vsExpand5: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/ew/ew5.webp', import.meta.url).href,
		preload: false,
	},
	w: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/w.webp', import.meta.url).href,
		preload: false,
	},
	ew: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/ew/ew.webp', import.meta.url).href,
		preload: false,
	},
	c: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/c.webp', import.meta.url).href,
		preload: false,
	},
	s: {
		type: 'sprite',
		src: new URL('../assets/sprites/symbols/s.webp', import.meta.url).href,
		preload: false,
	},
	fireRimSheet: {
		type: 'sprite',
		src: new URL('../assets/sprites/fireframes/fire_sprite_sheet.webp', import.meta.url).href,
		preload: false,
	},
	sound: {
		type: 'audio',
		src: new URL('../assets/audio/sounds.json', import.meta.url).href,
		preload: false,
	},
	// Shared UI controls from new-ui-pixi (spin, turbo, menu, bet +/- …)
	...deferredUiAssets,
} as const;
