# Rocket League Proper Module Rebuild Plan

## Goal

Plan how Rocket League moves from a preserved embedded controller into a proper ZBroadcast module with a native Control Room panel.

This is a planning document only. Do not modify the current Rocket League controller, overlay, or server as part of this plan.

## Current Status

Rocket League is transitioning from a preserved legacy-major flow into the active proper Rocket League module.

Current shape:

- Controller lives in `public/control.html`.
- Overlay output lives in `public/overlay.html`.
- Server-side state, room handling, assets, admin behavior, and Socket.IO events live in `server.js`.
- The desktop app previously embedded the old controller through the Control Room flow.
- The module catalog now points Rocket League at the proper module and marks it as `layoutSize: major`.
- The catalog also marks Rocket League as the first `controlPanelMode: native-panel` target.

The legacy files remain useful and should be preserved for reference/fallback, but normal app module navigation should move toward the proper Rocket League module.

## Target Proper Module Structure

Future Rocket League should eventually move toward:

```text
public/modules/rocket-league/
  panel.html          temporary iframe fallback while native controls are ported
  overlay.html
  state.js
  styles.css
```

Optional later pieces:

- Dev Tools hooks.
- Settings hooks.
- preset support.
- migration helpers from legacy state.

The new module should coexist with the legacy flow until the replacement is proven.

Current shell status:

- `public/modules/rocket-league/panel.html` exists as a first local-only Control Room panel foundation.
- `public/modules/rocket-league/overlay.html` exists as the first proper local-only overlay output.
- `public/modules/rocket-league/state.js` defines the first local-first state schema using `zbroadcast:module:rocket-league`.
- `public/modules/rocket-league/styles.css` exists for scoped module shell styles.
- The proper Rocket League module is now the catalog/module-selection target.
- The existing `panel.html` page remains the temporary iframe fallback while native Control Room controls are ported into `caster-command.html`.
- The panel reads and writes only the local proper-module state namespace; it does not control the legacy overlay.
- The proper overlay is routed through the same Preview Overlay output path used by the Control Room background preview layer.

## Layer Mapping

Future Rocket League should follow the official app layer model.

- Rocket League panel should live in the Scene / Module Content Layer as native app DOM/components.
- Rocket League overlay lives in Preview Overlay output. When the Control Room live preview setting is enabled, the Control Room background preview layer should reuse that same Preview Overlay output instead of hardcoding a separate per-module background.
- Rocket League test/debug tools live in the Dev Tools Layer.
- Rocket League setup or confirm flows use the Global Modal Layer.
- Rocket League should not own app-wide navigation.
- Rocket League should not create its own app-wide modal system.
- Rocket League should not create full-screen opaque wrappers outside its assigned module area.

## Module Size

Rocket League is a `major` module.

Meaning:

- It is a larger primary game-controller module.
- It should receive the primary Control Room space.
- Minor modules like Predictions can eventually sit beside or around it.

Current catalog direction:

```text
layoutSize: major
controlPanelMode: native-panel
```

Keep iframe panel loading only as a temporary fallback until native panel controls are ported.

## Preserve-First Rebuild Strategy

### Phase A: Inventory Current Legacy Behavior

Document the current Rocket League feature set and state shape.

Detailed inventory:

- `docs/ROCKET_LEAGUE_FEATURE_INVENTORY.md`

Tasks:

- List current controller features.
- List current overlay features.
- Identify server state fields used by Rocket League.
- Identify Socket.IO events used by Rocket League.
- Identify asset paths and upload behavior.
- Do not change old files.

Goal: understand what must be preserved before rebuilding anything.

### Phase B: Create New Module Folder As A Prototype

Create new module files without replacing the legacy flow.

Target files:

```text
public/modules/rocket-league/panel.html
public/modules/rocket-league/overlay.html
public/modules/rocket-league/state.js
public/modules/rocket-league/styles.css
```

Early prototype rules:

- Use local-first module state first.
- Do not refactor `server.js`.
- Do not edit `public/control.html`.
- Do not edit `public/overlay.html`.
- Keep the legacy files untouched while the proper module launch path is refined.

