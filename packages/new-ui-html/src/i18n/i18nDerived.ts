import { stateI18nDerived } from 'state-shared';
import { socialLabels } from 'utils-shared/social';

const t = (key: string) => stateI18nDerived.translate(key);

export const i18nDerived = {
	bet: () => socialLabels.bet() ?? t('BET'),
	max: () => t('MAX'),
	betMenu: () => socialLabels.betMenu() ?? t('BET MENU'),
	selectYourBet: () => socialLabels.selectYourBet() ?? t('SELECT YOUR BET'),
	confirm: () => t('CONFIRM'),
	masterVolume: () => t('MASTER VOLUME'),
	musicVolume: () => t('MUSIC VOLUME'),
	soundEffectVolume: () => t('SOUND EFFECT VOLUME'),
	autoSpins: () => t('AUTO SPINS'),
	numberOfRounds: () => t('NUMBER OF ROUNDS'),
	advanced: () => t('ADVANCED'),
	singleWinLimit: () => t('SINGLE WIN LIMIT'),
	lossLimit: () => socialLabels.lossLimit() ?? t('LOSS LIMIT'),
	startAutoplay: () => t('START AUTOPLAY'),
	notification: () => t('NOTIFICATION'),
	autoSpinsStopInfo: () => t('AUTO PLAY HAS STOPPED DUE TO'),
	insufficientFunds: () =>
		socialLabels.insufficientFunds() ??
		t(
			'INSUFFICIENT FUNDS TO PLACE THIS BET. PLEASE ADD FUNDS TO YOUR ACCOUNT OR LOWER THE BET LEVEL.',
		),
	lossLimitReached: () => t('LOSS LIMIT REACHED'),
	singleWinLimitReached: () => t('SINGLE WIN LIMIT REACHED'),
	settings: () => t('SETTINGS'),
	autoplay: () => t('AUTOPLAY'),
	info: () => t('INFO'),
	bonus: () => t('BONUS'),
	extraChance: () => t('EXTRA CHANCE'),
	engineBonus: () => t('ENGINE BONUS'),
	nitroBonus: () => t('NITRO BONUS'),
	activate: () => t('ACTIVATE'),
	buy: () => socialLabels.buy() ?? t('BUY'),
	error: () => t('ERROR'),
};
