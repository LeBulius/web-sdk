// Modal components
export { default as AutoplayModal } from './src/components/AutoplayModal.svelte';
export { default as BetMenuModal } from './src/components/BetMenuModal.svelte';
export { default as BuyBonusConfirmModal } from './src/components/BuyBonusConfirmModal.svelte';
export { default as ErrorModal } from './src/components/ErrorModal.svelte';
export { default as FeaturesModal } from './src/components/FeaturesModal.svelte';
export { default as SettingsModal } from './src/components/SettingsModal.svelte';
export { default as GameVersion } from './src/components/GameVersion.svelte';
export { default as Modals } from './src/components/Modals.svelte';
export { default as GlobalStyle } from './src/components/GlobalStyle.svelte';
export { default as ModalGameRules } from './src/components/ModalGameRules.svelte';
export { default as ModalPayTable } from './src/components/ModalPayTable.svelte';
export { default as ModalBetMenu } from './src/components/ModalBetMenu.svelte';
export { default as ModalBuyBonus } from './src/components/ModalBuyBonus.svelte';
export { default as ModalBuyBonusConfirm } from './src/components/ModalBuyBonusConfirm.svelte';

// Base primitives (for custom modal compositions)
export { default as BaseOverlay } from './src/components/BaseOverlay.svelte';
export { default as BaseModalCard } from './src/components/BaseModalCard.svelte';
export { default as BaseModalTitle } from './src/components/BaseModalTitle.svelte';
export { default as BaseOptionButton } from './src/components/BaseOptionButton.svelte';
export { default as BaseVolumeSlider } from './src/components/BaseVolumeSlider.svelte';
export { default as BaseContent } from './src/components/BaseContent.svelte';
export { default as BaseScrollable } from './src/components/BaseScrollable.svelte';
export { default as BaseIcon } from './src/components/BaseIcon.svelte';
export { default as BaseButtonContent } from './src/components/BaseButtonContent.svelte';

// Sub-components
export { default as BonusCard } from './src/components/BonusCard.svelte';
export { default as BonusCards } from './src/components/BonusCards.svelte';
export { default as BonusContentWrapLandscape } from './src/components/BonusContentWrapLandscape.svelte';
export { default as BonusContentWrapPortrait } from './src/components/BonusContentWrapPortrait.svelte';
export { default as BonusContentWrapLarge } from './src/components/BonusContentWrapLarge.svelte';
export { default as BetMenuAmountGrid } from './src/components/BetMenuAmountGrid.svelte';
export { default as BetMenuAmountToggle } from './src/components/BetMenuAmountToggle.svelte';


// Shared UI font (Kontora Black)
export {
	KONTORA_FONT_FAMILY,
	KONTORA_FONT_URL,
	ensureKontoraFontFace,
} from './src/kontoraFont';

// state
export { stateBonus, stateBonusDerived } from './src/stateBonus.svelte';

// i18n
export { i18nDerived } from './src/i18n/i18nDerived';
import messagesMap from './src/i18n/messagesMap';
export { messagesMap };

// events
export type { EmitterEventModal } from './src/types';
