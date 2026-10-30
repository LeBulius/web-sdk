# new-ui-html — Component Reference

The HTML modal/overlay package. All modals are declarative — show/hide by passing boolean props. Volume sliders connect to `stateSound` from `state-shared` directly.

---

## Aggregator

| Component | Description |
|---|---|
| `Modals` | Single drop-in that renders every modal. Add once in `Game.svelte` **outside** the PixiJS `<App>`. Pass open-state booleans and callbacks. |

---

## Modal Components (`src/components/`)

| Component | Description |
|---|---|
| `ErrorModal` | Full-screen red-bordered error card over a dimmed overlay. Two error types: `insufficient-balance` and `reload`. Click outside to dismiss. |
| `AutoplayModal` | Popup with a grid of round-count options (10, 25, 50 … ∞). Emits the selected count via `onSelect`. |
| `BetMenuModal` | Scrollable grid of all available bet amounts. Highlights the current bet. Closes automatically on selection. |
| `SettingsModal` | Settings panel with an Info shortcut, a music volume slider, and a sound effect volume slider. Sliders write to `stateSound` in `state-shared`. |
| `ModalGameRules` | Information modal displaying the text rules of the game. Contains a scalable `GameVersion` label at the bottom. |
| `ModalPayTable` | Information modal displaying the symbol payouts, ways-to-win, and features diagram. |
| `ModalBuyBonus` | Container for the Buy Bonus and Extra Chance selection menu. |
| `BonusCards` | Iterateable horizontal grid of `BonusCard`. |
| `FeaturesModal` | (Legacy/Demo layout) Full-screen features overlay. Renders a card per purchasable feature. Includes a mini control bar. |

---

## Content Components (`src/components/`)

| Component | Description |
|---|---|
| `BonusCard` | Individual buy feature item. Includes title, description, price, and CTA. |
| `BonusContentWrapLarge` | Desktop layout wrapper for bonus cards. |
| `BonusContentWrapLandscape` | Mobile landscape wrapper for bonus cards. |
| `BonusContentWrapPortrait` | Mobile portrait wrapper for bonus cards. |
| `BetMenuAmountGrid` | Grid layout component for bet selection. |
| `BetMenuAmountToggle` | Toggle tab component for switching bet menu views. |
| `GameVersion` | Text label returning `stateUi.gameVersion`. |

---

## Base Primitives

Reusable building blocks for composing custom modals.

| Component | Description |
|---|---|
| `BaseOverlay` | Full-screen dimmed backdrop (`bg-black/60 backdrop-blur`). Optional `onclick` to dismiss. All modals wrap this. |
| `BaseModalCard` | Rounded card container. `dark` prop for dark-glass variant; default is white. |
| `BaseModalTitle` | Centered modal heading. Light or dark text variant to match the card. |
| `BaseOptionButton` | Selectable grid button. Cyan border when `selected`. Used by `AutoplayModal` and `BetMenuModal`. |
| `BaseVolumeSlider` | Volume row: icon + range slider. Click icon to mute/restore. Slash drawn over icon when muted. Used by `SettingsModal`. |

---

## i18n

| Export | Description |
|---|---|
| `i18nDerived` | Lazy translation functions for all modal strings (bet, autoplay, confirm, settings, error, bonus, etc.). |
| `messagesMap` | Map of locale → message overrides. Ships with `en` and `fr`. |
