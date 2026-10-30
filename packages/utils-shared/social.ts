import { stateUrlDerived } from 'state-shared';

/**
 * Stake.us social casino restricted → replacement phrases.
 * Longer phrases first so "buy bonus" wins over "buy".
 * @see https://stake-engine.com/docs/approval-guidelines/jurisdiction-requirements
 * @see /docs/reference/social-mode
 */
const REPLACEMENTS: [RegExp, string][] = [
	[/place your bets/gi, 'come and play'],
	[/place your bet/gi, 'come and play'],
	[/be awarded to player's accounts/gi, "appear in player's accounts"],
	[/be awarded to players' accounts/gi, "appear in players' accounts"],
	[/win feature/gi, 'play feature'],
	[/bonus buy/gi, 'bonus'],
	[/buy bonus/gi, 'get bonus'],
	[/paid out/gi, 'won'],
	[/pay out/gi, 'win'],
	[/pays out/gi, 'win'],
	[/total bet/gi, 'total play'],
	[/loss limit/gi, 'stop limit'],
	[/loss streak/gi, 'miss streak'],
	[/pay table/gi, 'win table'],
	[/at the cost of/gi, 'for'],
	[/cost of/gi, 'can be played for'],
	[/betting/gi, 'playing'],
	[/bought/gi, 'instantly triggered'],
	[/purchase/gi, 'play'],
	[/rebet/gi, 'respin'],
	[/wager/gi, 'play'],
	[/gamble/gi, 'play'],
	[/deposit/gi, 'get coins'],
	[/withdraw/gi, 'redeem'],
	[/currency/gi, 'token'],
	[/credit/gi, 'balance'],
	[/money/gi, 'coins'],
	[/cash/gi, 'coins'],
	[/payer/gi, 'winner'],
	[/stake/gi, 'play amount'],
	[/bets/gi, 'plays'],
	[/\bbet\b/gi, 'play'],
	[/\bbuy\b/gi, 'play'],
	[/\bpaid\b/gi, 'won'],
	[/\bpays\b/gi, 'wins'],
	[/\bpay\b/gi, 'win'],
	[/fund/gi, 'coins'],
];

/** Apply social-casino phrase replacements when `social=true`. */
export const socializeText = (text: string) => {
	if (!text || !stateUrlDerived.social()) return text;
	return REPLACEMENTS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
};

/** UI label helpers for social mode (English replacements regardless of lang). */
export const socialLabels = {
	bet: () => (stateUrlDerived.social() ? 'PLAY' : null),
	betMenu: () => (stateUrlDerived.social() ? 'PLAY MENU' : null),
	selectYourBet: () => (stateUrlDerived.social() ? 'SELECT YOUR PLAY' : null),
	buy: () => (stateUrlDerived.social() ? 'PLAY' : null),
	buyBonus: () => (stateUrlDerived.social() ? 'GET BONUS' : null),
	payTable: () => (stateUrlDerived.social() ? 'WIN TABLE' : null),
	lossLimit: () => (stateUrlDerived.social() ? 'STOP LIMIT' : null),
	insufficientFunds: () =>
		stateUrlDerived.social()
			? 'INSUFFICIENT FUNDS TO PLACE THIS PLAY. PLEASE ADD COINS TO YOUR ACCOUNT OR LOWER THE PLAY LEVEL.'
			: null,
};
