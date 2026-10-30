import type { BetModeMeta } from 'state-shared';

const bonus3Img = new URL('../assets/sprites/background/bg_3s.png', import.meta.url).href;
const bonus4Img = new URL('../assets/sprites/background/bg_4s.png', import.meta.url).href;
const bonus5Img = new URL('../assets/sprites/background/bg_5s.png', import.meta.url).href;
const ewImg = new URL('../assets/sprites/symbols/ew/ew3.webp', import.meta.url).href;

const emptyAssets = {
	icon: '',
	dialogImage: '',
	dialogVolatility: '',
	volatility: '',
	button: '',
};

/**
 * Buy / ante cards for Locked In — keys match math mode names (lowercase).
 * `BASE` alias keeps shared UI resets (`activeBetModeKey = 'BASE'`) working.
 */
export const lockedBetModeMeta = {
	BASE: {
		mode: 'base',
		costMultiplier: 1,
		type: 'default',
		parent: '',
		children: '',
		assets: { ...emptyAssets },
		text: {
			title: 'BASE',
			dialog: '',
			button: '',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: 'GOOD LUCK',
			betAmountLabel: 'BET',
		},
		maxWin: 20000,
	},
	base: {
		mode: 'base',
		costMultiplier: 1,
		type: 'default',
		parent: '',
		children: '',
		assets: { ...emptyAssets },
		text: {
			title: 'BASE',
			dialog: '',
			button: '',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: 'GOOD LUCK',
			betAmountLabel: 'BET',
		},
		maxWin: 20000,
	},
	ante: {
		mode: 'ante',
		costMultiplier: 3,
		type: 'activate',
		parent: '',
		children: '',
		assets: {
			...emptyAssets,
			icon: bonus3Img,
			dialogImage: bonus3Img,
			volatility: 'volatility_03',
		},
		text: {
			title: 'ANTE',
			description: '3× bet. Hotter free-spin odds. Stays on until you turn it off.',
			dialog:
				'Pay 3× your bet for a higher chance to lock in free spins. Ante stays active until disabled.',
			button: 'ACTIVATE',
			betAmountLabel: 'ANTE',
			tickerIdle: 'ANTE IS ACTIVE',
			tickerSpin: 'GOOD LUCK',
			bannerText: 'ANTE',
		},
		maxWin: 20000,
	},
	// Buy cards: 3S → 4S; Mystery is last on the bonus page
	bonus: {
		mode: 'bonus',
		costMultiplier: 100,
		type: 'buy',
		parent: '',
		children: '',
		assets: {
			...emptyAssets,
			icon: bonus3Img,
			dialogImage: bonus3Img,
			volatility: 'volatility_03',
		},
		text: {
			title: 'BONUS',
			description: '100× bet. Guaranteed 3-Scatter free spins. Grid heat carries in.',
			dialog:
				'Buy a guaranteed 3-Scatter free spins feature for 100× your bet. Cell multipliers carry from the trigger spin and climb on every connection.',
			button: 'BUY',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: 'BONUS BUY',
			bannerText: '3-SCATTER',
			betAmountLabel: 'BONUS',
		},
		maxWin: 20000,
	},
	bonus_super: {
		mode: 'bonus_super',
		costMultiplier: 300,
		type: 'buy',
		parent: '',
		children: '',
		assets: {
			...emptyAssets,
			icon: bonus4Img,
			dialogImage: bonus4Img,
			volatility: 'volatility_04',
		},
		text: {
			title: 'SUPER BONUS',
			description: '300× bet. Guaranteed 4-Scatter free spins. Grid heat carries in.',
			dialog:
				'Buy a guaranteed 4-Scatter free spins feature for 300× your bet. Cell multipliers carry from the trigger spin.',
			button: 'BUY',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: 'SUPER BONUS BUY',
			bannerText: '4-SCATTER',
			betAmountLabel: 'SUPER BONUS',
		},
		maxWin: 20000,
	},
	degen_spin: {
		mode: 'degen_spin',
		costMultiplier: 500,
		type: 'activate',
		parent: '',
		children: '',
		assets: {
			...emptyAssets,
			icon: ewImg,
			dialogImage: ewImg,
			volatility: 'volatility_05',
		},
		text: {
			title: 'DEGEN SPIN',
			description: '500× bet. Guaranteed expanding wilds on scatter-free reels. Stays on until you turn it off.',
			dialog:
				'Pay 500× your bet for a high-volatility spin with expanding wilds. Degen stays active until disabled. Free spins can still land.',
			button: 'ACTIVATE',
			tickerIdle: 'DEGEN SPIN IS ACTIVE',
			tickerSpin: 'GOOD LUCK',
			bannerText: 'DEGEN',
			betAmountLabel: 'DEGEN SPIN',
		},
		maxWin: 20000,
	},
	bonus_mystery: {
		mode: 'bonus_mystery',
		costMultiplier: 500,
		type: 'buy',
		parent: '',
		children: '',
		assets: {
			...emptyAssets,
			icon: bonus5Img,
			dialogImage: bonus5Img,
			volatility: 'volatility_04',
		},
		text: {
			title: 'MYSTERY BONUS',
			description: '500× bet. Mystery picks 3, 4, or 5 Scatters — 5, 8, or 12 free spins.',
			dialog:
				'Buy a mystery free spins feature for 500× your bet. Land 3, 4, or 5 Scatters (5 / 8 / 12 free spins). Grid heat from the trigger spin carries in.',
			button: 'BUY',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: 'MYSTERY BUY',
			bannerText: 'MYSTERY',
			betAmountLabel: 'MYSTERY',
		},
		maxWin: 20000,
	},
} satisfies BetModeMeta;