Goal: build a safe sandbox for the proper module.

Status: initial shell files exist and the first local-first state schema is defined. The proper module is now the catalog target, with iframe panel loading kept as a temporary fallback until native controls are ported.

### Phase C: Build New Control Room Panel

Build a new Rocket League Control Room panel as a native app panel.

Panel rules:

- Lives in the Scene / Module Content Layer.
- Renders as native DOM/components inside `caster-command.html`, not as a normal iframe-rendered Control Room page.
- Uses `layoutSize: major` once it becomes the active module.
- Keeps core controls accessible.
- Does not include testing/debug controls.
- Requests app modals through the Global Modal Layer if needed.
- Does not duplicate Home, Preview Overlay, or Change Module.

Keep the old controller available during this phase.

Status: first panel foundation exists as `public/modules/rocket-league/panel.html` and has a cleaner major-module layout. It is now the normal Rocket League module target, but it remains an iframe fallback while the native panel is ported into the app shell. The main panel focuses on local score/series controls and a scoreboard-style local preview. Match setup uses the Global Modal Layer with Event Name, Division / Season / Etc, Week / Round, and Series Length. Team setup uses a Teams modal for team names, rosters, logos, team colors, and same-team roster slot swaps. The current game number is derived from series score instead of being entered manually. The panel also has local-only Swap Teams, event history, and undo/reset behavior inspired by the legacy controller.

Next panel steps:

- port the current Rocket League panel controls from iframe fallback into native app DOM/components.
- add Dev Tools hooks for test state once the read-only panel/overlay loop is stable.
- add real operator controls only after the state schema and overlay rendering are proven.
- move instant/queued mode and overlay delay into module settings or a compact panel dropdown.
- consider no-dependency logo color extraction later; current team color selection is manual.

### Phase D: Build New Overlay Output

Build a new module overlay output.

Overlay rules:

- Lives in `public/modules/rocket-league/overlay.html`.
- Is stream-facing.
- Contains no operator controls.
- Handles empty/inactive state cleanly.
- Remains OBS/browser-source friendly.

Compare the new overlay against the old `public/overlay.html` output before switching.

Status: first proper overlay output exists at `public/modules/rocket-league/overlay.html`. It reads the local module state namespace, renders a broadcast-facing scorebug with team names, logos, scores, fixed match-info cells, `GAME X OF Y` or `SERIES FINAL`, larger series pips, and active-player stacks. The proper Rocket League module routes this output into the Preview Overlay scene; when the Control Room live preview setting is enabled, the Control Room background layer uses that same active Preview Overlay output. The legacy `public/overlay.html` file remains preserved.

### Phase E: Migrate Control Room Launch Path

Current status: partially complete.

- Module catalog routes point to the proper Rocket League module files.
- Rocket League is now `layoutSize: major`.
- Rocket League is marked as `controlPanelMode: native-panel`.
- The current `panel.html` iframe remains the fallback while native controls are ported into `caster-command.html`.
- Legacy files remain untouched.

### Phase F: Deprecate Legacy Files Only When Safe

Do not remove or deprecate `public/control.html`, `public/overlay.html`, or related server behavior until the replacement has proven parity.

Deprecation requirements:

- New panel covers current operator workflow.
- New overlay covers current OBS output needs.
- State behavior is understood and stable.
- Existing users have a clear migration path.
- Smoke tests pass.

## Features To Preserve Or Intentionally Replace

The rebuild must preserve or deliberately replace:

- team names
- scores
- series score
- best-of / series settings
- logos
- rosters
- substitutes
- player names / stats if currently supported
- history
- undo
- queued updates
- instant updates
- overlay delay
- timing display
- caster/operator controls
- room/admin behavior if still needed later
- OBS browser-source overlay output behavior
- desktop local-first behavior

If a feature is intentionally changed, document the decision before implementation.

## State Direction

The rebuild should move toward local-first module state first.

Recommended direction:

