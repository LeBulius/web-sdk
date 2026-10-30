# OPU-UI → SDK Integration Plan

This document outlines everything that needs to be done to `opu-ui` **before** wiring it to the real game SDK (`state-shared`, `utils-xstate`, `utils-event-emitter`). Follow the steps in order to avoid rework.

---

## Step 1 — Add Missing UI Components

The SDK has UI features your design prototype does not yet implement. These must exist at the **visual level** before wiring.

### 1.1 Sound Toggle Button (Bar)

**What it is:** A button in the main bar (next to turbo) that mutes/unmutes all audio immediately.

**SDK equivalent:** `ButtonSoundSwitch.svelte` — toggles `stateSound.volumeValueMaster` between `0` and `50`.

**What to build:**
- Add a `SoundSwitch` button to `SlotControls.svelte` (icon: speaker on/off)
- When active (volume > 0): shows a speaker icon
- When muted (volume = 0): shows a muted speaker icon with a slash
- Clicking toggles between muted and the previous volume

**Note:** The settings menu sliders (music, sound effects) are _separate_ from this master toggle. The master mute overrides everything.

---

### 1.2 Free Spins Counter Label

**What it is:** During a bonus/free spins round, the bet display area is replaced by a Free Spins counter showing `SPINS LEFT: X`.

**SDK equivalent:** `LabelFreeSpinCounter.svelte` + `stateUi.freeSpinCounterShow` boolean.

**What to build:**
- In `SlotControls.svelte`, where the BET display currently is, add a conditional:
  - If `showFreeSpinCounter` prop is true → show `SPINS LEFT: {freeSpinsLeft}` in cyan
  - Otherwise → show the normal BET display + increase/decrease buttons
- The decrease/increase bet buttons should also be hidden when the free spin counter is showing.

---

### 1.3 Auto-Spin Stop Conditions

**What it is:** In the real SDK, the autoplay modal has stop conditions beyond just round count.

**SDK equivalents:** `AutoSpinsAdvanced.svelte`, `AutoSpinsLossLimit.svelte`, `AutoSpinsSingleWinLimit.svelte`

**What to build:**
- Expand `AutoplayModal.svelte` with a collapsible "Advanced" section below the round selector
- Stop conditions:
  - **Stop on any win** — a simple checkbox toggle
  - **Stop if single win exceeds X** — numeric input (e.g. `$50.00`)
  - **Stop if total loss exceeds X** — numeric input (e.g. `$100.00`)
- The "Start Autoplay" button in the modal should become active only once a round count is selected
- Store these settings locally in the modal state; they will be passed up via `onAutoplayStart` callback

---

### 1.4 Buy Bonus Confirmation Modal

**What it is:** After clicking "BUY" in the Features modal, a second full-screen confirmation dialog appears before the purchase is committed.

**SDK equivalent:** `ModalBuyBonusConfirm.svelte`

**What to build:**
- A new `BuyBonusConfirmModal.svelte` component
- Shows the bonus name, the final price (recalculated as `bet × costMultiplier`), and warns the player
- Two buttons: **CONFIRM** (proceeds with purchase) and **CANCEL** (goes back to Features modal)
- Should have the same full-screen overlay style as the Features modal and Info modal (blurred background + X close button)

---

### 1.5 Paytable Modal

**What it is:** A full-screen panel showing all symbol payouts and game rule tables.

**SDK equivalent:** `ModalPayTable.svelte` — the SDK renders an HTML page inside it (injected by the game).

**What to build:**
- A new `PaytableModal.svelte` component
- Same layout as `InfoModal.svelte` (blurred fullscreen backdrop + centered scrollable box)
- For now, fill with placeholder sections: **Symbol Payouts** table (rows of symbol + 3/4/5-of-a-kind multipliers), **Special Symbols** section
- Trigger it from the settings menu (add a "PAYTABLE" row in `SettingsModal.svelte`)
- Later, the SDK will inject real content

---

### 1.6 Game Rules Modal

**What it is:** A full-screen game rules document.

**SDK equivalent:** `ModalGameRules.svelte` — SDK similarly injects HTML content.

**What to build:**
- A new `GameRulesModal.svelte` component
- Same layout as `InfoModal.svelte`
- Placeholder content: general slot rules, return to player (RTP) statement, bet limits
- Trigger it from the settings menu (add a "GAME RULES" row in `SettingsModal.svelte`)

---

### 1.7 Error Modal

**What it is:** A full-screen error overlay shown when a network error, insufficient balance, or game error occurs.

**SDK equivalent:** `ModalError.svelte`

