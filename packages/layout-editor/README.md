# layout-editor

Dev visual builder for a Stake Engine web-sdk game. Phase 1: `builder.json`, the seven Stake viewports, section saves, drag-move, file upload (WebP, atlas, spritesheet), and a dev-only shell.

The editor writes the store. It does not write PIXI objects. Production builds drop the overlay, Tweakpane, `BuilderShell`, and `/__layout` / `/__upload` because those modules sit behind `import.meta.env.DEV`.

## Drop into web-sdk

Copy this folder to `packages/layout-editor` in a web-sdk checkout (pnpm 10.5, Node >= 22.16). The package imports `pixi-svelte`, `utils-layout`, `svelte`, and `pixi.js` by name, so the real workspace packages are used. Do not copy this repo's stand-in `packages/pixi-svelte` or `packages/utils-layout`.

1. Workspace dependency, in the game's `package.json`:

   ```json
   "layout-editor": "workspace:*"
   ```

   `sharp` is a **devDependency** of the game (this package already depends on it for tests). Add `sharp` to pnpm `onlyBuiltDependencies` in the root `package.json` and in `pnpm-workspace.yaml`. It is loaded with `await import('sharp')` inside the dev upload handler, never as a static import, so `vite build` still succeeds when the import throws.

2. Relative plugin import in the game `vite.config.js`. A package import of the plugin fails (vitejs/vite#5370). `config-vite` stays JavaScript for the same reason.

   ```js
   import config from 'config-vite';
   import { layoutEditorPlugin } from '../../packages/layout-editor/src/vite-plugin-layout';

   const base = config();
   base.plugins.push(layoutEditorPlugin({ file: 'src/game/builder.json' }));
   export default base;
   ```

   Dev must run with `--host`. The plugin rejects `/__layout` and `/__upload` unless `Host` is `localhost`, `127.0.0.1`, or `::1`. Override with `allowHosts`. A missing `Origin` is allowed (curl). A present `Origin` must be on the same list.

3. Bind the viewport in `src/game/stateLayout.ts`. This replaces the starter's four-type `bindLayoutType()`. Leave the game's `createLayout({ mainSizesMap })` call untouched. The drop-in does not replace, resize, or delete `mainSizesMap`.

   ```ts
   import { innerHeight, innerWidth } from 'svelte/reactivity/window';
   import { bindViewport } from 'layout-editor';

   bindViewport(() => ({
     width: innerWidth.current ?? 1200,
     height: innerHeight.current ?? 675,
   }));
   ```

   If the game does not call `bindViewport`, `useLayout` binds canvas size from `getContextLayout()` the first time it runs. The dev size picker overrides the window.

   **Design frame (Phase 2).** Pass `getDesignSize` from `activeViewport()` so the design frame is the active Stake viewport. Leave `mainSizesMap` in place for anything else that still reads it. Do not resize those entries. `BOARD_FRAME_LAYOUT` (board anchor, title, WAYS plaque, frame padding) lives in `builder.json` `layout.frame`. Positions are pixels of that key's design frame. `anchor` is a 0–1 pair. Phone S/M inherit L until they have their own item. Children with `parent` store a local offset and move with the parent. `follow: true` (fire rims, board frame) is not dragged on its own.

   ```ts
   import { VIEWPORTS, activeViewport } from 'layout-editor';

   createLayout({
     mainSizesMap, // unchanged
     getDesignSize: () => {
       const spec = VIEWPORTS[activeViewport()];
       return { width: spec.w, height: spec.h };
     },
   });
   ```

4. Last child of `<App>` in `src/components/Game.svelte`, and the shell as a sibling outside the PIXI tree:

   ```svelte
   <App>
     <!-- game nodes -->
     <LayoutEditorMount />
   </App>
   <BuilderShellMount />
   ```

   ```ts
   import { LayoutEditorMount, BuilderShellMount, useLayout } from 'layout-editor';

   const board = useLayout('board', () => ({ x, y }));
   ```

   `<Container {...board.props} />` carries `label`, which is how the overlay finds the node. `useLayout`, `resolveLayout`, and `defineTunable` keep the starter signatures.

5. Create `src/game/builder.json` (see the committed demo). There is no `layout.json`. If an old one exists, stop: its keys are the four retired layout types.

6. Asset roots, matching the 17 Oct 2026 `apps/locked` `assets.ts` (`new URL('../assets/…', import.meta.url)`):

   - Outputs: `src/assets/builder/{art,spine,audio}/<key>/`
   - `builder.json` paths are relative to `src/assets/builder` (`art/<key>/<file>.webp`). No leading `/`, no `src/` or `static/` prefix.
   - Originals: `assets-src/<section>/<key>/`, including `history/<stamp>/` when a slot is replaced. Never bundled. No `_src/`, no `*.src.png`, no `static/`.
   - `.wav` is stored only under `assets-src/audio/`. Phase 1 does not write a `builder.json` path for it. Only `.m4a` and `.ogg` may ship under `src/assets/builder/audio/`.
   - `src/assets/builder/manifest.ts` is a generated table of literal `new URL`s so Vite emits every referenced output. `pnpm builder:prune` deletes files under `src/assets/builder/` that `builder.json` does not reference, and rewrites the manifest. `manifest.ts` itself is kept.

7. Typecheck. `svelte-check` uses `tsconfig.json`, which excludes the Node-side plugin (`src/vite-plugin-layout.ts` and `src/plugin`) so `preserveSymlinks: true` in `config-ts/base.json` does not produce false errors on Vite's `Plugin` type. The plugin is type-checked on its own, with `preserveSymlinks` off:

   ```bash
   pnpm --filter layout-editor check          # svelte-check, must exit 0
   pnpm --filter layout-editor check:plugin   # tsc -p tsconfig.plugin-check.json, 0 errors
   ```

## Viewports

| key | size | falls back to | control-bar band |
|---|---|---|---|
| desktop | 1200×675 | none | 110 |
| laptop | 1024×576 | desktop | inherits |
| popoutL | 800×450 | desktop | inherits |
| popoutS | 400×225 | popoutL | inherits |
| mobileL | 425×812 | none | 180 |
| mobileM | 375×667 | mobileL | inherits |
| mobileS | 320×568 | mobileM | inherits |

`bindViewport`: if height > width, the portrait family, otherwise landscape. The largest key whose width and height both fit wins. If none fit, the smallest key in the family. 844×390 is `popoutS`. 1024×1366 is `mobileL`. 800×800 is landscape, so `popoutL`.

An item is `{ x, y, scale, anchor: [ax, ay], visible, z, pin }`. `scale` is a number. `z` becomes PIXI `zIndex`. `pin` is not copied onto the node. The default write scope is the current key. All sizes writes the same value into all seven keys. Nothing is stored under `"*"`, and the schema rejects that key. The control-bar band ignores All sizes and writes `layout.reserved.controlBar[<activeKey>]` only. Undo and "Reset band to inherited" remove that key so the ancestor resolves again. 110 and 180 are starting estimates. Nothing is read from new-ui-pixi.

Drag snaps to centre lines, safe-area edges, other items' edges, and an 8px grid (Alt skips snap). Shift multi-selects. Arrow nudge is 1px, Shift+arrow 10px. A corner handle scales uniformly. Undo survives a save. Red (control-bar overlap on desktop 1200×675, or a point outside the safe area) blocks **Export**. Save still writes. Amber covers plaque/title clip, text under 12px, tap targets under 44×44, translations that overflow, and popups whose content is taller than `maxHeight` with no scrollbar. Safe-area insets are estimates (`mobileL` 47/34); override them in `layout.reserved.safeArea`. Text items store a Lingui id (`game.title`). The locale switcher uses a stub catalog, not a full Lingui runtime. Side-by-side compare is a position readout for two viewports, not a second PIXI app.

## Save and upload

`POST /__layout` body: `{ section, data, baseHash }`. One in-process queue. Each write uses a unique temp file and an atomic rename. `baseHash` is the hash of that section as last loaded (`GET /__layout` and the HMR payload return per-section hashes). A mismatch is 409 and the editor reloads that file instead of overwriting. Two panels can save different sections together. The plugin's own writes are echoed by content hash and do not emit `layout-editor:update`. An external edit of `builder.json` does. Uploads under `src/assets/builder/` are echoed by path so they do not reload the page.

`POST /__upload` (multipart): `section` (`art` | `spine` | `audio`), `key`, and files. WebP is lossless with `exact: true` when any pixel is not fully opaque, otherwise lossy quality 90. An alpha channel alone does not force lossless. Atlas pages are always lossless and exact, with no extra premultiply, and every page line (including names with spaces) is rewritten to `.webp`. A missing page writes nothing. A TexturePacker `spritesheet.json` gets `meta.image` rewritten the same way. ReelRig zips (a `.zip` of `.json` + `.atlas` + pages) are expanded on upload. A spine set must be Spine 4.2.x. `pma` is read from the atlas flag only; a skeleton `premultipliedAlpha` field is dropped and is not written to `builder.json`. Atlas pages over 2048px warn for phone. A missing skeleton or atlas is a static WebP fallback, not an error.

## Spine

Each item may optionally point at a skeleton (`spine.<key>` with `skeleton` and `atlas`, or `spine.items.<id>.skeleton`). `resolveVisual` returns that skeleton, or the art-panel WebP in the same slot with the same position, anchor, and scale. It does not throw. Event bindings on a static item no-op. Adding the export later flips the item to Spine with no call-site change. Placements use the seven Stake viewport keys. The demo character is the Esoteric spineboy 4.2 sample (`pma: true` on the atlas). Symbols and the logo stay static WebP.

## Book preview

Slot ids live in the game's `src/game/art-slots.json`, served at `/dev/art-slots.json`. A drop is rejected when a TexturePacker frame is rotated, a frame key does not match its file stem, a non-numbered slot contains `_0000_`, a press-to-continue drop misses one of the 16 locales, or the bytes match `knownSampleHashes`. Warnings cover textures over 4096, GPU memory over 256 MB, a missing `mobile` pair, an unused alpha channel, and a hard fringe. Fire-rim `lockToCell` defaults to 2px. Moods are stored on `art.moods` and are not applied until book preview.

Demo backgrounds, the board frame, and the logo are placeholders from `scripts/art-placeholders.mjs`. They are not Stake-approved art.

## Book preview

`pnpm builder:rounds` reads `apps/<game>/fixtures/books/*.jsonl.zst` and `MATH_EVENTS.md`. It writes `dev/event-catalogue.json` (only event types that occur, with the payload fields seen in the books) and `dev/builder_rounds.json` (every round tagged by mode and feature, plus one sample event list per tag). Both files are marked `generated: true`. They are not part of `builder.json`. SlotMath Dev can replace them. Dev serves them at `/dev/event-catalogue.json` and `/dev/builder_rounds.json`. `GET /dev/round?mode=&id=` reads one round from the zstd book.

`playBookEvent` announces `{ name, index, payload }` and does not replace game handlers. The default delivery is fire-and-forget. Pass `'await'` to wait for every binding before the next event. A binding with `await: true` is waited for even in the default mode. Win bindings (`win: true` on `winInfo` or `setWin`) run only when the cash field is greater than 0: `win` when the book sends it, otherwise `totalWin` on `winInfo` and `amount` on `setWin`.

## Not in this phase

Spine authoring inside the builder, and a full Lingui catalog. The audio panel rebuilds one Howler sprite (`sounds.json` + `.m4a` + `.ogg`). Wav originals stay in `assets-src/audio`. Cue names in the demo are placeholder tones. Playback waits for the first tap and drops anything before that. Phone and desktop mix buses are separate. `pnpm builder:check` replays the sample rounds from `dev/builder_rounds.json` and fails on a missing required cue, a double-fired cue, or a binding outside the catalogue. A static Spine fallback is ok.
