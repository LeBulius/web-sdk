import type { RawSymbol, SymbolState } from './types';

export const SYMBOL_SIZE = 130;

export const REEL_PADDING = 0.5;

/** Visible rows per reel (3-5-5-3 diamond board). */
export const REEL_ROWS = [3, 5, 5, 3] as const;

export const MAX_ROWS = Math.max(...REEL_ROWS);

export const NUM_REELS = REEL_ROWS.length;

const pad = (name: RawSymbol['name']): RawSymbol => ({ name });

/** initial board (padded top and bottom per reel) */
export const INITIAL_BOARD: RawSymbol[][] = [
	[pad('L1'), { name: 'H1' }, { name: 'L2' }, { name: 'H3' }, pad('L3')],
	[
		pad('L2'),
		{ name: 'L1' },
		{ name: 'H2' },
		{ name: 'L3' },
		{ name: 'H4' },
		{ name: 'L4' },
		pad('L5'),
	],
	[
		pad('L3'),
		{ name: 'H3' },
		{ name: 'L5' },
		{ name: 'H1' },
		{ name: 'L2' },
		{ name: 'H2' },
		pad('L1'),
	],
	[pad('L4'), { name: 'L5' }, { name: 'H4' }, { name: 'L1' }, pad('L2')],
];

export const BOARD_DIMENSIONS = {
	x: NUM_REELS,
	y: MAX_ROWS,
};

export const BOARD_SIZES = {
	width: SYMBOL_SIZE * BOARD_DIMENSIONS.x,
	height: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
};

/** Native board plate (3-5-5-3 silhouette). */
export const BOARD_FRAME_NATIVE = { width: 960, height: 1164 } as const;

/**
 * Measured black wells in `board.png`. Pitch is the 4×5 cell step (well + bar).
 * Outer reels use global rows 1–3 (middle 3 of the 5-high reels).
 */
export const BOARD_WELL_NATIVE = {
	left: 86,
	top: 84,
	size: 190,
	pitch: 200,
} as const;

/** Uniform scale: native well pitch → one SYMBOL_SIZE cell. */
export const BOARD_NATIVE_TO_GRID = SYMBOL_SIZE / BOARD_WELL_NATIVE.pitch;

/** Black window inside each pitch cell (steel bar is the leftover inset). */
export const CELL_WINDOW_SIZE = BOARD_WELL_NATIVE.size * BOARD_NATIVE_TO_GRID;
export const CELL_WINDOW_INSET = (SYMBOL_SIZE - CELL_WINDOW_SIZE) / 2;

/** Equal padding inside the window for contain-fit symbols. */
export const CELL_SYMBOL_INSET = 6;
export const CELL_SYMBOL_SIZE = CELL_WINDOW_SIZE - CELL_SYMBOL_INSET * 2;

const BOARD_FRAME_BOARD_WIDTH = BOARD_FRAME_NATIVE.width * BOARD_NATIVE_TO_GRID;
const BOARD_FRAME_BOARD_HEIGHT = BOARD_FRAME_NATIVE.height * BOARD_NATIVE_TO_GRID;
const BOARD_FRAME_BOARD_X =
	CELL_WINDOW_INSET - BOARD_WELL_NATIVE.left * BOARD_NATIVE_TO_GRID + BOARD_FRAME_BOARD_WIDTH / 2;
const BOARD_FRAME_BOARD_Y =
	CELL_WINDOW_INSET - BOARD_WELL_NATIVE.top * BOARD_NATIVE_TO_GRID + BOARD_FRAME_BOARD_HEIGHT / 2;

/** Board-local sprite placement (anchor 0.5). Wells land on the 4×5 cell grid. */
export const BOARD_FRAME_LAYOUT = {
	x: BOARD_FRAME_BOARD_X,
	y: BOARD_FRAME_BOARD_Y,
	width: BOARD_FRAME_BOARD_WIDTH,
	height: BOARD_FRAME_BOARD_HEIGHT,
} as const;

