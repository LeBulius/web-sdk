import { stateI18nDerived, stateUrlDerived } from 'state-shared';
import { socialLabels } from 'utils-shared/social';

const t = (key: string) => stateI18nDerived.translate(key);

export const i18nDerived = {
	audio: () => t('AUDIO'),
	balance: () => t('BALANCE'),
	win: () => t('WIN'),
	bet: () => socialLabels.bet() ?? t('BET'),
	stop: () => t('STOP'),
	buyBonus: () => socialLabels.buyBonus() ?? t('BUY BONUS'),
	disable: () => t('DISABLE'),
	freeSpins: () => t('FREE SPINS'),
	decrease: () => t('-'),
	increase: () => t('+'),
	menu: () => t('MENU'),
	turbo: () => t('TURBO'),
	autoSpin: () => t('AUTO SPIN'),
	autoplay: () => t('AUTOPLAY'),
	numberOfRounds: () => t('NUMBER OF ROUNDS'),
	payTable: () => socialLabels.payTable() ?? t('PAYTABLE'),
	betMenu: () => socialLabels.betMenu() ?? t('BET MENU'),
	info: () => t('INFO'),
	settings: () => t('SETTINGS'),
	soundOn: () => t('SOUND ON'),
	soundOff: () => t('SOUND OFF'),
	menuExit: () => t('EXIT'),
	totalWin: () => t('TOTAL WIN'),
	extraChance: () => t('EXTRA CHANCE'),
	/** Social mode forces English replacements regardless of `lang`. */
	isSocial: () => stateUrlDerived.social(),
};
