/**
 * Fallback bet ladder when RGS authenticate has not run (Storybook / local preview).
 * 48 levels matches a full production-sized menu so scroll + layout can be tested.
 */
export const DEFAULT_BET_AMOUNT_OPTIONS = [
	0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.4, 2.8, 3.2, 3.6, 4, 4.8, 5, 6, 8,
	10, 12, 16, 20, 24, 28, 32, 40, 48, 50, 60, 80, 100, 120, 160, 200, 240, 280, 320, 400, 480, 500,
	600, 700, 800, 1000,
];

export const stateConfig = $state({
	jurisdiction: {
		socialCasino: false,
		disabledFullscreen: false,
		disabledTurbo: false,
		disabledSuperTurbo: false,
		disabledAutoplay: false,
		disabledSlamstop: false,
		disabledSpacebar: false,
		disabledBuyFeature: false,
		displayNetPosition: false,
		displayRTP: false,
		displaySessionTimer: false,
		minimumRoundDuration: 0,
	},
	betAmountOptions: [...DEFAULT_BET_AMOUNT_OPTIONS],
	betMenuOptions: [...DEFAULT_BET_AMOUNT_OPTIONS],
});
