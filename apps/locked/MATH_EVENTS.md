# Locked In — math book events for frontend

Locked In: 4-reel ways (3-5-5-3, 16 live windows).
Outer reels are 3-high and vertically centered. Padding rows in `reveal`
are not live and never receive Fire Frames.

FS lengths (this config): **3S → 5**, **4S → 8**, **5S → 12**, **6+ → 15**.
Retrigger **3+ S = +1** spin. Published RTP **0.96**. Wincap **20,000×**.

| Mode | Cost | Buy bonus | What it is |
|---|---|---|---|
| `base` | 1× | no | Natural grind |
| `ante` | 3× | no | Natural grind, more features |
| `bonus` | 100× | yes | Forced 3S |
| `bonus_super` | 300× | yes | Forced 4S |
| `bonus_mystery` | **500×** | yes | 60% 3S / 30% 4S / 10% 5S |
| `degen_spin` | 500× | no | Paid expanding-wild spin |

## Index and money conventions

- **Reel** indices are 0-based.
- **Row in custom events** (`fireFramesPlaced`, `updateGrid.fireFrames`,
  `contrabandSwap`, `newExpandingWilds`) and in SDK position lists
  (`winInfo`, `tumbleBoard.explodingSymbols`, `freeSpinTrigger`) are **FE
  rows**: `math_row + 1` because padding is on.
- **`updateGrid.gridMultipliers[reel][row]`** is the **math** live grid
  (no padding row). Shapes: `[3], [5], [5], [3]`.
- Live FE rows: reel 0 → 1–3, reels 1–2 → 1–5, reel 3 → 1–3.
  Reveal padding is FE row 0 and the last cell of that reel (5-high /
  7-high / 7-high / 5-high including pads).
- SDK money fields (`winInfo.totalWin`, `win.win`, `setWin.amount`,
  `setTotalWin.amount`, `finalWin.amount`, `wincap.amount`,
  `freeSpinEnd.amount`) are **integer cents of 1× stake**: `0.5× → 50`,
  `20,000× → 2,000,000`. Do not treat them as multipliers.

## Spin order (math)

1. Place Fire Frames (0–4, weights **25/30/26/13/6**: 25% none, E[N]=1.45,
   P(≥1)=75%) on the empty live grid
2. Symbols land (reel stop) onto those cells
3. Contraband: after reveal, before EW — only if live C on board; lows of a drawn type + every C
   swaps to **H1–H4** or W
4. Expanding wild land + expand (never on a reel that has a scatter)
5. Evaluate ways (per-way product of cell grid; fire win bonus; EW adds to
   that cell)
6. Tumble **in place**: new Fire Frame first, then winning cells refill
   (not gravity). C may land as a refill symbol (Contraband can then fire). Leftover EW on a reel also blocks
   scatter refill.
7. Scatters / bonus trigger and FS retrigger: count S after the last tumble.

## Ways / wilds

Wild (W / EW) substitutes for paying symbols and **connects** every
symbol way that can use that cell. A full-wild reel 0 still starts those
ways (game override of SDK `get_ways_data`).

**EW never lands on a reel that has a scatter.** Landing picks only
scatter-free reels, then expands that reel. S and EW do not share a reel.
If every live reel has an S, no EW drops on that spin.

Landing bag is shared: **1 in 50** spins get ≥1 EW (`EW_LANDING`), except
degen paid `{2,3,4}` and forced wincap. Mult bags are per package:

- **3S / bonus** (`EW_MULT_VALUES_BONUS`): 1 / 2 / 3 / 4 / 5 / 10 / 25 / 50 / 100
- **4S / super** (`EW_MULT_VALUES_BONUS_SUPER`): same 1–100 bag
- **5S / epic** (`EW_MULT_VALUES_BONUS_EPIC`): **5 / 10 / 25 / 50 / 100 only**
  (no 1–4). `newExpandingWilds.mult` on a 5S spin is never below 5.
- Forced wincap: `{100: 1}`

`reveal` is the **pre-expand** stop. `newExpandingWilds` is the land cell
(FE row + `mult`). FE expands the **whole live reel** to EW with that
`mult`. Fire Frames do not copy across the reel — they stay on the cells
they were placed on, including through EW expand.

A 4-of-a-kind wild path can also hit the small (4, `"W"`) / (4, `"EW"`)
paytable lines. Cash for the round is **not** taken from
`winInfo.meta.ways` or `meta.winWithoutMult` (see below).

`winInfo.positions` can list the same cell more than once (one physical
wild on several ways). Heat and explode use **unique** cells.

## Grid heat after a tumble