export const BOARD_FRAME_DISPLAY = {
	width: BOARD_FRAME_LAYOUT.width,
	height: BOARD_FRAME_LAYOUT.height,
} as const;

/** Native WAYS plaque. Label is in the art; the well is empty for code. */
export const WAYS_PLAQUE_NATIVE = { width: 1280, height: 578 } as const;

export const WAYS_PLAQUE_WELL = {
	x: 0.08,
	y: 0.52,
	width: 0.84,
	height: 0.33,
} as const;

export const WAYS_PLAQUE_DISPLAY = {
	width: BOARD_SIZES.width * 0.45,
	height: (BOARD_SIZES.width * 0.45 * WAYS_PLAQUE_NATIVE.height) / WAYS_PLAQUE_NATIVE.width,
	insetX: 12,
	insetY: 6,
} as const;

export const WAYS_NUMBER_FILL = 0x8aff36;

/** Idle ways with every cell at ×1 (3 × 5 × 5 × 3). Live count is product of per-reel multiplier sums. */
export const BASE_WAYS = REEL_ROWS.reduce((product, rows) => product * rows, 1);

export const BACKGROUND_RATIO = 1672 / 941;
export const PORTRAIT_BACKGROUND_RATIO = 941 / 1672;

const PORTRAIT_RATIO = 800 / 1422;
const LANDSCAPE_RATIO = 1600 / 900;
const DESKTOP_RATIO = 1422 / 800;

const DESKTOP_HEIGHT = 800;
const LANDSCAPE_HEIGHT = 900;
const PORTRAIT_HEIGHT = 1422;
export const DESKTOP_MAIN_SIZES = { width: DESKTOP_HEIGHT * DESKTOP_RATIO, height: DESKTOP_HEIGHT };
export const LANDSCAPE_MAIN_SIZES = {
	width: LANDSCAPE_HEIGHT * LANDSCAPE_RATIO,
	height: LANDSCAPE_HEIGHT,
};
export const PORTRAIT_MAIN_SIZES = {
	width: PORTRAIT_HEIGHT * PORTRAIT_RATIO,
	height: PORTRAIT_HEIGHT,
};

export const INITIAL_SYMBOL_STATE: SymbolState = 'static';

/** Visual-only faces that scroll through each cell. Landing always comes from the book. */
export const CELL_SPIN_POOL: RawSymbol[] = [
	{ name: 'L1' },
	{ name: 'H2' },
	{ name: 'L3' },
	{ name: 'H1' },
	{ name: 'L5' },
	{ name: 'H4' },
	{ name: 'L2' },
	{ name: 'H3' },
	{ name: 'L4' },
	{ name: 'W', wild: true },
	{ name: 'EW', wild: true },
	{ name: 'C' },
	{ name: 'L1' },
	{ name: 'S', scatter: true },
];

const SPIN_OPTIONS_SHARED = {
	reelBounceBackSpeed: 0.32,
	reelPaddingMultiplierNormal: 9,
	reelPaddingMultiplierAnticipated: 16,
	reelSpinDelay: 30,
};

export const SPIN_OPTIONS_DEFAULT = {
	...SPIN_OPTIONS_SHARED,
	reelPreSpinSpeed: 4.8,
	reelSpinSpeed: 7.8,
	reelBounceBackSpeed: 0.38,
	reelBounceSizeMulti: 0.08,
	symbolLandInterval: 25,
	reelSpinDelay: 25,
};

export const SPIN_OPTIONS_FAST = {
	...SPIN_OPTIONS_SHARED,
	reelPreSpinSpeed: 4.8,
	reelSpinSpeed: 4.6,
	reelBounceBackSpeed: 0.28,
	reelBounceSizeMulti: 0.08,
	reelSpinDelay: 45,
	reelPaddingMultiplierNormal: 5,
	symbolLandInterval: 0,
};

/** Flat slowdown for remaining cells after 2 scatters have locked. Turbo/skip ignore this. */
export const ANTICIPATION_LAND = {
	reelSpinSpeed: 2.2,
	blurCount: 7,
	symbolLandInterval: 180,
} as const;

