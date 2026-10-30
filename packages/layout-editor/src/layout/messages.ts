/**
 * Lingui-ready text. Items store a message id. This catalog is a stub so the
 * locale switcher and the overflow warning have something to measure.
 * Full locale catalogs stay with the game's Lingui setup.
 */
export const LOCALES = ['en', 'de', 'fi'] as const;
export type LocaleId = (typeof LOCALES)[number];

export const TEXT_CATALOG: Record<LocaleId, Record<string, string>> = {
	en: {
		'game.title': 'LOCKED IN',
		'ways.plaque': '243 WAYS',
	},
	de: {
		'game.title': 'EINGESPERRT',
		'ways.plaque': '243 WEGE',
	},
	fi: {
		'game.title': 'LUKITTU SISÄÄN — PAINA JATKAAKSESI HETI',
		'ways.plaque': '243 TAVOITETTA',
	},
};

export function messageText(locale: string, id: string): string | undefined {
	const catalog = TEXT_CATALOG[locale as LocaleId] ?? TEXT_CATALOG.en;
	return catalog[id];
}

/** Rough advance width. Enough to flag a translation that no longer fits the box. */
export function textWidth(text: string, fontSize: number): number {
	return text.length * fontSize * 0.56;
}
