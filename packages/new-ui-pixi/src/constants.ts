import { WHITE } from 'constants-shared/colors';

// Matches exported UI webp art (100x100). Spin is scaled up in layout; menu/auto/turbo scaled down.
export const UI_BASE_SIZE = 100;

export const UI_BASE_FONT_SIZE = 36;

export const UI_TEXT_STYLES = {
	labelStyle: {
		fontSize: UI_BASE_FONT_SIZE,
		fill: WHITE,
	},
	amountStyle: {
		fontSize: UI_BASE_FONT_SIZE,
		fill: WHITE,
	},
};

// Shared chrome for control bar + settings / bet / autoplay popups
export const UI_CHROME_BG = 0x0a0a0a;
/** Panel + bar opacity — lower = more see-through (e.g. 0.7). */
export const UI_CHROME_ALPHA = 0.9;
export const UI_CHROME_RADIUS = 10;
export const UI_CHROME_INSET_BG = 0x141414; // bet box / row hover
/** Same border on bar + menus */
export const UI_CHROME_BORDER_COLOR = 0x22d3ee;
export const UI_CHROME_BORDER_WIDTH = 2;
export const UI_CHROME_BORDER_ALPHA = 0;

// desktop — bar height for stake iframe (1200x675)
export const DESKTOP_BASE_SIZE = 100;

export const DESKTOP_BACKGROUND_WIDTH_LIST = [
	DESKTOP_BASE_SIZE * (188 / 116),
	800,
	350,
	DESKTOP_BASE_SIZE * (340 / 116),
];

// portrait
export const PORTRAIT_BASE_SIZE = UI_BASE_SIZE * 1.32;

// landscape
export const LANDSCAPE_BASE_SIZE = UI_BASE_SIZE * 1.1;

export const LANDSCAPE_BACKGROUND_WIDTH_LIST = [
	LANDSCAPE_BASE_SIZE * (188 / 116),
	1000,
	LANDSCAPE_BASE_SIZE * (373 / 116),
];

// tablet
export const TABLET_BASE_SIZE = UI_BASE_SIZE * 1.2;

export const TABLET_BACKGROUND_WIDTH_LIST = [
	TABLET_BASE_SIZE * (188 / 116),
	650,
	350,
	TABLET_BASE_SIZE * (340 / 116),
];
