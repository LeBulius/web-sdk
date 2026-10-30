# Tuning the game UI bar (new-ui-pixi)

Practical guide for nudging layout, sizes, text, and icons without digging through the whole package.

**Lines** is the game that currently uses this Pixi control bar. Preview with Storybook from `web-sdk/apps/lines` (port `6001`), then hard-refresh after edits.

---

## File map (start here)

| What you want to change | File |
|---|---|
| Desktop bar positions, scales, colors, corner radius, bottom padding | `src/components/LayoutDesktop.svelte` |
| Settings popup above the bar (Info + volume sliders) | `src/components/MenuPanel.svelte` |
| Shared bar/panel colors & radius | `src/constants.ts` (`UI_CHROME_*`) |
| Volume row hover / mute-on-click / slider drag | `src/components/VolumeSlider.svelte` |
| Menu ↔ close swap on the bar | `LayoutDesktop.svelte` (menu slot) + `ButtonMenuClose.svelte` / `close.webp` |
| Global icon base size + bar height | `src/constants.ts` |
| Which layout is active (desktop / portrait / landscape / tablet) | `src/components/UIDefault.svelte` |
| Balance text (font, size, color, vertical stack) | `src/components/LabelBalance.svelte` |
| Bet text (font, size, color, hit area) + bet ladder meter under amount | `src/components/LabelBet.svelte` |
| Bet amount popup (grid, same chrome as settings menu) | `src/components/BetMenuPanel.svelte` (toggled by `stateUi.betMenuOpen` from `LabelBet`) |
| Autospin rounds popup (∞ / 10…1000) | `src/components/AutoplayPanel.svelte` (toggled by `stateUi.autoplayMenuOpen` from auto button) |
| Win text | `src/components/LabelWin.svelte` |
| Spin / menu / turbo / auto / bonus / +/- sprites (size + which asset key) | `src/components/Button*.svelte` |
| Icon image files (edit here) | `web-sdk/apps/lines/static/assets/sprites/ui/` |
| Icon files Vite actually loads | `web-sdk/apps/lines/assets/sprites/ui/` (run `convert_to_webp.py` to sync) |
| Asset key → file mapping (lines only) | `web-sdk/apps/lines/src/game/assets.ts` |
| Mobile / tablet layouts | `LayoutPortrait.svelte`, `LayoutLandscape.svelte`, `LayoutTablet.svelte` |

Other games that do **not** ship custom UI sprites under `apps/<game>/static/assets/sprites/ui/` will keep whatever default assets they already use.

---

## Coordinate system (desktop)

`LayoutDesktop.svelte` places everything inside one bar container:

- Bar is centered horizontally on the canvas.
- Local `x = 0` is the **left edge** of the bar; `x = BAR_WIDTH` is the right edge.
- Local `y = 0` is the **top** of the bar; `y = DESKTOP_BASE_SIZE` is the bottom.
- `barCenterY` (= half the bar height) is the vertical center line — most icons sit on it.

Buttons with `{ anchor: 0.5 }` are centered on their container’s `(x, y)`.

```
[ Bonus ]  [ Menu | Balance ........ | Bet box +/- | Spin | Auto ]
                                                (turbo under auto)
     ^ detached left of bar
```

---

## Knobs in `LayoutDesktop.svelte`

Edit the constants at the top of the file first:

| Constant | Effect |
|---|---|
| `BAR_WIDTH` | How wide the dark bar is |
| `BAR_RADIUS` | Rounded corners on the main bar (`borderRadius`, not `radius`) |
| `BET_BOX_RADIUS` | Rounded corners on the bet inset |
| `ACTION_SCALE` | Size of **spin** and **bonus** (same scale; ~1.12 so spin slightly overflows the taller bar) |
| `SIDE_SCALE` | Size of **auto** / **turbo** (~half of spin) |
| `BOTTOM_PAD` | Space under the bar so oversized spin/bonus are not clipped |

Then nudge individual `Container` props:

| Element | Typical props | Tips |
|---|---|---|
| Bonus | `x`, `y`, `scale` | Negative `x` moves it left of the bar. Keep `scale={ACTION_SCALE}` to match spin. |
| Menu | `x`, `y`, `scale` | Smaller scale (~0.4). Keep `y={barCenterY}`. |
| Balance | `x`, `y` | No scale — text size is in `LabelBalance.svelte`. |
| Bet box (`Rectangle`) | `x`, `y`, `width`, `height`, `borderRadius`, `backgroundColor` | Move box and bet text together. |
| Bet text | `x`, `y` | `LabelBet` is a **120×60** button with top-left origin. Current offset `y={barCenterY - 30}` centers it on the bar. |
| Increase / decrease | `x`, `y`, `scale` | Stacked with ± offset from `barCenterY`. |
| Spin | `x`, `y`, `scale` | Large; overflows the bar on purpose. |
| Auto / turbo | `x`, `y`, `scale` | Same `x`, opposite `y` offsets for vertical stack. |

### Colors on the rectangles

- Main bar: `backgroundColor`, `alpha` on the first `Rectangle`
- Bet box: `backgroundColor` on the bet `Rectangle`
- Use hex like `0x2a1f18` (Pixi), not CSS `#2a1f18`

