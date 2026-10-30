import { mergeMessagesMaps } from 'utils-shared/i18n';
import { messagesMap as messagesMapUiPixi } from 'new-ui-pixi';
import { messagesMap as messagesMapUiHtml } from 'new-ui-html';

import ar from './ar';
import da from './da';
import de from './de';
import en from './en';
import es from './es';
import fi from './fi';
import fr from './fr';
import hi from './hi';
import id from './id';
import ja from './ja';
import ko from './ko';
import pl from './pl';
import pt from './pt';
import ru from './ru';
import tr from './tr';
import vi from './vi';
import zh from './zh';

const messagesMapGame = {
	ar,
	da,
	de,
	en,
	es,
	fi,
	fr,
	hi,
	id,
	ja,
	ko,
	pl,
	pt,
	ru,
	tr,
	vi,
	zh,
};

const messagesMap = mergeMessagesMaps([messagesMapGame, messagesMapUiPixi, messagesMapUiHtml]);

export default messagesMap;
