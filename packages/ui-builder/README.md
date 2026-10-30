# ui-builder: shared UI layer (step C)

`ui.json` holds the UI every game shares. Locked In UI owns it.

- control bar items and the control-bar band per viewport key
- popups (bet menu, menu, autospin, buy panel / bonusPage) and the paytable / rules / info / settings shells
- modals (error, replay, reconnect) and the loading shell
- the language switch and the common text keys
- guard rails: band, editor preview insets, min text, min tap. The runtime reads `env(safe-area-inset-*)`.

Values are stored per viewport key, including `mobileL_land`, `mobileM_land` and `mobileS_land`, and inherit along the viewport chain.

## Rules

- `bindings` may only use `scope: generic` book events, as listed in the event catalogue (`pnpm builder:rounds`). A `scope: game` event is rejected.
- `audio` only carries UI interaction sounds (`click`, `popupOpen`). Book/game sounds stay in each game.
- Each game's `builder.json` keeps only its own items, pins a release in `ui.pin`, and may add explicit `ui.uiOverrides[item][viewportKey]`. The guard rails clamp those overrides.

## Versioning

```
pnpm --filter ui-builder release   # freezes ui.json as releases/<version>.json
pnpm builder:check                 # validates ui.json, the pin, overrides and the landscape misfits
```

A game ships the release it pins. Editing `ui.json` therefore never moves a shipped game. Once the content differs from a released version, bump `version`, because a released version cannot be changed. The builder's **UI** tab edits the working `ui.json`. It runs only in the dev server, and its changes affect every game.