**What to build:**
- A new `ErrorModal.svelte` component
- Full-screen dark overlay (not blurred)
- Shows an error icon, a title (e.g., `CONNECTION LOST`), a message string, and a **RETRY** button
- Props: `title: string`, `message: string`, `onRetry: () => void`
- Connect it in `+page.svelte` with a `showError` + `errorMessage` state

---

## Step 2 — Define and Enforce the `SlotControls` Props/Events API

Right now `SlotControls.svelte` has a mix of concerns. Before wiring, define a clean contract that maps exactly to what the SDK will provide.

### 2.1 Input Props (what the SDK state feeds in)

```typescript
// All values the parent is responsible for providing
type SlotControlsProps = {
  // Labels
  balance: number;          // stateBet.balanceAmount
  bet: number;              // stateBet.betAmount  
  win: number | null;       // live win amount (null = not showing)
  freeSpinsLeft: number | null; // null = not in free spins mode

  // Game state flags
  isIdle: boolean;              // xstate is idle → spin/bet allowed
  isAutoplayRunning: boolean;
  autoplaySpinsRemaining: number | null;
  turboEnabled: boolean;

  // Configuration
  betAmounts: number[];         // full list from stateBet.betAmounts
  betModes: BetModeData[];      // bonus buy modes from stateBet.betModes

  // Modal visibility (controlled by parent)
  isSettingsOpen: boolean;
  isAutoplayOpen: boolean;
  isBetMenuOpen: boolean;
};
```

### 2.2 Output Events (what the component emits upward)

```typescript
// All callbacks the parent needs to implement
type SlotControlsEvents = {
  onSpin: () => void;                             // → eventEmitter 'bet'
  onBetIncrease: () => void;                      // → eventEmitter 'resumeBet' or bet index +1
  onBetDecrease: () => void;                      // → eventEmitter 'resumeBet' or bet index -1
  onBetSelect: (amount: number) => void;          // → stateBet.betAmount = amount
  onAutoplayStart: (rounds: number|null, stopConditions: AutoplayStopConditions) => void;
  onAutoplayStop: () => void;
  onTurboToggle: () => void;                      // → stateUi.turbo = !stateUi.turbo
  onOpenFeatures: () => void;                     // → stateModal.modal = 'buyBonus'
  onBuyBonus: (modeKey: string) => void;          // → stateBet.activeBetModeKey = modeKey
  onBuyBonusConfirm: (modeKey: string) => void;   // after confirm dialog
  onToggleSettings: () => void;
  onToggleAutoplay: () => void;
  onToggleBetMenu: () => void;
};
```

> [!IMPORTANT]
> Remove all internal spin/bet/autoplay *logic* from `SlotControls.svelte`. It should be purely a **display + event emitter**. No `betAmounts` array should live inside it.

---

## Step 3 — Extract State into a Context/Store

Currently all state lives in `+page.svelte`. This will make wiring painful because you'd be modifying the route file directly.

### 3.1 Create a `uiStore.svelte.ts` file

Location: `src/lib/stores/uiStore.svelte.ts`

```typescript
// All local UI state that the bar manages independently
// (i.e., modal open/close toggles, test balance, etc.)
export const uiStore = $state({
  showSettings: false,
  showAutoplay: false,
  showBetMenu: false,
  showFeatures: false,
  showInfo: false,
  showPaytable: false,
  showGameRules: false,
  showError: false,
  errorTitle: '',
  errorMessage: '',

  // TEMPORARY: test values — replaced by state-shared on wiring
  balance: 1000,
  bet: 1.0,
  win: null as number | null,
  freeSpinsLeft: null as number | null,
  isIdle: true,
  isAutoplayRunning: false,
  autoplaySpinsRemaining: null as number | null,
  turboEnabled: false,
});
```

### 3.2 Move all handlers out of `+page.svelte`

Create `src/lib/stores/uiHandlers.ts` containing all the `handleXxx` functions. Import and use from both `+page.svelte` and any future SDK wrapper.

### 3.3 The SDK wrapper will be a thin file

When wiring time comes, you create `src/lib/stores/sdkBridge.ts` that:
- Reads from `state-shared` (replaces the `TEMPORARY` values above)
- Forwards callbacks to `eventEmitter.broadcast()`

This way `+page.svelte` and `SlotControls.svelte` never need to change during wiring.

---

## Step 4 — Add Responsive Layout Detection

The SDK uses 4 layout types. Your bar needs to at least handle **portrait vs landscape** since these fundamentally change the bar's position.

### 4.1 Detect orientation in `+page.svelte`

```typescript
// Detect layout on mount and on resize
let layoutType: 'portrait' | 'landscape' | 'desktop' = $state('desktop');

$effect(() => {
  const update = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (h > w) layoutType = 'portrait';
    else if (w < 1024) layoutType = 'landscape';
    else layoutType = 'desktop';
  };
  update();
  window.addEventListener('resize', update);
  return () => window.removeEventListener('resize', update);
});
```

