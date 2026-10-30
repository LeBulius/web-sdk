import { gameT } from '../i18n/i18nDerived';

export type BonusModeKey =
	| 'base'
	| 'ante'
	| 'bonus'
	| 'bonus_super'
	| 'bonus_mystery'
	| 'degen_spin';

export type BonusIntroCopy = {
	title: string;
	subtitle: string;
	body: string;
};

/** Map sample / RGS aliases onto locked math mode keys. */
const MODE_ALIASES: Record<string, BonusModeKey> = {
	base: 'base',
	ante: 'ante',
	bonus: 'bonus',
	bonus_super: 'bonus_super',
	bonus_mystery: 'bonus_mystery',
	degen_spin: 'degen_spin',
	super: 'bonus_super',
	superbonus: 'bonus_super',
	mystery: 'bonus_mystery',
	degen: 'degen_spin',
	superspin: 'degen_spin',
};

export const normalizeBonusMode = (key: string | undefined | null): BonusModeKey => {
	const k = (key ?? 'base').toLowerCase().replace(/[\s-]+/g, '_');
	return MODE_ALIASES[k] ?? 'base';
};

export const getBonusIntroCopy = (modeKey: string | undefined | null): BonusIntroCopy => {
	const mode = normalizeBonusMode(modeKey);
	if (mode === 'ante') {
		return {
			title: gameT('ANTE FREE SPINS'),
			subtitle: gameT('ANTE SUBTITLE'),
			body: gameT('ANTE BODY'),
		};
	}
	if (mode === 'bonus') {
		return {
			title: gameT('BONUS'),
			subtitle: gameT('BONUS SUBTITLE'),
			body: gameT('BONUS BODY'),
		};
	}
	if (mode === 'bonus_super') {
		return {
			title: gameT('SUPER BONUS'),
			subtitle: gameT('SUPER BONUS SUBTITLE'),
			body: gameT('SUPER BONUS BODY'),
		};
	}
	if (mode === 'bonus_mystery') {
		return {
			title: gameT('MYSTERY BONUS'),
			subtitle: gameT('MYSTERY SUBTITLE'),
			body: gameT('MYSTERY BODY'),
		};
	}
	if (mode === 'degen_spin') {
		return {
			title: gameT('DEGEN SPIN'),
			subtitle: gameT('DEGEN SUBTITLE'),
			body: gameT('DEGEN BODY'),
		};
	}
	return {
		title: gameT('FREE SPINS'),
		subtitle: gameT('FEATURE UNLOCKED'),
		body: gameT('FREE SPINS BODY'),
	};
};

/** Infer mystery scatter package from awarded free-spin counts. */
export const getMysteryHint = (totalFreeSpins: number): string => {
	if (totalFreeSpins >= 15) return gameT('MYSTERY HINT 6');
	if (totalFreeSpins >= 12) return gameT('MYSTERY HINT 5');
	if (totalFreeSpins >= 8) return gameT('MYSTERY HINT 4');
	return gameT('MYSTERY HINT 3');
};

export type FreeSpinBackground = '3s' | '4s' | '5s';

/** 3S→5, 4S→8, 5S/6+→12/15 all use the 5-scatter hall. */
export const freeSpinBackgroundFromTotal = (totalFs: number): FreeSpinBackground => {
	if (totalFs >= 12) return '5s';
	if (totalFs >= 8) return '4s';
	return '3s';
};
