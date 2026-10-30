import { preview } from 'config-storybook';

import { ensureKontoraFontFace, preloadKontoraFont } from '../src/kontoraFont';

ensureKontoraFontFace();
void preloadKontoraFont();

export default preview;
