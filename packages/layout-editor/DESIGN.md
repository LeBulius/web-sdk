# Phase 1 (2026-10-21)

The sections below are the starter design. Phase 1 keeps its rule that the editor writes the store and never PIXI, and that `vite-plugin-layout` saves with `POST /__layout` and pushes external edits as the `layout-editor:update` HMR event (the handler returns `[]`, so Vite does not reload the page).

Phase 1 replaces the starter's four layout types and the `"*"` bucket. The file is `builder.json` with exactly seven Stake viewports (`desktop`, `laptop`, `popoutL`, `popoutS`, `mobileL`, `mobileM`, `mobileS`). Only overrides are stored. Resolution is formula defaults, then ancestors oldest-first, then the active key. Drop-in wiring is in `README.md`.

# Layout editor for Stake Engine web-sdk: design

**Status:** starter implementation is in this folder. It type-checks and has been run end to end
in Storybook on a migrated copy of `apps/ways` (see §12).
**Target:** "Locked In", a 4-reel tumble ways game (rows `[3,5,5,3]`) built on
StakeEngine/web-sdk @ `1843d60` (2025-11-28).
**Scope:** layout only. Per named node and per layout type (`desktop | tablet | landscape |
portrait`) you can edit `x, y, scale, anchor, pivot, rotation, alpha, visible`, plus numeric
tunables (symbol size, board offset, tween timings). Game logic, bookEvents and emitterEvents
stay in code.

---

## 1. What the web-sdk actually does (findings that shape the design)

