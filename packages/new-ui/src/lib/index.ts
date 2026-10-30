// Components
export { default as SlotControls } from './components/SlotControls.svelte';
export { default as FreeGamesBar } from './components/FreeGamesBar.svelte';
export { default as FeaturesModal } from './components/FeaturesModal.svelte';
export { default as InfoModal } from './components/InfoModal.svelte';
export { default as AutoplayModal } from './components/AutoplayModal.svelte';
export { default as BetMenuModal } from './components/BetMenuModal.svelte';
export { default as BuyBonusConfirmModal } from './components/BuyBonusConfirmModal.svelte';
export { default as ErrorModal } from './components/ErrorModal.svelte';
export { default as SettingsModal } from './components/SettingsModal.svelte';

// Store & bridge
export { uiStore } from './stores/uiStore.svelte';
export { sdkBridge } from './stores/sdkBridge';

// Types
export type { SlotControlsProps, SlotControlsEvents, BetModeData } from './types';
