import { locales } from 'config-lingui';
import { page } from '$app/state';

export type Language = (typeof locales)[number];

export type Key =
	// keys for play
	| 'sessionID'
	| 'rgs_url'
	| 'lang'
	| 'currency'
	| 'device'
	| 'social'
	| 'demo'
	// keys for replay 
	| 'replay'
	| 'amount'
	| 'game'
	| 'mode'
	| 'version'
	| 'event'
	;

const getUrlSearchParam = (key: Key) => {
	const fromKit = page.url.searchParams.get(key);
	if (fromKit) return fromKit;
	if (typeof window !== 'undefined') {
		return new URLSearchParams(window.location.search).get(key) ?? '';
	}
	return '';
};

// params for play
const lang = () => {
	const raw = getUrlSearchParam('lang');
	// Stake docs list Polish as `po`; SDK / launcher UI use `pl`. Brazil → Portuguese.
	if (raw === 'br') return 'pt';
	if (raw === 'po') return 'pl';
	return (raw as Language) || 'en';
};
// Dev only: with no rgs_url in the URL, use the local RGS that the layout-editor Vite plugin serves
// under /__rgs. A real rgs_url always wins; Storybook keeps its no-RGS flow; production is unchanged.
const isLocalRgs = () =>
	!import.meta.env.STORYBOOK && typeof window !== 'undefined' && !getUrlSearchParam('rgs_url');
const sessionID = () =>
	getUrlSearchParam('sessionID') || (import.meta.env.DEV && isLocalRgs() ? 'dev-local' : '');
const rgsUrl = () =>
	getUrlSearchParam('rgs_url') ||
	(import.meta.env.DEV && isLocalRgs() ? `http://${window.location.host}/__rgs` : '');
const social = () => getUrlSearchParam('social') === 'true';
const currency = () => getUrlSearchParam('currency') || '';

// params for replay
const replay = () => getUrlSearchParam('replay') === 'true';
const amount = () => Number(getUrlSearchParam('amount')) || 0;
const game = () => getUrlSearchParam('game') || '';
const version = () => getUrlSearchParam('version') || '';
const mode = () => getUrlSearchParam('mode') || '';
const event = () => getUrlSearchParam('event') || '';

export const stateUrlDerived = {
	// states for play
	lang,
	sessionID,
	rgsUrl,
	social,
	currency,
	// states for replay
	replay,
	amount,
	game,
	mode,
	version,
	event,
};
