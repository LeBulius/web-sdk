/**
 * Bonus page (ModalBuyBonus) layout per Stake viewport.
 * Desktop + Laptop share the same preset. Popout L is a stub for later.
 *
 * | Preset   | Size       | Role                          |
 * |----------|------------|-------------------------------|
 * | desktop  | 1200×675   | Main desktop UI               |
 * | laptop   | 1024×576   | Same settings as desktop      |
 * | mobile   | e.g. 425×812 | Main mobile UI              |
 * | popoutS  | 400×225    | Mini player                   |
 * | popoutL  | 800×450    | Expanded popout (tune later)  |
 */

export type BonusPageSize = 'desktop' | 'laptop' | 'mobile' | 'popoutS' | 'popoutL';

export type BonusPagePreset = {
	/** How card grid packs vertically when space remains */
	cardsAlign: 'center' | 'start';
	cardsGap: string;
	cardsPadTop: string;
	cardsPadX: string;
	cardsPadBottom: string;
	barPad: string;
	/** CSS length — card width */
	cardWidth: string;
	cardMinHeight: string;
	cardPreviewMinHeight: string;
	cardPreviewImgMaxHeight: string;
	cardBodyPad: string;
	cardBodyGap: string;
	cardTitleSize: string;
	cardPriceSize: string;
	cardActionPad: string;
	cardActionSize: string;
	cardRadius: string;
	/** Max cards per row hint (grid layouts) */
	cardsPerRow: number;
	/** `carousel` = one large card, horizontal scroll (Popout S) */
	layout: 'grid' | 'carousel';
	/** Activate / buy confirm card (ModalBuyBonusConfirm) */
	confirm: {
		rootPad: string;
		width: string;
		maxHeight: string;
		radius: string;
		previewMinH: string;
		previewImgMaxH: string;
		bodyPad: string;
		bodyGap: string;
		titleSize: string;
		descSize: string;
		priceSize: string;
		actionPad: string;
		actionSize: string;
		zapSize: number;
		closeSize: string;
	};
	bar: {
		opacity: number;
		padY: string;
		padX: string;
		labelGap: string;
		chevronSize: number;
		balance: {
			padTop: string;
			padRight: string;
			padBottom: string;
			padLeft: string;
			offsetX: string;
			offsetY: string;
		};
	};
};

const desktopBar = {
	opacity: 0.7,
	padY: '0.85rem',
	padX: '1.3rem',
	labelGap: '0.2rem',
	chevronSize: 52,
	balance: {
		padTop: '0.15rem',
		padRight: '0',
		padBottom: '0',
		padLeft: '0',
		offsetX: '0',
		offsetY: '0',
	},
} as const;

const desktopConfirm = {
	rootPad: '1.5rem 1.5rem 6.5rem',
	width: 'min(20rem, 92vw)',
	maxHeight: 'none',
	radius: '1.25rem',
	previewMinH: '11rem',
	previewImgMaxH: '9.5rem',
	bodyPad: '1rem 1.25rem 1.35rem',
	bodyGap: '0.55rem',
	titleSize: '1rem',
	descSize: '0.85rem',
	priceSize: '2rem',
	actionPad: '0.85rem 1rem',
	actionSize: '0.95rem',
	zapSize: 20,
	closeSize: '3.25rem',
} as const;

/** Desktop 1200×675 — main desktop UI (cards vertically centered). */
const desktop: BonusPagePreset = {
	cardsAlign: 'center',
	cardsGap: '1rem',
	cardsPadTop: '3.5rem',
	cardsPadX: '1rem',
	cardsPadBottom: '0.75rem',
	barPad: '0.5rem 1rem 1rem',
	cardWidth: '12rem',
	cardMinHeight: '16rem',
	cardPreviewMinHeight: '6rem',
	cardPreviewImgMaxHeight: '5rem',
	cardBodyPad: '0.7rem 0.8rem 0.9rem',
	cardBodyGap: '0.45rem',
	cardTitleSize: '0.8rem',
	cardPriceSize: '1.75rem',
	cardActionPad: '0.7rem 1rem',
	cardActionSize: '0.85rem',
	cardRadius: '1rem',
	cardsPerRow: 4,
	layout: 'grid',
	confirm: { ...desktopConfirm },
	bar: { ...desktopBar, balance: { ...desktopBar.balance } },
};

/** Laptop 1024×576 — same as desktop. */
const laptop: BonusPagePreset = { ...desktop, bar: { ...desktop.bar, balance: { ...desktop.bar.balance } } };

