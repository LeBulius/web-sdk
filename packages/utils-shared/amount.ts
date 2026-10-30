import { stateBet } from 'state-shared';

import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

/** Stake Engine supported currency display metadata (docs/reference/currencies). */
export type CurrencyCode =
	| 'USD'
	| 'CAD'
	| 'JPY'
	| 'EUR'
	| 'RUB'
	| 'CNY'
	| 'PHP'
	| 'INR'
	| 'IDR'
	| 'KRW'
	| 'BRL'
	| 'MXN'
	| 'DKK'
	| 'PLN'
	| 'VND'
	| 'TRY'
	| 'CLP'
	| 'ARS'
	| 'PEN'
	| 'NGN'
	| 'SAR'
	| 'ILS'
	| 'AED'
	| 'TWD'
	| 'NOK'
	| 'KWD'
	| 'JOD'
	| 'CRC'
	| 'TND'
	| 'SGD'
	| 'MYR'
	| 'OMR'
	| 'QAR'
	| 'BHD'
	| 'PKR'
	| 'EGP'
	| 'NZD'
	| 'BOB'
	| 'GHS'
	| 'KES'
	| 'MAD'
	| 'BAM'
	| 'ISK'
	| 'TZS'
	| 'UGX'
	| 'XOF'
	| 'XGC'
	| 'XSC'
	| 'XEC';

type CurrencyInfo = {
	symbol: string;
	decimals: number;
	symbolAfter?: boolean;
};

/**
 * Display symbols / placement / decimals from Stake Engine currency table.
 * Example column is authoritative for prefix vs suffix and fraction digits.
 */
export const CURRENCY_META: Record<CurrencyCode, CurrencyInfo> = {
	USD: { symbol: '$', decimals: 2 },
	CAD: { symbol: 'CA$', decimals: 2 },
	JPY: { symbol: '¥', decimals: 0 },
	EUR: { symbol: '€', decimals: 2 },
	RUB: { symbol: '₽', decimals: 2 },
	CNY: { symbol: 'CN¥', decimals: 2 },
	PHP: { symbol: '₱', decimals: 2 },
	INR: { symbol: '₹', decimals: 2 },
	IDR: { symbol: 'Rp', decimals: 0 },
	KRW: { symbol: '₩', decimals: 0 },
	BRL: { symbol: 'R$', decimals: 2 },
	MXN: { symbol: 'MX$', decimals: 2 },
	DKK: { symbol: 'KR', decimals: 2, symbolAfter: true },
	PLN: { symbol: 'zł', decimals: 2, symbolAfter: true },
	VND: { symbol: '₫', decimals: 0, symbolAfter: true },
	TRY: { symbol: '₺', decimals: 2 },
	CLP: { symbol: 'CLP', decimals: 0, symbolAfter: true },
	ARS: { symbol: 'ARS', decimals: 2, symbolAfter: true },
	PEN: { symbol: 'S/', decimals: 2 },
	NGN: { symbol: '₦', decimals: 2 },
	SAR: { symbol: 'SAR', decimals: 2, symbolAfter: true },
	ILS: { symbol: 'ILS', decimals: 2, symbolAfter: true },
	AED: { symbol: 'AED', decimals: 2, symbolAfter: true },
	TWD: { symbol: 'NT$', decimals: 2 },
	NOK: { symbol: 'kr', decimals: 2 },
	KWD: { symbol: 'KD', decimals: 2 },
	JOD: { symbol: 'JD', decimals: 2 },
	CRC: { symbol: '₡', decimals: 2 },
	TND: { symbol: 'TND', decimals: 2, symbolAfter: true },
	SGD: { symbol: 'SG$', decimals: 2 },
	MYR: { symbol: 'RM', decimals: 2 },
	OMR: { symbol: 'OMR', decimals: 2, symbolAfter: true },
	QAR: { symbol: 'QAR', decimals: 2, symbolAfter: true },
	BHD: { symbol: 'BD', decimals: 2 },
	PKR: { symbol: '₨', decimals: 2 },
	EGP: { symbol: 'ج.م', decimals: 2 },
	NZD: { symbol: 'NZ$', decimals: 2 },
	BOB: { symbol: 'Bs', decimals: 2 },
	GHS: { symbol: 'GH₵', decimals: 2 },
	KES: { symbol: 'KSh', decimals: 2 },
	MAD: { symbol: 'MAD', decimals: 2 },
	BAM: { symbol: 'KM', decimals: 2 },
	ISK: { symbol: 'kr', decimals: 2 },
	TZS: { symbol: 'TSh', decimals: 2 },
	UGX: { symbol: 'USh', decimals: 2 },
	XOF: { symbol: 'CFA', decimals: 2 },
	XGC: { symbol: 'GC', decimals: 2, symbolAfter: true },
	XSC: { symbol: 'SC', decimals: 2, symbolAfter: true },
	XEC: { symbol: 'SC', decimals: 2, symbolAfter: true },
};