### 4.2 Adjust the bar based on layout

- **Portrait / Desktop:** Bar at bottom (current behaviour)
- **Landscape (phone on side):** Bar may need to move to the right side or be condensed

Pass `layoutType` as a prop to `SlotControls.svelte` and apply conditional classes/styles.

---

## Step 5 — Strip Test Scaffolding from `+page.svelte`

Once Steps 1–4 are done, the route file should only contain:

- Import of the component tree
- Import of `uiStore`
- The `<main>` with background image
- The rendered components (no mock logic inside the route)

**Items to remove:**
- Hardcoded `betAmounts` array → move into `uiStore` (later replaced by `stateBet.betAmounts`)
- Mock `balance = $state(999.9)` etc. → move into `uiStore`
- `handleSpin` fake `console.log` → replace with proper event call
- Background image (`Background.png`) → this is test-only; real game has its own background

---

## Step 6 — Wire to SDK State

Only start this step once Steps 1–5 are complete.

### 6.1 Install/import `state-shared`

The package is already in the monorepo. Add it as a dependency in `opu-ui/package.json`:
```json
"dependencies": {
  "state-shared": "workspace:*"
}
```

### 6.2 Replace `uiStore` temporary values

| `uiStore` field | Replaced by |
|---|---|
| `balance` | `stateBet.balanceAmount` |
| `bet` | `stateBet.betAmount` |
| `win` | live win state (game-specific) |
| `isIdle` | `stateXstateDerived.isIdle()` |
| `turboEnabled` | `stateUi.turbo` |
| `betAmounts` | `stateBet.betAmounts` |
| `betModes` | `stateBet.betModes` |
| `freeSpinsLeft` | `stateUi.freeSpinCounterShow` + counter source |

### 6.3 Wire event callbacks

| Callback | SDK call |
|---|---|
| `onSpin` | `eventEmitter.broadcast({ type: 'bet' })` |
| `onAutoplayStart` | `eventEmitter.broadcast({ type: 'autoBet' })` |
| `onTurboToggle` | `stateUi.turbo = !stateUi.turbo` |
| `onBuyBonusConfirm` | `stateBet.activeBetModeKey = modeKey`, then broadcast |
| Sound slider changes | `stateSound.volumeValueMusic = value` etc. |
| Sound master toggle | `stateSound.volumeValueMaster = 0 or 50` |

### 6.4 Wire modal state

Replace local `showFeatures`, `showSettings` etc. with `stateModal.modal`:

```typescript
// e.g., instead of showFeatures = true:
stateModal.modal = { name: 'buyBonus' };

// instead of showSettings = true:
stateModal.modal = { name: 'settings' };
```

### 6.5 Register as the UI layer

In the game's entry point, import and mount the `opu-ui` SlotControls as a Svelte component overlaid on the PixiJS canvas (same pattern as `components-ui-html` Modals).

---

## Summary Checklist

### Step 1 — Missing Components
- [ ] `SoundSwitchButton` in bar
- [ ] `FreeSpinCounter` label (replaces bet display)
- [ ] Auto-spin stop conditions in `AutoplayModal`
- [ ] `BuyBonusConfirmModal.svelte`
- [ ] `PaytableModal.svelte`
- [ ] `GameRulesModal.svelte`
- [ ] `ErrorModal.svelte`
- [ ] Add Paytable + Game Rules rows in `SettingsModal`

### Step 2 — Clean Component API
- [ ] Define full `SlotControlsProps` type
- [ ] Define full `SlotControlsEvents` type
- [ ] Remove internal bet/autoplay logic from `SlotControls.svelte`
- [ ] Move `betAmounts` out of `SlotControls`

### Step 3 — State Decoupling
- [ ] Create `uiStore.svelte.ts`
- [ ] Create `uiHandlers.ts`
- [ ] Refactor `+page.svelte` to use the store
- [ ] Prepare `sdkBridge.ts` skeleton

### Step 4 — Responsive Layout
- [ ] Detect orientation in `+page.svelte`
- [ ] Pass `layoutType` to `SlotControls`
- [ ] Implement landscape layout variant

### Step 5 — Remove Test Scaffolding
- [ ] Remove `Background.png` background from route
- [ ] Remove hardcoded arrays and values from route
- [ ] Remove mock `handleSpin` console.log

### Step 6 — SDK Wiring
- [ ] Add `state-shared` dependency
- [ ] Replace temporary store values with SDK state
- [ ] Wire all event callbacks to event emitter / state
- [ ] Wire modal state to `stateModal.modal`
- [ ] Mount as HTML overlay on PixiJS canvas