- Use namespaced module state for the new prototype.
- Keep state understandable and resettable.
- Avoid coupling the first rebuild to remote rooms.
- Add remote rooms/operators later as a separate architecture layer.
- Add server-backed state only when the local module behavior is clear.

Remote rooms and remote operators are future architecture, not the immediate foundation.

### First Local-First Schema

The proper module state boundary now exists in `public/modules/rocket-league/state.js`.

Storage namespace:

```text
zbroadcast:module:rocket-league
```

The schema is intentionally local-only and is not connected to `server.js`, Socket.IO, or the legacy room state.

Current top-level shape:

- module metadata:
  - `moduleId`
  - `schemaVersion`
  - `updatedAt`
- match state:
  - `isMatchActive`
  - `match.tournamentName`
  - `match.seriesInfo`
  - `match.weekRound`
  - `match.eventTitle`
  - `match.matchTitle`
  - `match.seriesMode`
  - `match.bestOf`
  - `match.gameNumber` derived from series score
- teams:
  - `teams.blue`
  - `teams.orange`
  - each team has name, score, series score, logo path, accent color, and lightweight players
- overlay behavior:
  - `overlay.overlayVisible`
  - `overlay.overlayTheme`
  - `overlay.overlayPreset`
  - `overlay.delaySeconds`
  - `overlay.queuedUpdates`
- local history and undo fields:
  - `history`
  - `undo.undoDepth`
  - `undo.lastActionId`
  - `undo.scoreSnapshots` for local score/series undo
- development/testing fields:
  - `dev.mockMode`
  - `dev.mockScenario`

State helpers currently exposed on `window.ZBroadcastRocketLeague`:

- `getStorageKey()`
- `getDefaultState()`
- `normalizeState(state)`
- `loadState()`
- `saveState(nextState)`
- `updateState(updaterOrPatch)`
- `resetState()`
- `subscribe(listener)`

The schema is a first-pass boundary, not a complete Rocket League feature model. The next implementation step should read from this state and render placeholder module UI before adding operator controls.

## Dev Tools Direction

Future Rocket League Dev Tools can include:

- mock game state
- reset module state
- test logos
- test rosters
- simulate score changes
- force overlay states
- diagnostics

Rules:

- Dev Tools belong in the global Dev Tools Layer.
- Do not put test/debug controls in the live Control Room panel.
- Show Rocket League Dev Tools only when relevant.

## Optional Settings Direction

Future Rocket League settings may include:

- default best-of format
- overlay delay defaults
- hotkey presets
- logo/team asset preferences
- display theme options
- reduced animation / performance options

These should integrate with the app Settings system or a module-specific settings area. Do not create a disconnected settings system.

## Non-Goals For The First Rebuild

Do not start the rebuild with:

- Twitch integration.
- OBS websocket integration.
- remote operator rebuild.
- server refactor.
- database storage.
- monetization or store logic.
- replacing `public/control.html` immediately.
- replacing `public/overlay.html` immediately.
- changing existing Socket.IO events.
- changing existing server state shape.

Keep the first rebuild focused on proving the proper module shape.

## First Recommended Branch

Recommended first coding branch:

```text
rocket-league-module-inventory
```

First branch scope:

- document current state fields
- document current Socket.IO events
- document current controller sections
- document current overlay sections
- add no behavior changes

Recommended second branch:

```text
rocket-league-module-prototype-shell
```

Second branch scope:

- create `public/modules/rocket-league/` files
- add local prototype state
- do not switch the catalog route yet
- do not edit legacy files

## Success Criteria

Rocket League becomes a proper ZBroadcast module when:

- it has catalog metadata
- it uses `layoutSize: major`
- it has a first-class Control Room panel
- it has module overlay output
- its state boundary is clear
- its Dev Tools hooks live in the global Dev Tools Layer
- its modals use the Global Modal Layer
- it no longer depends on embedding the old `public/control.html` page
- current scoreboard behavior remains preserved or intentionally replaced

Move slowly. Preserve the working legacy flow until the replacement is clearly better and safer.
