# Locked In — frontend test sample (fe_test_sample)

Small math folder cut from the published Locked In books so every feature in every mode can be played in the Stake Dev Tool and in Storybook.

Generated 2026-10-21 by Grok Bot. Selection seed 20261021 (deterministic). Target 25 rounds per mode × tag.

## Source book set

`~/math-sdk/games/lockedin/library/publish_files/` on the EC2 (books_*.jsonl.zst written 2026-09-22 15:42–16:01 UTC; lookUpTable_*_0.csv 2026-09-27 22:34 – 2026-09-28 02:26 UTC). No newer book set (for example the C-only Contraband resim) was found anywhere on the instance.

Verification: **every** round of every mode was streamed and checked against the published LUT, not just a sample. Book ids equal LUT ids (no missing or extra ids), `payoutMultiplier` equals the LUT payout (both are hundredths of 1× bet), and `finalWin.amount` equals `payoutMultiplier`.

| mode | rounds | LUT rows | payout mismatches | ids missing (book→LUT / LUT→book) | finalWin mismatches | max payout |
|---|---|---|---|---|---|---|
| base | 5,000,000 | 5,000,000 | 0 | 0 / 0 | 0 | 20,000× |
| ante | 4,000,000 | 4,000,000 | 0 | 0 / 0 | 0 | 20,000× |
| bonus | 2,000,000 | 2,000,000 | 0 | 0 / 0 | 0 | 20,000× |
| bonus_super | 2,000,000 | 2,000,000 | 0 | 0 / 0 | 0 | 20,000× |
| bonus_mystery | 2,000,000 | 2,000,000 | 0 | 0 / 0 | 0 | 20,000× |
| degen_spin | 2,500,000 | 2,500,000 | 0 | 0 / 0 | 0 | 20,000× |

## Contents

- `index.json`, `books_<mode>.jsonl.zst`, `lookUpTable_<mode>_0.csv`: same layout as publish_files. Rounds are byte-identical copies of the published lines (original ids kept). LUT rows are `id,1,payout`, with the payout taken from the published LUT, so every sample round has the same weight.
- `by_feature/<mode>/<tag>.json`: JSON array of full rounds for that mode × tag, sorted by payout. These are for Storybook.
- `sample_index.csv` / `sample_index.json`: one row per round with eventId (round id), mode, tags (every tag the round has), selectedFor (the tags it was picked for), payoutMultiplier, payoutX, tumbles, file and featureFiles. The JSON also holds the coverage table and the Storybook check.

## Tags

Tags are computed from events. `ew` means any `newExpandingWilds`. `ew_mult_high` means an EW with mult > 1. `ew_mult_<v>` means an EW with that mult value. `ew_multi` means ≥2 EW in one event. `contraband` means a `contrabandSwap`. `contraband_on_tumble` means a swap straight after a `tumbleBoard`. `contraband_c_only` means `from.symbol == "C"`. `contraband_to_W` means the swap goes to W. `fire_frames` means a `fireFramesPlaced` with ≥1 position, and `fire_frames_4plus` means ≥4. `tumble` means ≥1 `tumbleBoard`, and `tumble_long` means ≥3. `fs` means a `freeSpinTrigger`. `fs3`/`fs4`/`fs5`/`fs6plus` count the scatter positions in the first `freeSpinTrigger`. `retrigger` means a `freeSpinRetrigger`. `wincap` means a `wincap` event. `max_win_20000x` means payout = 20,000×; forced cap books often omit the `wincap` event. `zero_win` means a payout of 0. `win_small` means less than 1× the mode cost, `win_medium` means 1–10× the cost, and `win_big` means ≥10× the cost.

Picking works in stages: always include one max-payout round and one min-payout round, then one round per log-scale payout bin (12 bins), then fill the rest from equal-count payout quantiles. Rarer tags are picked first, and the picker prefers rounds that no other tag has used yet. No event types appeared beyond the ones in MATH_EVENTS.md.

## Counts (selected; `-` = cannot occur in this mode's book; [n] = rounds of that tag in the current Storybook data)

