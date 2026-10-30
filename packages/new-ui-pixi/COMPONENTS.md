# new-ui-pixi — Component Reference

The control bar package for game-embedded UI. All label components read directly from `state-shared`; event handlers are passed in as props.

For hands-on layout tweaks (positions, scales, text centering, assets), see [`TUNING.md`](./TUNING.md).

---

## Composer & Layout Components

| Component | Description |
|---|---|
| `UI` | Top-level entry point. Automatically mounts the correct layout (`UIDefault` or `UIReplay`) based on `stateUi.config.mode`. |
| `UIDefault` | The primary composer. Passes all buttons/labels as snippets into `LayoutComponent` depending on orientation. |
| `UIReplay` | Simplified composer for replay mode. |
| `LayoutDesktop` | Canvas coordinate configuration for 16:9 desktop. |
| `LayoutPortrait` | Canvas coordinate configuration for vertical mobile. Adjusts positioning via Tweens when drawer opens. |
| `LayoutLandscape` | Canvas coordinate configuration for horizontal mobile. |
| `LayoutTablet` | Canvas coordinate configuration for iPads/tablets. |
| `ControlBar` | (HTML/Tailwind alternative) Main game control strip. |
| `FreeGamesBar` | (HTML/Tailwind alternative) Replaces `ControlBar` during free spins mode. |

---

## Bar Components

### Labels

| Component | Description |
|---|---|
| `LabelBalance` | Reads `stateBet.balanceAmount` from `state-shared` and formats it as a currency string. |
| `LabelBet` | Displays the current bet cost from `stateBetDerived.betCost()`. Clickable — opens the bet-amount menu via `stateModal`. Shows extra-chance cost when `extraChanceActive` is true. |
| `LabelWin` | Reads `stateBet.winBookEventAmount`. Returns nothing when win is zero or null. |
| `LabelTotalWin` | Shows the cumulative win across all free spins. Used in `FreeGamesBar` only. |
| `LabelFreeSpins` | Displays the remaining free-spin count with a numeric badge. Used in `FreeGamesBar` only. |

### Buttons

| Component | Description |
|---|---|
| `ButtonSpin` | The main action button. Three states: normal spin icon / autoplay-confirm (refresh + play overlay) / autoplay running (displays remaining count). |
| `ButtonAutoplay` | Toggles the autoplay panel. Cyan when autoplay is active (`stateBetDerived.hasAutoBetCounter()`). |
| `ButtonTurbo` | Toggles turbo mode. Reads/writes `stateBet.isTurbo` via `state-shared`. Cyan when active. |
| `ButtonSettings` | Opens/closes the settings panel. Shows a hamburger icon when closed, an X when open. |
| `ButtonBetDecrease` | Decreases bet by one step. Disabled when not idle or at minimum bet. |
| `ButtonBetIncrease` | Increases bet by one step. Disabled when not idle or at maximum bet. |
| `ButtonBonus` | Dual-purpose: cyan "BONUS" opens the features modal; red "DISABLE" deactivates extra chance. |

## Pixi Buttons

These buttons use PixiJS rendering (often wrapping `UiButton` or `UiDoublePress`) and connect directly to `state-shared` interactions.

| Component | Description |
|---|---|
| `ButtonAutoSpin` | Opens the autoplay settings modal. |
| `ButtonBet` | Generic bet button. |
| `ButtonBetAutoSpinsCounter` | Displays the remaining auto spins. |
| `ButtonBetProvider` | Generic context wrapper for bet buttons. |
| `ButtonBuyBonus` | Triggers the buy bonus modal. |
| `ButtonDecrease` | Decreases the bet amount. |
| `ButtonIncrease` | Increases the bet amount. |
| `ButtonDrawer` | Opens a side drawer (mobile layout). |
| `ButtonGameRules` | Opens the game rules modal. |
| `ButtonMenu` | Opens the main menu. |
| `ButtonMenuClose` | Closes the main menu or modal. |
| `ButtonPayTable` | Opens the pay table modal. |

---

## Pixi UI Primitives

These components compose the core building blocks of the `pixi-svelte` integration.

| Component | Description |
|---|---|
| `UiButton` | A core interactive Pixi button, handling hit areas, hover/pointer states, and textures. |
| `UiDoublePress` | A specialised button that requires two taps/clicks to activate (e.g. for confirming a buy). |
| `UiLabel` | A bitmap text label displaying localized strings or dynamic values. |
| `UiFadeContainer` | A container that tweens alpha to fade its children in and out. |
| `UiSprite` | A basic wrapper around Pixi.Sprite. |
| `UiGameName` | A dedicated sprite/label for displaying the game's logo. |

---

## i18n

| Export | Description |
|---|---|
| `i18nDerived` | Object of lazy-evaluated translation functions for all control bar strings (balance, win, bet, turbo, bonus, free spins, total win…). |
| `messagesMap` | Map of locale → message overrides. Ships with `en` and `fr`. |
