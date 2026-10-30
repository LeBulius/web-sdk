/**
 * FE game config for Locked In.
 * gameID must match math-sdk/games/ways1 (Stake ACP / RGS upload id).
 * Paytables / max_win synced from math game_config.py.
 */
export default {
	providerName: 'lockedin',
	gameName: 'locked',
	gameID: 'ways1',
	rtp: 0.96,
	numReels: 4,
	numRows: [3, 5, 5, 3],
	betModes: {
		base: {
			cost: 1.0,
			feature: false,
			buyBonus: false,
			rtp: 0.96,
			max_win: 20000,
		},
		ante: {
			cost: 3.0,
			feature: true,
			buyBonus: false,
			rtp: 0.96,
			max_win: 20000,
		},
		bonus: {
			cost: 100.0,
			feature: true,
			buyBonus: true,
			rtp: 0.96,
			max_win: 20000,
		},
		bonus_super: {
			cost: 300.0,
			feature: true,
			buyBonus: true,
			rtp: 0.96,
			max_win: 20000,
		},
		bonus_mystery: {
			cost: 500.0,
			feature: true,
			buyBonus: true,
			rtp: 0.96,
			max_win: 20000,
		},
		degen_spin: {
			cost: 500.0,
			feature: true,
			buyBonus: false,
			rtp: 0.96,
			max_win: 20000,
		},
	},
	symbols: {
		H1: {
			paytable: [{ '4': 0.5 }, { '3': 0.4 }],
		},
		H2: {
			paytable: [{ '4': 0.4 }, { '3': 0.3 }],
		},
		H3: {
			paytable: [{ '4': 0.3 }, { '3': 0.2 }],
		},
		H4: {
			paytable: [{ '4': 0.2 }, { '3': 0.1 }],
		},
		L1: {
			paytable: [{ '4': 0.1 }, { '3': 0.1 }],
		},
		L2: {
			paytable: [{ '4': 0.1 }, { '3': 0.1 }],
		},
		L3: {
			paytable: [{ '4': 0.1 }, { '3': 0.1 }],
		},
		L4: {
			paytable: [{ '4': 0.1 }, { '3': 0.1 }],
		},
		L5: {
			paytable: [{ '4': 0.1 }, { '3': 0.1 }],
		},
		W: {
			paytable: [{ '4': 0.5 }],
			special_properties: ['wild'],
		},
		EW: {
			paytable: [{ '4': 0.5 }],
			special_properties: ['wild', 'multiplier'],
		},
		C: {
			paytable: null,
			special_properties: ['contraband'],
		},
		S: {
			paytable: null,
			special_properties: ['scatter'],
		},
	},
	paddingReels: {
		basegame: [],
		freegame: [],
	},
};
