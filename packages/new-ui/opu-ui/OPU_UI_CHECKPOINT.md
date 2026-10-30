# OPU-UI → SDK Integration — Checkpoint Doc

> **Date:** 2026-03-04 | **Source plan:** `OPU_UI_INTEGRATION_PLAN.md`

---

## Step 1 — Add Missing UI Components

> All UI features must exist at the *visual level* before SDK wiring begins.

- [x] **1.1** ~~`SoundSwitchButton` in `SlotControls.svelte`~~ — **Sound stays in SettingsModal.** Music + SFX sliders and click-to-mute already implemented there. No bar button needed.
- [x] **1.2** `FreeGamesBar.svelte` — separate component based on main bar; settings + balance + locked trigger-bet on left, turbo centred, TOTAL WIN box + FREE SPINS counter on right. Press **F** in browser to preview.
- [x] **1.3** ~~Auto-spin stop conditions~~ — **Keeping it simple.** No advanced section; existing `AutoplayModal` round selector is sufficient.
- [x] **1.4** `BuyBonusConfirmModal.svelte` — blurred overlay, white card, X close, icon + title + description + price + CONFIRM. Extra Chance: BONUS→DISABLE (red), BET label→EXTRA CHANCE (yellow).
- [x] **1.5** `PaytableModal` — merged into `InfoModal.svelte` as a **PAYTABLE** tab: symbol payout table + special symbols grid.
- [x] **1.6** `GameRulesModal` — merged into `InfoModal.svelte` as a **GAME RULES** tab: how to play, tumble mechanic, bonus features, RTP.
- [x] **1.7** `ErrorModal.svelte` — centred dark box with red border + glow; always shows ERROR; two types: `insufficient-balance` / `reload`. Click anywhere to dismiss. Press **E** or **R** in browser to preview.
- [ ] **1.8** Add **PAYTABLE** + **GAME RULES** rows to `SettingsModal`

---

## Step 2 — Define Clean `SlotControls` Props/Events API

> `SlotControls.svelte` must become a **pure display + event-emitter** — no internal spin/bet/autoplay logic.

- [x] **2.1** Define full `SlotControlsProps` TypeScript type — balance, bet, win, freeSpinsLeft, flags, betAmounts, betModes, modal booleans
- [x] **2.2** Define full `SlotControlsEvents` TypeScript type — onSpin, onBetIncrease/Decrease/Select, onAutoplayStart/Stop, onTurboToggle, onOpenFeatures, onBuyBonus/Confirm, onToggle\*
- [x] **2.3** Remove internal bet/autoplay logic from `SlotControls.svelte` — all logic moves to parent/store
- [x] **2.4** Move `betAmounts` array out of `SlotControls` — will come from `uiStore` → later `stateBet.betAmounts`

---

## Step 3 — Extract State into a Context/Store

> All state currently in `+page.svelte` must move to a store so wiring doesn't touch the route file.

- [x] **3.1** Create `src/lib/stores/uiStore.svelte.ts` — modal toggles + temporary test values (balance, bet, win, etc.)
- [x] **3.2** Create `src/lib/stores/uiHandlers.ts` — all `handleXxx` functions extracted from `+page.svelte`
- [x] **3.3** Refactor `+page.svelte` to consume `uiStore` — route file becomes a thin importer only
- [x] **3.4** Create `src/lib/stores/sdkBridge.ts` skeleton — reads from `state-shared`; forwards to `eventEmitter.broadcast()`

---

## Step 4 — Add Responsive Layout Detection

> Bar position changes fundamentally between portrait, landscape, and desktop. Must handle before wiring.

- [x] **4.1** Detect orientation in `+page.svelte` — `layoutType` state + `resize` listener (portrait · landscape · desktop)
- [x] **4.2** Pass `layoutType` prop to `SlotControls`
- [x] **4.3** Implement landscape layout variant in `SlotControls` — bar may move to right side or condense

---

## Step 5 — Strip Test Scaffolding from `+page.svelte`

> Route file after cleanup should only: import components, import `uiStore`, render `<main>`.

- [ ] **5.1** Remove `Background.png` background from route — test-only; real game supplies its own background
- [ ] **5.2** Remove hardcoded `betAmounts` array and mock state values — moved to `uiStore`
- [ ] **5.3** Remove mock `handleSpin` with `console.log` — replaced by proper event call

---

## Step 6 — Wire to SDK State

> **Only start after Steps 1–5 are fully complete.**

- [ ] **6.1** Add `state-shared` as workspace dependency in `opu-ui/package.json` — `"state-shared": "workspace:*"`
- [ ] **6.2** Replace `uiStore` temp values with live SDK state (see map below)
- [ ] **6.3** Wire all event callbacks to event emitter / state mutations (see map below)
- [ ] **6.4** Replace local modal flags with `stateModal.modal` — e.g. `stateModal.modal = { name: 'buyBonus' }`
- [ ] **6.5** Mount `opu-ui` as HTML overlay on PixiJS canvas — same pattern as `components-ui-html` Modals

### State Replacement Map (Step 6.2)

| `uiStore` field | SDK replacement |
|---|---|
| `balance` | `stateBet.balanceAmount` |
| `bet` | `stateBet.betAmount` |
| `win` | live win state (game-specific) |
| `isIdle` | `stateXstateDerived.isIdle()` |
| `turboEnabled` | `stateUi.turbo` |
| `betAmounts` | `stateBet.betAmounts` |
| `betModes` | `stateBet.betModes` |
| `freeSpinsLeft` | `stateUi.freeSpinCounterShow` + counter source |

### Callback Wiring Map (Step 6.3)

| Callback | SDK call |
|---|---|
| `onSpin` | `eventEmitter.broadcast({ type: 'bet' })` |
| `onAutoplayStart` | `eventEmitter.broadcast({ type: 'autoBet' })` |
| `onTurboToggle` | `stateUi.turbo = !stateUi.turbo` |
| `onBuyBonusConfirm` | `stateBet.activeBetModeKey = modeKey` → broadcast |
| Sound slider changes | `stateSound.volumeValueMusic = value` etc. |
| Sound master toggle | `stateSound.volumeValueMaster = 0 \| 50` |

---

## Overall Progress

```
Step 1 — Missing Components    ███████░░░  7 / 8
Step 2 — Clean API             ██████████  4 / 4
Step 3 — State Decoupling      ██████████  4 / 4
Step 4 — Responsive Layout     ██████████  3 / 3
Step 5 — Strip Scaffolding     ░░░░░░░░░░  0 / 3
Step 6 — SDK Wiring            ░░░░░░░░░░  0 / 5
─────────────────────────────────────────────────
TOTAL                          ███████░░░ 18 / 27
```

> Steps must be done **in order** — do not begin Step 6 until all prior steps are green.