Each **unique** winning cell, once per tumble, regardless of how many ways
pass through it:

- stored grid **+1**
- stored grid **+2** if that cell has a Fire Frame this spin

Pay for that tumble is already computed; this heat applies to later tumbles
and later free spins in the same bonus.

## Tumble length

There is no tumble-count cap. A spin keeps tumbling until there is no win
or the round hits **20,000×**. Theoretically unbounded; in practice the
wincap and dead boards stop it.

## winInfo meta vs cash

`apply_grid_multipliers_to_wins` sets each win amount and `totalWin`.
That is what the book pays and what RTP uses.

`meta.ways`, `meta.winWithoutMult`, and the derived `win["multiplier"]`
can still reflect the SDK’s pre-grid / EW-in-ways count. **They do not
change game math.** FE should not recompute payout from those fields.
Use `win` / `totalWin` (cents).

## Forced wincap

Cap books all use distribution criteria **`wincap`**. An internal type bag
picks the payload (3S/4S/5S last-FS, or a dead paid spin). Those type
names (`3s_1ew`, `spin_4ew`, …) are **not** book `criteria`.

Payload reel/EW is unchanged: **FRWCAP** + `{100: 1}` EW.

Bonus / FG cap books do **not** clamp on the trigger or early FS. Those
spins use the normal bonus strip (FR0 / SR0 / MR0), fire, contraband,
and the natural EW bag. One spin in the **late window** is the payload:
draws FRWCAP, lands 100× expanding wilds, and that spin’s win is scaled
so the round totals **20,000×**. wincap then ends the bonus.

The payload FS is picked uniformly (seeded) so it is not always the last
spin:

- **5S** (12 FS): any of the last **4** (FS 9–12)
- **4S** (8 FS): any of the last **3** (FS 6–8)
- **3S** (5 FS): any of the last **2** (FS 4–5)

Retriggers grow `tot_fs`; the pick is refreshed so it stays in the new
trailing window.

Base and ante also have a **dead-spin** cap (0 scatters, 3–4 EW, clamp on
that paid spin). Degen cap is that same single-spin path (0 scatters,
FRWCAP, EW landing bag `{1,2,3,4}`, clamp on the paid spin, never FS).

A `wincap` **event** is emitted only when the SDK first sees
`running_bet_win >= 20000` while the flag is still off (organic hit).
Forced payload books set the flag while scaling, so they often **omit**
`wincap` and skip `setWin`. `finalWin.amount` is still `2000000`.

## Bonus Mystery (500× buy)

Entry mix: **60% 3S / FR0** (bonus EW, 5 FS), **30% 4S / SR0** (super EW,
8 FS), **10% 5S / MR0** (epic EW, **12 FS**). Cap is **5S-only: 1 in 100
of 5S** (= **1 in 1,000** of the buy, cap RTP 0.04). 5S body 9.9% + cap
0.1% = 10%. Cost **500×**.

5S-only heat (does not change 3S / 4S):

- Epic EW bag is **5× and up** (`5:40 / 10:20 / 25:8 / 50:4 / 100:2`).
  No 1–4× on mystery 5S.
- **MR0 strip W is 50% of H1** (weight 1.2 vs H1 2.4). Regular wild on
  the 5S reel stop, not extra EW landing. Landing stays the shared
  1-in-50.

**Trigger reveal only** (not every FS):

- Exactly **1S on reel 0** and **1S on reel 1**
- Remaining S on reels **2–3** (a 5S stacks a back reel: 1+1 plus three
  more on the two 5-high / 3-high reels)
- After the trigger tumble, scatter count must still equal the bought
  package. Extra S on that tumble rejects the book (same as bonus /
  bonus_super). It never enters free spins.
- Free-spin retriggers are unchanged (3+ S = +1).
- Forced wincap is **5S / MR0 only**. Payload is the last 4 FS of a 5S,
  FRWCAP, 100×, 1–4 EW. Organic 20k on 3S/4S/5S still exists.

Non-mystery forced 5S (base / ante wincap last-FS, SDK force) may still
plant a second scatter on a reel that already has one (2+1+1+1). Mystery
does not use that stack on the buy spin.

## Degen Spin (500×) — expanding-wild spin, not a bonus buy

The **paid degen spin** uses bag `{2, 3, 4}` (no 0/1 weight). **2+ EW is
guaranteed only when enough reels are scatter-free.** EW cannot drop on a
reel that has an S, so if **3S+** land, at most `4 − (reels with S)` wilds
can place — often 1, or 0 if all four reels have S. That is not a 2-EW
spin.

If 3+ S still open a bonus, those free spins are a normal 3S / 4S / 5S
feature: FR0 and the **standard bonus EW bag**, not 2+ EW per FS.