/** Mobile L (and M/S) — main mobile UI. */
const mobile: BonusPagePreset = {
	cardsAlign: 'start',
	cardsGap: '1rem',
	cardsPadTop: '3.5rem',
	cardsPadX: '1rem',
	cardsPadBottom: '0.75rem',
	barPad: '0.5rem 1rem 1rem',
	cardWidth: '12rem',
	cardMinHeight: '16rem',
	cardPreviewMinHeight: '6rem',
	cardPreviewImgMaxHeight: '5rem',
	cardBodyPad: '0.7rem 0.8rem 0.9rem',
	cardBodyGap: '0.45rem',
	cardTitleSize: '0.8rem',
	cardPriceSize: '1.75rem',
	cardActionPad: '0.7rem 1rem',
	cardActionSize: '0.85rem',
	cardRadius: '1rem',
	cardsPerRow: 2,
	layout: 'grid',
	confirm: { ...desktopConfirm },
	bar: {
		opacity: 0.7,
		padY: '0.7rem',
		padX: '1rem',
		labelGap: '0.15rem',
		chevronSize: 44,
		balance: {
			padTop: '0.1rem',
			padRight: '0',
			padBottom: '0',
			padLeft: '0',
			offsetX: '0',
			offsetY: '0',
		},
	},
};

/**
 * Popout S 400×225 — mini player.
 * Equal 12×16 cards in one row, sized to fill the viewport (no scroll arrows).
 */
const popoutS: BonusPagePreset = {
	cardsAlign: 'center',
	cardsGap: '0.5rem',
	cardsPadTop: '0.2rem',
	cardsPadX: '1.85rem',
	cardsPadBottom: '0.15rem',
	barPad: '0.1rem 0.3rem 0.2rem',
	cardWidth: '12rem',
	cardMinHeight: '16rem',
	cardPreviewMinHeight: '6rem',
	cardPreviewImgMaxHeight: '5rem',
	cardBodyPad: '0.7rem 0.8rem 0.9rem',
	cardBodyGap: '0.45rem',
	cardTitleSize: '0.8rem',
	cardPriceSize: '1.75rem',
	cardActionPad: '0.7rem 1rem',
	cardActionSize: '0.85rem',
	cardRadius: '1rem',
	cardsPerRow: 5,
	layout: 'carousel',
	confirm: {
		rootPad: '1.1rem 0.4rem 0.3rem',
		width: 'min(10.75rem, 54vw)',
		maxHeight: 'calc(100% - 1.25rem)',
		radius: '0.45rem',
		previewMinH: '1.7rem',
		previewImgMaxH: '1.35rem',
		bodyPad: '0.22rem 0.4rem 0.28rem',
		bodyGap: '0.08rem',
		titleSize: '0.48rem',
		descSize: '0.36rem',
		priceSize: '0.72rem',
		actionPad: '0.2rem 0.35rem',
		actionSize: '0.4rem',
		zapSize: 8,
		closeSize: '1.75rem',
	},
	bar: {
		opacity: 0.75,
		padY: '0.18rem',
		padX: '0.5rem',
		labelGap: '0.04rem',
		chevronSize: 16,
		balance: {
			padTop: '0',
			padRight: '0',
			padBottom: '0',
			padLeft: '0',
			offsetX: '0',
			offsetY: '0',
		},
	},
};

/** Popout L 800×450 — same card size as current; start-align so two rows are not clipped. */
const popoutL: BonusPagePreset = {
	...desktop,
	cardsAlign: 'start',
	cardsGap: '0.75rem',
	cardsPadTop: '2.85rem',
	cardsPadBottom: '1rem',
	cardWidth: '10rem',
	cardMinHeight: '13.5rem',
	cardPreviewMinHeight: '5rem',
	cardPreviewImgMaxHeight: '4rem',
	cardPriceSize: '1.45rem',
	cardsPerRow: 4,
	layout: 'grid',
	bar: {
		...desktopBar,
		padY: '0.65rem',
		chevronSize: 44,
		balance: { ...desktopBar.balance },
	},
};

export const bonusPagePresets: Record<BonusPageSize, BonusPagePreset> = {
	desktop,
	laptop,
	mobile,
	popoutS,
	popoutL,
};

/** Map window size → Stake viewport bucket. */
export const resolveBonusPageSize = (width: number, height: number): BonusPageSize => {
	const w = width || 1;
	const h = height || 1;
	const ratio = w / h;

	// Popout S — 400×225
	if (w <= 420 && h <= 250) return 'popoutS';

	// Popout L — 800×450 (landscape, short)
	if (w <= 820 && h <= 470 && ratio >= 1.45) return 'popoutL';

	// Mobile portrait (Mobile L/M/S)
	if (ratio < 1) return 'mobile';

	// Laptop band (still uses desktop settings, but tagged)
	if (w <= 1100 || h <= 600) return 'laptop';

	return 'desktop';
};

export const getBonusPagePreset = (width: number, height: number): BonusPagePreset =>
	bonusPagePresets[resolveBonusPageSize(width, height)];