| # | Finding | Where | Consequence |
|---|---------|-------|-------------|
| F1 | `createLayout()` derives `layoutType()` from `innerWidth/innerHeight` (`svelte/reactivity/window`), and uses ratio and size breakpoints: ratio ≥ 1.3 is "longWidth", ≤ 0.8 is portrait, anything in between is tablet; longWidth with min side ≤ 480 is landscape, otherwise desktop. It also exposes `mainLayout()` (design frame: x/y = canvas centre, `scale = min(canvasW/w, canvasH/h)`, `anchor 0.5`), `mainLayoutStandard()`, `canvasSizes()`, `isStacked()`, background helpers and `stateLayout.showLoadingScreen`. | `packages/utils-layout/src/createLayout.svelte.ts`, `src/context.ts` (`setContextLayout/getContextLayout`, key `@@layout`) | The 4 layout types are the schema keys. Layout type comes from the window and can't be overridden from outside, so previewing another type means changing the window size (iframe host, §5.6). |
| F2 | Games configure design sizes per layout type in `createLayout({ mainSizesMap })`. In ways: desktop 1422×800, tablet 1000×1000, landscape 1600×900, portrait 800×1422. | `apps/ways/src/game/stateLayout.ts` | Positions in layout.json are in design-frame units (the parent's local space). They don't depend on resolution. |
| F3 | `<MainContainer>` places children in the design frame: an outer Container gets x/y alignment and an inner one gets `mainLayout` x/y/scale plus `pivot = anchorToPivot(anchor 0.5, w×h)`. Its Props **omit** `x, y, scale, pivot`. There is also a `debug` flag that draws the frame. | `packages/components-layout/src/components/MainContainer.svelte` | Don't target MainContainer itself. Target its children. Snapping frame `'main'` = `mainLayout().width/height` (`'mainStandard'` for the HUD). |
| F4 | pixi-svelte components create the PIXI object once and copy every defined prop onto it with `propsSyncEffect` (`target[key] = props[key]`, **skipping `undefined`**). Container props = `Omit<PIXI.ContainerOptions,'children'> & {children: Snippet}` (children required). Sprite props = `PIXI.SpriteOptions & {key}`. Components don't expose the PIXI instance (no bind/ref). | `packages/pixi-svelte/src/lib/utils.svelte.ts`, `components/Container.svelte`, `BaseSprite.svelte`, `Sprite.svelte`, `Graphics.svelte`, `Rectangle.svelte` | (a) Any PIXI option works as a prop, **including `label`** (PixiJS 8 `findMixin`), and that's how the editor finds nodes. (b) Removing an override needs an explicit neutral value, otherwise the old value stays on the object (`NEUTRAL_PROPS`). (c) Overrides must go through props, not by mutating PIXI objects, or the next prop sync overwrites them. |
| F5 | Parent/child wiring: `createContextParent(container)` with `addToParent()` → `onMount(parent.addChild(node); parent.sortChildren())` and `node.destroy()` on unmount. The app is in `getContextApp().stateApp.pixiApplication` (`createApp()` `$state`). `InitialiseApplication` sets `resizeTo: window`, `autoDensity`, `preference: 'webgpu'`, and `renderer.events.autoPreventDefault = false`. | `packages/pixi-svelte/src/lib/context.svelte.ts`, `createApp.svelte.ts`, `components/InitialiseApplication.svelte`, `InitialiseParent.svelte`, `App.svelte` | The overlay is a direct child of `<App>`, so its parent is `app.stage`. It uses `zIndex` (PixiJS 8 turns on `sortableChildren` automatically when it's set) so it stays above game nodes mounted later. |
| F6 | PixiJS **8.8.1** (pinned in pixi-svelte). These APIs were checked in the installed typings: `getChildrenByLabel(label, deep)`, `getChildByLabel`, `label?: string`, `getBounds().containsPoint()`, `toLocal/toGlobal/getGlobalPosition`, `renderer.events.mapPositionToPoint()`, `renderer.events.features {click, move, globalMove, wheel}`, `Graphics.rect/circle/poly/stroke/fill`. Pixi binds `pointerdown` on the canvas and `pointerup` on `globalThis`, both in the capture phase. | `node_modules/.pnpm/pixi.js@8.8.1/.../lib/scene/container/container-mixins/findMixin.d.ts`, `events/EventSystem.js` | Swallowing DOM events can't stop Pixi's window-level `pointerup` (which would fire `onpointerup` on e.g. `PressToContinue`). So the editor turns Pixi interaction off with `events.features` while editing. |
| F7 | Sample games hard-code positions as **formulas**, not literals: `boardLayout()` = centre of `mainLayout()` with pivot = half of `BOARD_SIZES` (`SYMBOL_SIZE * dims`). `BoardContainer`, `BoardFrame` (×`POSITION_ADJUSTMENT 1.01`), `Win`, `FreeSpinCounter` (board-relative) and `Anticipation` all read `boardLayout()`. `Board.svelte` renders `<BoardContainer>` **twice** (static and animated `BoardContext`). | `apps/ways/src/game/stateGame.svelte.ts`, `constants.ts`, `components/Board*.svelte`, `Win.svelte`, `FreeSpinCounter.svelte` | Defaults must stay as live formulas (`defaults: () => …`). Shared values need a module-scope `resolveLayout()` so dependents follow. One id can map to several PIXI instances. |
| F8 | `SYMBOL_SIZE` is a module constant, captured at init by `createReelForCascading({ symbolHeight })`, while `reelState.spinOptions` is a function that is re-read every spin. | `packages/utils-slots/src/createReelForCascading.svelte.ts`, `apps/ways/src/game/stateGame.svelte.ts` | Tween timings can be live tunables (getters). Symbol size can't without refactoring, so it's a `reload: true` tunable. |
| F9 | `FadeContainer` spreads rest props into `<Container>` but sets `alpha` itself, and **unmounts** children while `alpha.current === 0`. | `packages/components-pixi/src/components/FadeContainer.svelte` | Overriding `alpha` on FadeContainer nodes does nothing. Hidden UI (FS counter, win) is only editable while shown, so use the Storybook emitterEvent and book stories to get it on screen. |
| F10 | The HUD is in a shared package: `UI.svelte` → `UIDefault` → `LayoutDesktop/Tablet/Landscape/Portrait.svelte`, with literal numbers inside `<MainContainer standard alignVertical="bottom">` (e.g. `x={160 + 150 * 5} scale={0.8}`). | `packages/components-ui-pixi/src/components/Layout*.svelte`, `constants.ts` | Editing the HUD means migrating SDK package files (Phase 3). The same `useLayout` works there because `getContextLayout()` is available. |
| F11 | Storybook 9.0.15 with `@storybook/sveltekit` and `addon-svelte-csf`. The shared config is in `packages/config-storybook/src/{main,preview}.ts` (viewports incl. "stake iframe 1200×675" and "stake mini 400×225"). Stories: `COMPONENTS/<Game>`, `MODE_BASE/book`, `MODE_BASE/bookEvent`, `MODE_BONUS/*` using `StoryGameTemplate` (`skipLoadingScreen`, Action button) from `packages/components-storybook`. The Storybook preview uses the app's Vite config. | `apps/ways/.storybook/*`, `apps/ways/src/stories/*.stories.svelte` | Storybook is the best place to edit: no RGS needed, any game state can be replayed, and the viewport toolbar switches layout types. The plugin's middleware works inside Storybook (checked: `GET /__layout` → 200). |
| F12 | Vite config comes from the JS-only `config-vite` (`sveltekit()`, `lingui()`, `bundleStrategy: 'inline'` in config-svelte). Its comment says not to convert it to TS (vitejs/vite#5370). `config-ts/base.json` has `resolveJsonModule: false` and `preserveSymlinks: true`. `turbo dev` depends on `^build`, and only `pixi-svelte` has a build step (`svelte-package` → dist; its `types` point to dist). | `packages/config-vite/index.js`, `packages/config-svelte/index.js`, `packages/config-ts/base.json`, `turbo.json` | Import the plugin by relative path. Ship layout.json through a virtual module (no JSON-import tsconfig change). For type-checking outside turbo, build pixi-svelte first. |

## 2. Architecture

```
            ┌────────────────────────── production + dev ───────────────────────────┐
layout.json ─► vite-plugin-layout ─► virtual:layout-editor/data ─► store.svelte.ts ($state)
                                                                          │
     component formula defaults ──► useLayout(id, () => defaults) ──► merged props + label
     module formula defaults    ──► resolveLayout(id, () => defaults) ─► merged values
     defineTunable(id, {default}) ──► () => number                        │
                                                                          ▼
                                         pixi-svelte <Container {...layout.props}> ─► PIXI
            └────────────────────────────────────────────────────────────────────────┘
            ┌──────────────────────────────── dev only ──────────────────────────────┐
 <LayoutEditorMount/> ─(dynamic import, DEV)─► EditorOverlay.svelte
     registry (ids, frames, editable props) ◄── filled by useLayout/resolveLayout/defineTunable
     stage.getChildrenByLabel(id) → bounds → hit test / handles (pixi-svelte Graphics, zIndex 1e6)
     writes ─► store mutations ─► (same reactive path as prod) ─► PIXI
     Tweakpane panel ◄──► store;   history (undo/redo);   Ctrl+S ─► POST /__layout ─► layout.json
     disk edits ─► handleHotUpdate ─► ws custom event 'layout-editor:update' ─► store (no reload)
            └────────────────────────────────────────────────────────────────────────┘
```

Rule: **the editor never writes to PIXI objects.** It writes to the store, and the same reactive
path that applies layout.json in production updates the screen. What you see while editing is
what ships.

## 3. layout.json schema (v1)

```jsonc
{
  "$schema": "../../../../packages/layout-editor/layout.schema.json",
  "version": 1,
  "designSizes": { "desktop": { "width": 1422, "height": 800 } },   // informational only
  "nodes": {
    "<nodeId>": {
      "*":         { /* NodeProps applied to every layout type */ },
      "desktop":   { "x": 711, "y": 390 },
      "portrait":  { "x": 400, "y": 600, "scale": 1.15 },
      "tablet":    { "visible": false }
    }
  },
  "tunables": {
    "<tunableId>": { "*": 3.5, "portrait": 3.0 }
  }
}
```

- `NodeProps = { x?, y?, scale?: number|{x,y}, anchor?: number|{x,y}, pivot?: number|{x,y}, rotation?: radians, alpha?, visible? }`.
  Keys match PIXI property names, so the merged object spreads straight onto pixi-svelte components.
- **Merge order:** formula defaults < `nodes[id]['*']` < `nodes[id][activeLayoutType]`. Overrides
  **replace** values; they aren't offsets. Overrides are sparse, so a node with no entry keeps its
  formula.
- **Tunables:** `tunables[id][layoutType] ?? tunables[id]['*'] ?? definition.default`.
- Values are in the parent's local space, i.e. the same numbers you'd write in the `.svelte` file.
- Types and validation live in `src/layout.schema.ts` (`validateLayoutFile`, `sortLayoutFile` for
  stable diffs). The JSON Schema in `layout.schema.json` is for editor autocompletion.
- Node ids: dotted, stable, game-specific (`board`, `winAmount`, `ui.buttonBet`,
  `tumble.banner`). They're the contract between code and JSON.

## 4. Runtime API (ships to production; small, no editor code)

```ts
// component scope (top level of <script>): registers with the editor (ref-counted), returns props incl. label
const layout = useLayout('freeSpinCounter', () => ({ x: …formula…, y: …, scale: 1 }), {
  frame: 'main',                               // snapping frame: 'main' | 'mainStandard' | 'canvas' | 'none' | {width,height}
  editable: ['x', 'y', 'scale', 'rotation'],   // what the panel/handles may change
});
<FadeContainer {show} {...layout.props}>       // props = defaults merged with JSON, plus label: 'freeSpinCounter'

// module scope (derived state shared by many components); safe inside $derived/templates
const { x, y, scale } = resolveLayout('board', () => ({ x: mainLayout().width * 0.5, y: …, scale: 1 }));
// …then put label="board" on the node that receives exactly these x/y

// tunables
const fallInSpeed = defineTunable('spin.symbolFallInSpeed', { default: 3.5, min: 0.5, max: 10, step: 0.1 });
fallInSpeed();               // reactive number
tunable('board.reelGap', 6); // ad-hoc read

bindLayoutType(stateLayoutDerived.layoutType); // once, in stateLayout.ts (useLayout also auto-binds from context)
```

Implementation notes (`src/useLayout.svelte.ts`, `src/store.svelte.ts`, `src/registry.ts`):
- `useLayout` uses `$derived` over `defaults()` + store + `activeLayoutType()`. When the window
  changes layout type, or the JSON or the formula inputs change, the props recompute and
  pixi-svelte applies them.
- `NEUTRAL_PROPS` reset (F4): any key that was ever overridden this session, or is overridden for
  another layout type, gets a neutral value (`x/y 0, scale 1, rotation 0, alpha 1, visible true`)
  when neither the formula nor the active override provides it. This keeps layout-type switches
  and "reset override" correct.
- The registry is deliberately **not** Svelte state. `resolveLayout` and tunables are called
  inside `$derived` and templates, where mutating `$state` throws `state_unsafe_mutation`. The
  registry is a plain `Map` with a microtask-batched `subscribe()` for the imperative panel.

## 5. Dev overlay (`src/EditorOverlay.svelte` + `src/editor/*`)

### 5.1 Mounting
`<LayoutEditorMount />` is the last child of `<App>` in `Game.svelte`. It computes
`const overlay = import.meta.env.DEV ? import('./EditorOverlay.svelte') : undefined` and renders
`{#await overlay then m}<m.default/>{/await}`. It needs pixi-svelte's app context and parent
context (the parent must be `app.stage`; it warns otherwise).

### 5.2 Finding nodes
Ids come from the registry. PIXI objects come from `app.stage.getChildrenByLabel(id, true)`.
`useLayout` adds `label: id` to the props, and pixi-svelte copies it onto the PIXI object (F4).
Several instances can share an id (`board` → 2 × BoardContainer); they're edited together.
Visibility check: walk parents for `visible && alpha > 0`.

### 5.3 Selection and hit testing
A DOM `pointerdown` on the canvas is mapped to Pixi global coords with
`renderer.events.mapPositionToPoint`. Candidates are all registered, shown nodes whose
`getBounds().containsPoint(x, y)`. The **smallest bounds area wins**, and Alt+click cycles
through overlaps. Hovering draws a white box.

### 5.4 Handles and drawing
A pixi-svelte `<Container label="__layout-editor__" zIndex={1e6} eventMode="none">` holds a
`<Graphics draw>`. While enabled it redraws every ticker frame (bounds move during tumbles and
tweens). It draws the selection bounds (cyan), an origin cross at `getGlobalPosition()`, 4 corner
scale handles, a rotate knob 28 px above the box, the design-frame outline (magenta) and the
active snap guides (yellow).
- **Move:** `parent.toLocal(pointer)` delta added to the start `x/y`. This works under any parent
  transform (MainContainer scale, board pivot).
- **Scale:** distance-to-origin ratio × start scale (uniform; stored as `{x,y}` if they differ).
- **Rotate:** angle delta around the origin, snapped to 15° unless Shift is held.
- Arrow keys nudge 1 px, Shift+arrow 10 px.

### 5.5 Snapping (`src/editor/snapping.ts`)
Snapping happens in the parent's local space. Targets are the edges and centre of the node's
frame (`'main'` = `mainLayout().width/height`, etc.). The threshold is 8 screen px ÷ the
parent's world scale. There's an optional grid (panel). Shift turns snapping off. MVP snaps the
node origin; edge-to-edge and sibling guides are Phase 2.

### 5.6 Layout-type switcher (`src/editor/frames.ts`)
Edits always target the **active** layout type, or `'*'` when "write to: all layouts" is
selected. Because of F1 and F5 (window-driven layout type, `resizeTo: window`), the only truthful
preview is a different window size:
- Standalone dev: the "preview size" list opens `/__layout-frames` (served by the plugin). It
  iframes the game at preset sizes (1200×675 → desktop, 1000×900 → tablet, 844×390 → landscape,
  400×225 (stake mini) → landscape, 390×844 → portrait), scaled to fit with CSS. Inside the
  frame, preset changes are sent via `postMessage`.
- Storybook: use the viewport toolbar (it already iframes the story).
- Alternative (not implemented): a 5-line dev-only `overrideCanvasSizes` in
  `createLayout.svelte.ts`. That forks utils-layout, and the canvas would still be window-sized.

### 5.7 Panel (Tweakpane 4.0.5, `src/editor/panel.ts`)
Tweakpane is imported dynamically. Folders:
- **Editor:** active layout (read-only), write-to scope, preview size, snap toggles and grid,
  Undo/Redo/Save, status (instance count, overridden keys, dirty/saved).
- **Node:** node dropdown (all registered ids, including unmounted ones) and bindings for the
  node's `editable` props. Rotation is shown in degrees. "Reset override (this scope)".
- **Tunables:** one slider per `defineTunable` (with min/max/step) and a reset button. Reload-only
  tunables are labelled `(reload)`.

The panel reads actual PIXI values about 10×/s, but not while the user is dragging a slider.
Writes use `ev.last` to group a slider gesture into one undo step.

### 5.8 Undo stack (`src/editor/history.ts`)
Snapshot based (layout.json is a few KB): `begin()` on pointerdown or slider grab, `commit()` on
release (only if something changed), limit 200. Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y. Undoing
back to the saved state clears "unsaved".

### 5.9 Input isolation
While editing, `renderer.events.features.{click,move,globalMove,wheel} = false`. This is Pixi's
own switch, so game buttons, `OnPressFullScreen` and `PressToContinue` don't react. Handled keys
are swallowed in a window **capture** listener, so `components-shared/EnableHotkey` never sees
them. **Space still reaches the game**, so you can spin or tumble while editing. Press backquote
to toggle; the enabled state persists in `sessionStorage`.

## 6. Vite plugin (`src/vite-plugin-layout.ts`)
- `virtual:layout-editor/data`: `export default <layout.json>`, `endpoint`, `framesPath`. Used in
  both dev and build; a missing file is treated as empty.
- `GET /__layout` returns the file. `POST /__layout` requires `content-type: application/json`,
  a body ≤ 1 MB and `validateLayoutFile`. It writes sorted, tab-indented JSON via tmp file +
  rename and invalidates the virtual module. Tested: invalid → 400 with a message, valid → 200
  and the file is rewritten.
- `GET /__layout-frames`: static multi-viewport host page.
- `handleHotUpdate`: our own write (content equals the last POST) is ignored. Any other disk change
  (hand edit, git checkout) is sent as ws custom event `layout-editor:update` and the store
  replaces its data, unless there are unsaved edits, in which case it warns. It always returns `[]`,
  so layout.json never causes a full page reload.
- Security: the endpoint only ever writes the one configured file and validates its shape. Note
  that the sample `dev` script runs `vite dev --host`, which exposes the dev server and this
  endpoint on your LAN.

## 7. Migration (incremental, one node at a time)

Pattern: move the existing literal or formula into `defaults` unchanged, spread the result, and
add the label. With an empty layout.json, behaviour is identical.

### 7.1 Component node: `apps/ways/src/components/FreeSpinCounter.svelte`
Before:
```svelte
const position = $derived({ x: boardLayout().x - boardLayout().width * 0.5 - panelSizes.width - SYMBOL_SIZE * 0.7,
                            y: boardLayout().y - boardLayout().height * 0.5 });
const scale = 1;
…
<MainContainer>
	<FadeContainer {show} {...position} {scale}>
```
After:
```svelte
import { useLayout } from 'layout-editor';
const layout = useLayout('freeSpinCounter', () => ({ ...position, scale }), {
	frame: 'main',
	editable: ['x', 'y', 'scale', 'rotation'], // alpha is owned by FadeContainer (F9)
});
…
<MainContainer>
	<FadeContainer {show} {...layout.props}>
```

### 7.2 Shared module value: `boardLayout()` in `apps/ways/src/game/stateGame.svelte.ts`
```ts
const boardLayout = () => {
	const { x, y, scale } = resolveLayout('board', () => ({
		x: stateLayoutDerived.mainLayout().width * 0.5,
		y: stateLayoutDerived.mainLayout().height * 0.5,
		scale: 1,
	}), { frame: 'main', editable: ['x', 'y', 'scale'] });
	return { x, y, scale, anchor: { x: 0.5, y: 0.5 }, pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 }, ...BOARD_SIZES };
};
```
In `BoardContainer.svelte`, add `label="board"` and `scale={boardLayout().scale}`. BoardFrame,
Win and FreeSpinCounter follow the board because they read `boardLayout()`. Caveat: `BoardFrame`
sizes itself from `boardLayout().width` and doesn't apply `scale`. When the board scale is
overridden, wrap the frame in a scaled container or give it its own node.

### 7.3 Tunables: `apps/ways/src/game/constants.ts`
```ts
const symbolFallInSpeed = defineTunable('spin.symbolFallInSpeed', { default: 3.5, min: 0.5, max: 10, step: 0.1 });
export const SPIN_OPTIONS_DEFAULT = { ...SPIN_OPTIONS_SHARED, get symbolFallInSpeed() { return symbolFallInSpeed(); }, … };
export const symbolSizeTunable = defineTunable('board.symbolSize', { default: 120, min: 60, max: 240, step: 1, reload: true });
```
Getters keep it live because `reel.reelState.spinOptions()` is re-read every spin (F8). Careful:
spreading an object that has getters evaluates them once at spread time.

All of the above (plus `Win.svelte` → `winAmount`, `Game.svelte` mount, `stateLayout.ts`
binding, `vite.config.js`) is in `examples/ways/` and `examples/ways-migration.diff`.

### 7.4 Locked In specifics (rows [3,5,5,3])
- Suggested nodes: `board`, `boardFrame`, `reelHouse.short` (outer reels), `winAmount`,
  `tumble.banner`, `tumble.multiplier`, `freeSpinCounter`, `logo`, `lockedIn.*` (feature
  widgets), and later `ui.*` (Phase 3).
- Suggested tunables: `board.symbolSize` (reload), `board.reelGap`,
  `board.shortReelOffsetRows` (default 1 = (5−3)/2 symbol offset for reels 1 and 4),
  `spin.*`/`tumble.*` timings, read through getters in `spinOptions()`.
- Keep per-reel x/y as code formulas driven by those tunables (`getSymbolX(reel)` +
  `shortReelOffsetRows * symbolSize`). Don't make individual symbols layout nodes.

## 8. Production stripping
`LayoutEditorMount` is the only editor entry point, and it's gated on `import.meta.env.DEV`.
That's statically `false` in builds, so the dynamic import is dead code and is dropped together
with EditorOverlay, panel, history, frames and Tweakpane. `saveLayout` and `endpoint` are
tree-shaken because nothing in production references them. `import.meta.hot` branches are removed.
**Checked:** `vite build` of the migrated ways copy. The bundle contains none of `Layout editor`,
`tweakpane`, `__layout-editor__`, `layout-editor:enabled` or `/__layout`, but does contain the
layout data (`freeSpinCounter`, `winAmount`, `spin.symbolFallInSpeed`) that production needs.
(`vite build` keeps running after "✔ done" in this repo. That also happens with the unmodified
`apps/ways`, so it existed before these changes.)

## 9. Storybook
No Storybook changes are needed. Stories render `<Game />` and the editor mounts with it. In a
story, press backquote, use the viewport toolbar to change layout type, use emitterEvent and book
stories to get transient UI (win, FS counter, tumble banners) on screen, then edit and save. Ctrl+S
works because Storybook's Vite server runs the plugin middleware. Optionally add a
`LAYOUT/<layout type>` story file with fixed viewports per layout type.

## 10. Known limitations and gotchas
1. Only nodes migrated to `useLayout`/`resolveLayout` are editable (by design: incremental).
2. The `label` must sit on the PIXI node that receives exactly the resolved x/y/scale. Nodes that
   apply extra math (e.g. `BoardFrame`'s ×1.01) make drag deltas wrong if labelled.
3. FadeContainer alpha and unmount behaviour (F9). MainContainer can't be targeted (F3).
4. One id across differently-parented instances: deltas are computed on the first shown instance.
5. Reload-only tunables need a manual reload (the panel labels them).
6. The HUD is in `components-ui-pixi` and isn't migrated (Phase 3).
7. Type-check noise: with `preserveSymlinks: true` (config-ts), svelte-check can't resolve vite's
   `rollup` types for the plugin file. Use `tsconfig.plugin-check.json`.
8. Two people editing layout.json at the same time: last save wins (the HMR conflict warning only
   protects unsaved local edits).

## 11. Phase plan and estimates (one dev already familiar with the SDK)

| Phase | Content | Estimate |
|------|---------|----------|
| 0 | **Integrate starter** into Locked In: package, plugin, mount, bindLayoutType, empty layout.json, migrate `board` + 1 UI node, smoke test in Storybook on 3 viewports | 0.5 day |
| 1 | **Migrate Locked In game nodes** (~15–25: board/frame/short-reel housings, win display, tumble banner and multiplier, FS intro/outro/counter, logo, feature widgets) and tunables for symbol size, gaps, short-reel offset, spin and tumble timings (getter pattern); fill layout.json for all 4 layout types | 1–1.5 days |
| 2 | **Editor polish**: bounds-edge and sibling smart guides, multi-select, "copy layout type A → B", hierarchy/tree list with an unmounted-node indicator, "force show" for FadeContainer nodes via an emitterEvent hook, reload button for reload-tunables, keyboard help overlay | 2–3 days |
| 3 | **HUD**: migrate `packages/components-ui-pixi` `LayoutDesktop/Tablet/Landscape/Portrait.svelte` literals to `ui.*` ids (frame `'mainStandard'`); decide fork vs upstream PR | 1–2 days |
| 4 | **Hardening**: vitest for `resolveNodeProps`/`validateLayoutFile`/history; CI step that validates layout.json and greps the prod bundle for editor strings; README for artists | 1 day |
| | **Total** | **≈ 5.5–8 days** (Phase 0+1 ≈ 2 days gives a usable tool) |

## 12. Verification done for this starter
- Environment: web-sdk @ `1843d60`, Node 20.19 (repo asks for ≥ 22.16; installed with
  `engine-strict=false`), pnpm 10.5.0, `pnpm build` of pixi-svelte (needed for its dist types).
- `svelte-check` on `packages/layout-editor`: 0 errors except 10 preserveSymlinks artifacts in
  `vite-plugin-layout.ts`. `tsc -p tsconfig.plugin-check.json`: 0 errors.
- `svelte-check` on the migrated ways copy (`apps/ways-layout-test`): the same 93 errors as the
  unmodified `apps/ways` plus the 10 plugin artifacts. No errors in migrated files.
- `vite dev`: GET/POST `/__layout` (400 on invalid, 200 + file rewritten on valid),
  `/__layout-frames` 200, virtual module served with fresh data.
- Storybook (`COMPONENTS/<Game> › preSpin`, headless Chrome 1200×675): backquote opens the panel
  (active layout `desktop`). Clicking the board selected `board` (2 instances). A drag moved board
  and frame together and snapped y to the frame centre (400). Undo restored the JSON values.
  Ctrl+S wrote layout.json, and after a page reload the values persisted. The Tunables folder
  listed `board.symbolSize (reload)`, `spin.symbolFallInInterval` and `spin.symbolFallInSpeed`.
  No page errors.
- Not exercised yet: rotate and scale handle drags, the `/__layout-frames` postMessage round trip,
  the HMR external-edit path in a live browser, tablet, landscape and portrait viewports.
