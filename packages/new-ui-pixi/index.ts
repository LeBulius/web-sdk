export { default as UI } from './src/components/UI.svelte';
export { default as UiGameName } from './src/components/UiGameName.svelte';

// Shared UI control sprites (spin / turbo / menu / bet controls, etc.)
export { uiAssets, type UiAssetKey } from './src/uiAssets';

// Shared UI font (Kontora Black)
export {
	KONTORA_FONT_FAMILY,
	KONTORA_FONT_URL,
	ensureKontoraFontFace,
	preloadKontoraFont,
} from './src/kontoraFont';

// i18n
export { i18nDerived } from './src/i18n/i18nDerived';
import messagesMap from './src/i18n/messagesMap';
export { messagesMap };

export * from './src/types';