### If something is clipped at the bottom

Increase `BOTTOM_PAD`, or lower `ACTION_SCALE` / bar height. Overflow is roughly:

`(UI_BASE_SIZE * ACTION_SCALE - DESKTOP_BASE_SIZE) / 2`

---

## Global sizes — `src/constants.ts`

| Constant | Meaning |
|---|---|
| `UI_BASE_SIZE` | Native draw size for button sprites (should match export size, currently **100**) |
| `DESKTOP_BASE_SIZE` | Desktop bar **height** in pixels (currently `100`) |
| `UI_BASE_FONT_SIZE` | Shared default used by some UI text helpers (balance/bet override locally) |

Final on-screen icon size ≈ `UI_BASE_SIZE × scale` from the layout `Container`.

Example: spin at `scale={1.35}` → ~135px. Menu at `scale={0.42}` → ~42px.

---

## Centering and styling text

### Balance — `LabelBalance.svelte`

Two `Text` nodes stacked around the container origin:

- Label: `y={-12}`, `anchor={{ x: 0, y: 0.5 }}`, left-aligned
- Value: `y={12}`, same anchor

Tune:

- **Vertical gap** between “BALANCE” and the amount → change `y={-12}` / `y={12}`
- **Font size / color** → `style.fontSize`, `style.fill` (`0x22d3ee` cyan, `0xffffff` white)
- **Left vs center** → `anchor.x` (`0` = left, `0.5` = center) and `style.align`
- **Where the whole block sits on the bar** → `LayoutDesktop` balance `Container` `x` / `y`

### Bet — `LabelBet.svelte`

Same stacked look, but inside a clickable `Button` with `sizes={{ width: 120, height: 60 }}`.

- Text is drawn at the button center (`center.x` / `center.y`) with `anchor={0.5}`
- Label/value use `y={-12}` / `y={12}` like balance
- Change hit-area with `sizes={{ width, height }}` — if you change height, also update the layout offset (`barCenterY - height/2`)

### Win — `LabelWin.svelte`

Same idea as balance; desktop layout currently does not place win on the bar (landscape still can).

---

## Button sprites (size + art)

Each button sets:

```ts
const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
```

and applies that to the `Sprite` (`width` / `height`) plus `anchor={0.5}` so the icon is centered in the button.

| Button file | Asset keys (see `assets.ts`) |
|---|---|
| `ButtonBet.svelte` | `spinButton`, `spinButtonHover`, `spinButtonActive`, … |
| `ButtonBuyBonus.svelte` | `bonusButton`, `bonusHover`, `disableButton`, … |
| `ButtonMenu.svelte` | `menuButton`, `menuButtonHover` |
| `ButtonAutoSpin.svelte` | auto-spin keys |
| `ButtonTurbo.svelte` | `turboButton`, `turboHover`, `turboActive`, … |
| `ButtonIncrease.svelte` / `ButtonDecrease.svelte` | `increaseButton`, `decreaseButton`, … |

**Do not** scale only inside the button unless you want every layout affected. Prefer layout `scale` in `LayoutDesktop.svelte`.

---

## Replacing icons (lines)

1. Drop PNGs into `web-sdk/apps/lines/static/assets/sprites/ui/` (export at **100×100** to match `UI_BASE_SIZE`).
2. Convert with the folder’s `convert_to_webp.py` (game loads `.webp`).
3. Point keys in `web-sdk/apps/lines/src/game/assets.ts` at the new files.
4. Hard-refresh Storybook.

If an icon looks soft, the art is too small for how large layout scales it (e.g. spin at 1.35×). Export larger art and/or raise `UI_BASE_SIZE` consistently.

---

## Other breakpoints

Storybook / iframe size picks a layout via `stateLayoutDerived.layoutType()`:

| Layout file | When |
|---|---|
| `LayoutDesktop.svelte` | Stake desktop iframe (~16:9) — **the one you’ve been tuning** |
| `LayoutLandscape.svelte` | Wide mobile |
| `LayoutPortrait.svelte` | Tall mobile |
| `LayoutTablet.svelte` | Tablet |

Desktop changes do **not** automatically apply to portrait/landscape/tablet. Copy the same pattern if those need to match.

---

## Quick recipes

**Move spin left/right**  
`LayoutDesktop.svelte` → spin `Container` `x={...}`

**Make spin + bonus bigger/smaller together**  
Change `ACTION_SCALE`

**Make only menu smaller**  
Menu `Container` `scale={...}`

**Rounder bar**  
Raise `BAR_RADIUS` / `BET_BOX_RADIUS` (must be `borderRadius` on `Rectangle`)

**Balance text too low/high**  
`LabelBalance.svelte` → `y` on each `Text`, or balance container `y` in layout

**Bet text not centered in the dark box**  
Move bet `Container` `x`/`y` and the bet `Rectangle` together; remember LabelBet’s 120×60 top-left origin

**Bar too close to screen bottom**  
Increase `BOTTOM_PAD`

---

## Related

- Component overview: [`COMPONENTS.md`](./COMPONENTS.md)