export const MOTION_BLUR_VELOCITY = 31;

/** Extra strip faces so spin reads as a blur, not a 1–2 face strobe. */
export const SPIN_BLUR_FACES = Math.max(6, Math.round(MOTION_BLUR_VELOCITY / 4));

/** Standard-space chrome reserved under the board (desktop bar / mobile info pills). */
export const CONTROL_BAND_STANDARD = {
	desktop: 136,
	tablet: 136,
	landscape: 96,
	portrait: 110,
} as const;

export const NON_WINNER_DIM_ALPHA = 0.4;

export const zIndexes = {
	background: {
		backdrop: -3,
		normal: -2,
		feature: -1,
	},
};

/** Bounding box inside the steel window. SymbolSprite contain-fits native art into this. */
const SQUARE_FIT = { width: 0.9, height: 0.9 };

const sprite = (assetKey: string, sizeRatios = SQUARE_FIT) =>
	({
		type: 'sprite' as const,
		assetKey,
		sizeRatios,
	});

const h1 = sprite('h1');
const h2 = sprite('h2');
const h3 = sprite('h3');
const h4 = sprite('h4');
const l1 = sprite('l1');
const l2 = sprite('l2');
const l3 = sprite('l3');
const l4 = sprite('l4');
const l5 = sprite('l5');
const w = sprite('w');
const ew = sprite('ew');
const c = sprite('c');
const s = sprite('s');

const states = (staticSprite: ReturnType<typeof sprite>) => ({
	explosion: staticSprite,
	win: staticSprite,
	postWinStatic: staticSprite,
	static: staticSprite,
	spin: staticSprite,
	land: staticSprite,
});

export const SYMBOL_INFO_MAP = {
	H1: states(h1),
	H2: states(h2),
	H3: states(h3),
	H4: states(h4),
	L1: states(l1),
	L2: states(l2),
	L3: states(l3),
	L4: states(l4),
	L5: states(l5),
	W: states(w),
	EW: states(ew),
	C: states(c),
	S: states(s),
} as const;

/** Book-provided multiplier faces for the overlay reel. Never sampled on the client. */
export const WILD_MULT_STRIP_VALUES = [1, 2, 3, 4, 5, 10, 25, 50, 100] as const;

export const WILD_CHOOSER_VALUES = ['W', 'VS'] as const;

/** Inner white window on the square W frame (letter must stay inside this). */
export const WILD_CHOOSER_WINDOW = {
	size: SYMBOL_SIZE * 0.55,
	offsetY: -SYMBOL_SIZE * 0.08,
	faceSize: SYMBOL_SIZE * 0.4,
} as const;

/** Cream well on the full-reel expanding-wild art (below the header). */
export const WILD_MULT_WINDOW = {
	size: SYMBOL_SIZE * 0.7,
} as const;

/** Y of the multiplier reel, from the top of the expanded strip. */
export const expandingWildMultiplierCenterY = (rows: number) =>
	rows * SYMBOL_SIZE * (rows <= 3 ? 0.68 : 0.59);

export const WILD_FRAME_SIZE = SYMBOL_SIZE * 0.92;

/** Hollow fire-rim sheet (4×2). Oversized so the ring sits on the steel window. */
export const FIRE_RIM_COLS = 4;
export const FIRE_RIM_ROWS = 2;
export const FIRE_RIM_SIZE = SYMBOL_SIZE * 1.22;
export const FIRE_RIM_FPS = 24;
export const FIRE_RIM_ANIM_SPEED = FIRE_RIM_FPS / 60;
export const FIRE_RIM_FADE_MS = 200;
export const FIRE_RIM_PULSE_MS = 180;

export const SCATTER_LAND_SOUND_MAP = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
} as const;

/** Base x1 on every cell; tumble connections will increment these later. */
export const createInitialPositionMultipliers = () =>
	REEL_ROWS.map((rows) => Array.from({ length: rows }, () => 1));
