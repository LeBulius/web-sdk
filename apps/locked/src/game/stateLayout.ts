import { innerHeight, innerWidth } from 'svelte/reactivity/window';
import { createLayout } from 'utils-layout';
import { bindViewport } from 'layout-editor';

import { BACKGROUND_RATIO, PORTRAIT_BACKGROUND_RATIO } from './constants';

export const { stateLayout, stateLayoutDerived } = createLayout({
	backgroundRatio: {
		normal: BACKGROUND_RATIO,
		portrait: PORTRAIT_BACKGROUND_RATIO,
	},
	mainSizesMap: {
		desktop: { width: 1422, height: 800 },
		tablet: { width: 1000, height: 1000 },
		landscape: { width: 1600, height: 900 },
		portrait: { width: 800, height: 1422 },
	},
});

// layout-editor: active Stake viewport key follows the window (the builder's size picker overrides it).
// Note: Julius's utils-layout has no getDesignSize option, so the design frame stays mainSizesMap.
bindViewport(() => ({
	width: innerWidth.current ?? 1200,
	height: innerHeight.current ?? 675,
}));