`degen_spin` is bought for the wild (`is_buybonus` false). Free spins are an
**organic side-effect**, not a quota:

- The `expanding_wild` books draw DR0 once with **no scatter forcing** and
  no re-draw of 3+ scatter boards (`organic_freegame`). If **3+ S** are on
  the board after the paid spin's tumbles (extra S from the tumble counts
  and may upgrade the package), the round enters free spins with the
  **same lengths as every other mode**: 3S → 5, 4S → 8, 5S → 12, 6+ → 15,
  retrigger +1. No trigger-count resample for degen.
- Event stream is the normal one (see sequence below). Trigger-spin grid
  heat carries into the free spins exactly as in base / ante.
- A degen book is still rejected without an expanding wild in the round
  (`force_expanding_wild`). Same reel rule as everywhere: EW cannot drop on
  a scatter reel, so a paid spin with S on all four reels only passes if an
  EW lands during the organic FS.
- Degen `wincap` books: FRWCAP (no scatters), 100× EW, clamp on the paid
  spin, never enter free spins.

## Bonus buys and extra scatters

`bonus` (3S), `bonus_super` (4S), and **`bonus_mystery`** (3S / 4S / 5S):
after the trigger tumble, scatter count must still equal the bought
package. If a 4th/5th S dropped in (or mystery lost the forced front-reel
layout count), the book is rejected and redrawn. It never enters free
spins.

Other modes (base, ante, degen, wincap) may still upgrade FS from extra
trigger-tumble scatters. Retriggers during free spins are unchanged.

---

## Event sequence (what FE should play)

### Paid spin / each free spin

1. `fireFramesPlaced` — **always**, even when the 0-weight roll gives
   empty `positions` / `newPositions`
2. `updateGrid` — stored grid after start-of-spin fire heat; `fireFrames`
   is the current overlay (empty on a 0 roll)
3. `reveal` — symbols on that stop. Live cells with a frame have
   `"fireFrame": true`. Padding cells never do. This board is **before**
   Contraband / EW expand.
4. `contrabandSwap` — after reveal, before EW; omit on miss / dead type /
   no live C (can also fire after each `tumbleBoard`)
5. `newExpandingWilds` — omit when none land

Then evaluate / tumble (may repeat):

6. `winInfo` — this tumble’s cash (cents). After a winning chain, the
   **last** eval with no win still emits `winInfo` with `totalWin: 0`
   plus `setWin` / `setTotalWin` because spin cash is already > 0.
   That is the end of the tumble chain — do not refill.
7. `wincap` — only on an organic first hit of 20,000×
8. `setWin` / `setTotalWin` — cents. `setWin` is skipped once wincap is
   flagged.
9. On a win (`winInfo.totalWin > 0`), **before** refill:
   - `updateGrid` — winning-cell heat already applied
   - `fireFramesPlaced` — +1 new frame on an empty live cell (`newPositions`).
     Omitted if every live cell already has a frame
   - `updateGrid` — includes that new frame’s stored +1
   - `tumbleBoard` — in-place refill
10. After the spin’s tumble loop: another `setWin` (skipped if wincap)

### Free-spin entry (after the trigger spin’s loop)

1. `freeSpinTrigger` — `totalFs` and scatter positions (FE rows)
2. `updateGrid` — **carried trigger-spin grid**, fire overlay cleared
3. Per FS: `updateFreeSpin` (`amount` starts at 0) → spin sequence above
4. Retrigger: `freeSpinRetrigger` if the board has 3+ S **after the last
   tumble** (`totalFs` is the new total)
5. `freeSpinEnd` — feature cash in cents

### Round end

`finalWin` — payout in cents. That is the book result.

---

## fireFramesPlaced

```json
{
  "type": "fireFramesPlaced",
  "positions": [{"reel": 0, "row": 2}, {"reel": 2, "row": 3}],
  "newPositions": [{"reel": 0, "row": 2}, {"reel": 2, "row": 3}]
}
```

- Spin start: 0–4 frames, weights **25/30/26/13/6** (25% none, E[N]=1.45,
  P(≥1)=75%). Overlay is unique to this spin. `place_fire_frames()` always
  discards the previous overlay and rolls a new 0–4, including every free
  spin. A 0 roll is an empty overlay, writes no `start_delta`, and **still
  emits** this event with `[]`. There is no persist-into-next-FS path.
  Tumble may still add a 5th+ frame on an empty live cell.
- Each tumble of this spin: +1 frame on a cell that does not already have
  one, **before** the winning cells refill. No per-reel cap. One per cell,
  up to 16.
