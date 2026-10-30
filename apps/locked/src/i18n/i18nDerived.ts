import { stateI18nDerived } from 'state-shared';

import { i18nDerived as i18nDerivedUiPixi } from 'new-ui-pixi';
import { i18nDerived as i18nDerivedUiHtml } from 'new-ui-html';

/** Game copy: lingui catalog when present, otherwise the English source key. */
export const gameT = (key: string) => {
	const translated = stateI18nDerived.translate(key);
	return translated || key;
};

export const i18nDerived = {
	...i18nDerivedUiPixi,
	...i18nDerivedUiHtml,
	home: () => stateI18nDerived.translate('HOME'),
	notTranslated: () => stateI18nDerived.translate('NOT TRANSLATED'),
	game: gameT,
};