const FALLBACK_META: CurrencyInfo = { symbol: '', decimals: 2, symbolAfter: true };

const getCurrencyMeta = (currency: string): CurrencyInfo => {
	const meta = CURRENCY_META[currency as CurrencyCode];
	if (meta) return meta;
	// Unknown ISO code: show code after amount (e.g. "10.00 XYZ") rather than bare number.
	return { ...FALLBACK_META, symbol: currency || '' };
};

/** Balance/win: 3dp when bet < 0.1; otherwise currency default. */
export const getBalanceWinFractionDigits = () => {
	if (stateBet.betAmount > 0 && stateBet.betAmount < 0.1) return 3;
	return getCurrencyMeta(stateBet.currency).decimals;
};

export const getBetFractionDigits = () => getCurrencyMeta(stateBet.currency).decimals;

// bookEventAmount: is the amount or win numbers in the events of books, e.g. the amount in setTotalWin bookEvent
// {
// 	"index": 3,
// 	"type": "setTotalWin",
// 	"amount": 100
// },
// if betting on $1,   100 bookEventAmount equals to $1.    betAmountMultiplier is (100 / BOOK_AMOUNT_MULTIPLIER =) 1
// if betting on $1,    50 bookEventAmount equals to $0.5.  betAmountMultiplier is ( 50 / BOOK_AMOUNT_MULTIPLIER =) 0.5
// if betting on $0.5, 100 bookEventAmount equals to $0.5.  betAmountMultiplier is (100 / BOOK_AMOUNT_MULTIPLIER =) 1
// if betting on $0.5,  50 bookEventAmount equals to $0.25. betAmountMultiplier is ( 50 / BOOK_AMOUNT_MULTIPLIER =) 0.5

export const bookEventAmountToBetAmountMultiplier = (bookEventAmount: number) =>
	bookEventAmount / BOOK_AMOUNT_MULTIPLIER;

export const bookEventAmountToNormalisedAmount = (bookEventAmount: number) => {
	const betAmountMultiplier = bookEventAmountToBetAmountMultiplier(bookEventAmount);
	return stateBet.wageredBetAmount * betAmountMultiplier;
};

export const numberToFloat = (value: number) => Number.parseFloat(`${value}`);

type FormatOptions = {
	/** Override fraction digits (balance/win use bet-aware digits). */
	fractionDigits?: number;
};

/**
 * Format a display amount with Stake currency symbols.
 * Avoids Intl `style: 'currency'` which throws on virtual codes and can break spin UI.
 */
export const numberToCurrencyString = (value: number, options?: FormatOptions) => {
	const meta = getCurrencyMeta(stateBet.currency);
	const fractionDigits = options?.fractionDigits ?? meta.decimals;
	const amount = numberToFloat(value);

	let formatted: string;
	try {
		formatted = new Intl.NumberFormat(undefined, {
			minimumFractionDigits: fractionDigits,
			maximumFractionDigits: fractionDigits,
		}).format(amount);
	} catch {
		formatted = amount.toFixed(fractionDigits);
	}

	if (!meta.symbol) return formatted;
	return meta.symbolAfter ? `${formatted} ${meta.symbol}` : `${meta.symbol}${formatted}`;
};

/** Balance / win amounts: 3 decimals when bet size is below 0.1. */
export const numberToBalanceWinCurrencyString = (value: number) =>
	numberToCurrencyString(value, { fractionDigits: getBalanceWinFractionDigits() });

export const bookEventAmountToCurrencyString = (bookEventAmount: number) => {
	const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
	return numberToCurrencyString(normalisedAmount);
};

/** Win book amounts with bet-aware decimals (3dp when bet < 0.1). */
export const bookEventAmountToBalanceWinCurrencyString = (bookEventAmount: number) => {
	const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
	return numberToBalanceWinCurrencyString(normalisedAmount);
};