- New frame: stored cell multi **+1**.
- Winning fire cell (unique, once per tumble): stored grid **+2** (base +1
  and fire +1). Eval of a fire cell also uses **+1 extra** on that path
  (`win_bonus`).
- Grid multipliers reset only on a **new paid spin**. Trigger-spin values
  carry into `freegame_3` / `freegame_4` / `freegame_5` and are not
  overwritten to 1x. They persist across free spins of that bonus.
- Fire overlay is a **cell** flag. It survives that spin’s refill of the
  same cell. `tumbleBoard.newSymbols` are **not** stamped `"fireFrame"`.
  Keep overlay from `positions` / `updateGrid.fireFrames`.

`reveal` live cells have `"fireFrame": true` on the opening stop only.

---

## updateGrid

Emitted after fire placement, after a tumble’s winning-cell heat, after a
new tumble frame, and when carrying the trigger-spin grid into free spins
(empty `fireFrames` on that carry event).

```json
{
  "type": "updateGrid",
  "gridMultipliers": [[1, 1, 1], [1, 2, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1]],
  "fireFrames": [{"reel": 1, "row": 3}]
}
```

`gridMultipliers[reel][row]` is the **math** live-cell grid (no padding
row). `fireFrames` uses FE rows (`math_row + 1`).

---

## newExpandingWilds

Emitted after `reveal` when new expanding wilds land this spin. Rows are
FE (`math_row + 1`). `mult` is the EW add, not cents. Omit when none land.
On a **5S / epic** spin `mult` is **≥ 5**. 3S / 4S can still roll 1–4.
EW is spin-local: leftover EW is gone at spin end; next paid spin / next
FS starts clean. No `updateExpandingWilds` event is emitted.

```json
{
  "type": "newExpandingWilds",
  "newWilds": [{"reel": 2, "row": 2, "mult": 2}]
}
```

---

## contrabandSwap

After reveal, **before** expanding wilds (paid and every FS). Also after each **tumbleBoard** refill (C can land on tumbles).

**Trigger:** fires **only** when at least one live **C** is on the board.
No 0.02 no-C path — if there is no C, there is no event. Same on tumble
refills (C must land in the refill to fire).

**FROM:** draw a low **type** first from `from_pool` (L1–L5 equal weight,
always all five — not weighted by how many cells of each type are on the
board). If that type is on the board: swap **every live cell of that
type**. **Every live C always swaps on a hit**, to the same destination,
even when the drawn low type is missing. Dead only if there is no live
cell of the drawn low **and** no live C (no-C miss path).

`from.symbol` is the drawn low when any of that type swapped, else `C`.

**TO:** draw from `upgrade_pool` by rarity (`H4: 8`, `H3: 5`, `H2: 3`,
`H1: 1.5`, `W: 0.5`). Never S, EW, or C. One destination symbol for the
lows **and** every C.

Apply this event to the **post-reveal, pre-expand** board. Rows are FE.
`from` / `to` are the first swapped cell; `positions` is the full set
(lows + C). EW events that follow use the post-swap board.

```json
{
  "type": "contrabandSwap",
  "from": {"reel": 0, "row": 1, "symbol": "L4"},
  "to": {"reel": 0, "row": 1, "symbol": "H3"},
  "positions": [
    {"reel": 0, "row": 1},
    {"reel": 1, "row": 2},
    {"reel": 1, "row": 3},
    {"reel": 2, "row": 1}
  ]
}
```

---

## tumbleBoard (in-place)

After refill, Contraband may fire (`contrabandSwap`) before the next evaluate. C may land as a refill symbol.

Winning symbols are replaced **in the same cells**. Not gravity.

```json
{
  "type": "tumbleBoard",
  "newSymbols": [[{"name": "L3"}], [{"name": "H3"}], [{"name": "L2"}], [{"name": "L2"}]],
  "explodingSymbols": [
    {"reel": 0, "row": 2},
    {"reel": 1, "row": 1},
    {"reel": 2, "row": 3},
    {"reel": 3, "row": 1}
  ]
}
```

`explodingSymbols` is every `winInfo` position, so the **same cell can
repeat** (several ways). `newSymbols[reel]` has **one** symbol per unique
exploding cell on that reel, in **row-ascending** order.

FE mapping: unique `(reel, row)` explosions → sort each reel by row →
`newSymbols[reel][i]` fills that cell. Do not zip `newSymbols[reel][i]`
to the i-th raw `explodingSymbols` entry.

New symbols are not stamped `"fireFrame"`. C may appear in a refill.
If leftover EW is still on a reel, scatter is skipped on that refill.