| tag | base | ante | bonus | bonus_super | bonus_mystery | degen_spin |
|---|---|---|---|---|---|---|
| ew | 25 [15] | 25 [13] | 25 [13] | 25 [13] | 25 [13] | 25 [27] |
| ew_mult_high | 25 [8] | 25 [6] | 25 [8] | 25 [8] | 25 [9] | 25 [27] |
| ew_multi | 25 [1] | 25 [1] | 25 [0] | 25 [1] | 25 [0] | 25 [27] |
| ew_mult_1 | 25 [7] | 25 [8] | 25 [6] | 25 [6] | 25 [5] | 25 [0] |
| ew_mult_2 | 25 [2] | 25 [3] | 25 [4] | 25 [5] | 25 [1] | 25 [0] |
| ew_mult_3 | 25 [0] | 25 [0] | 25 [2] | 25 [1] | 25 [1] | 25 [0] |
| ew_mult_4 | 25 [1] | 25 [1] | 25 [2] | 25 [0] | 25 [1] | 25 [0] |
| ew_mult_5 | 25 [3] | 25 [1] | 25 [0] | 25 [0] | 25 [5] | 25 [19] |
| ew_mult_10 | 25 [1] | 25 [0] | 25 [0] | 25 [2] | 25 [0] | 25 [14] |
| ew_mult_25 | 25 [0] | 25 [0] | 25 [0] | 25 [0] | 25 [1] | 25 [8] |
| ew_mult_50 | 25 [0] | 25 [0] | 25 [0] | 25 [0] | 25 [0] | 25 [2] |
| ew_mult_100 | 25 [1] | 25 [1] | 25 [0] | 25 [0] | 25 [0] | 25 [2] |
| contraband | 25 [13] | 25 [12] | 25 [10] | 25 [12] | 25 [10] | 25 [10] |
| contraband_on_tumble | 25 [0] | 25 [0] | 25 [0] | 25 [0] | 25 [0] | 25 [0] |
| contraband_c_only | 25 [1] | 25 [0] | 25 [0] | 25 [0] | 25 [0] | 25 [0] |
| contraband_to_W | 25 [0] | 25 [0] | 25 [0] | 25 [0] | 25 [1] | 25 [0] |
| fire_frames | 25 [67] | 25 [60] | 25 [35] | 25 [32] | 25 [43] | 25 [26] |
| fire_frames_4plus | 25 [40] | 25 [38] | 25 [27] | 25 [30] | 25 [39] | 25 [11] |
| tumble | 25 [54] | 25 [51] | 25 [35] | 25 [32] | 25 [43] | 25 [25] |
| tumble_long | 25 [42] | 25 [42] | 25 [30] | 25 [31] | 25 [42] | 25 [5] |
| fs | 25 [41] | 25 [45] | 25 [35] | 25 [32] | 25 [43] | 25 [4] |
| fs3 | 25 [23] | 25 [22] | 25 [35] | - | 25 [19] | 25 [3] |
| fs4 | 25 [9] | 25 [14] | - | 25 [32] | 25 [15] | 25 [1] |
| fs5 | 25 [9] | 25 [8] | - | - | 25 [9] | 25 [0] |
| fs6plus | 25 [0] | 25 [1] | - | - | - | 25 [0] |
| retrigger | 25 [4] | 25 [8] | 25 [5] | 25 [11] | 25 [9] | 25 [1] |
| wincap | 25 [1] | 25 [0] | 25 [0] | 25 [1] | 25 [0] | 25 [0] |
| max_win_20000x | 25 [2] | 25 [1] | 25 [1] | 25 [2] | 25 [1] | 25 [1] |
| zero_win | 25 [13] | 25 [11] | 25 [0] | 25 [0] | 25 [0] | 25 [1] |
| win_small | 25 [5] | 25 [9] | 25 [24] | 25 [23] | 25 [32] | 25 [4] |
| win_medium | 25 [13] | 25 [14] | 25 [9] | 25 [6] | 25 [8] | 25 [17] |
| win_big | 25 [37] | 25 [29] | 25 [2] | 25 [3] | 25 [3] | 25 [5] |

Every tag that a mode can produce reached 25. The `-` cells are design gaps, not missing data: bonus is forced 3S, bonus_super is forced 4S, and mystery has no 6+S.

## Existing Storybook data (web-sdk apps/locked/src/stories/data)

| mode | story books | identical to published round with same id |
|---|---|---|
| base | 68 | 2 |
| ante | 63 | 6 |
| bonus | 35 | 0 |
| bonus_super | 32 | 0 |
| bonus_mystery | 43 | 0 |
| degen_spin | 27 | 1 |

The Storybook books (2026-09-19, carrying `criteria` / `baseGameWins` / `freeGameWins`) come from an older simulation. Almost none of them match the published 2026-09-22 rounds, so they are stale.

## How to load

**Stake Dev Tool:** point the dev tool's math folder (where you would normally use publish_files) at this folder. It holds `index.json`, the six books and the six LUTs. Every round in a mode has weight 1, so a mode draws its rounds uniformly. Use `sample_index.csv` to find an eventId for a feature and force or replay that id. Ids are the original sparse ids, not 0..N-1.

**Storybook:** copy `by_feature/<mode>/<tag>.json` into `web-sdk/apps/locked/src/stories/data/`, or import it directly. Each file is a `StoryBook[]` array (`id`, `payoutMultiplier`, `events`). Published rounds have **no `criteria` field**, so `isWincapBook` / `isFreegameBook` in pickStoryBook.ts (which key on `criteria`) will not match them. Use event-based predicates instead, or the tags in `sample_index.json`.

