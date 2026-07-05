# Rocket League Legacy Feature Inventory

## Purpose

This inventory documents the current legacy Rocket League controller, overlay, server, and state behavior before Rocket League is rebuilt as a proper ZBroadcast module.

This is documentation only. Do not use this inventory as permission to change `server.js`, `public/control.html`, or `public/overlay.html`.

## Current Files And Roles

### `server.js`

`server.js` owns the legacy web app backend.

Current responsibilities:

- Serves static files from `public/`.
- Serves room-based controller and overlay routes.
- Redirects legacy `/control.html` and `/overlay.html` URLs to the default room.
- Owns in-memory room state.
- Owns Socket.IO room join behavior.
- Enforces admin password checks for control sockets.
- Allows overlay sockets to join as read-only overlay clients.
- Stores uploaded overlay and logo assets on disk.
- Broadcasts authoritative room state to connected clients.
- Maintains undo snapshots.
- Maintains match history.
- Handles queued and instant display-info behavior.
- Emits overlay queue reset events when old delayed overlay states need to be cleared.
- Supports gentler local desktop admin warning when launched by Electron.

### `public/control.html`

`public/control.html` is the legacy operator/caster controller.

Current responsibilities:

- Determines the room ID from the URL.
- Prompts for the admin password.
- Stores the admin key per room in `sessionStorage`.
- Connects to Socket.IO as the `admin` role.
- Shows room and overlay URL information.
- Provides live score controls.
- Provides match metadata controls.
- Provides team, logo, roster, substitute, reset, history, hotkey, and timing controls.
- Sends operator actions to `server.js` through Socket.IO and HTTP upload routes.

### `public/overlay.html`

`public/overlay.html` is the legacy OBS/browser-source overlay output.

Current responsibilities:

- Determines the room ID from the URL.
- Connects to Socket.IO as the `overlay` role.
- Renders the broadcast scoreboard.
- Applies optional custom overlay background.
- Displays team names, scores, series pips, logos, rosters, match metadata, and timing display.
- Applies delayed state updates based on overlay delay.
- Applies instant display-info updates immediately.
- Clears or rebuilds queued overlay states when reset/undo behavior requires it.

### `package.json`

Relevant scripts and dependencies:

- `npm start` runs `node server.js`.
- `npm run desktop` runs Electron through `electron/main.js`.
- Runtime dependencies include Express, Socket.IO, and Multer.
- Electron is present as a dev dependency for the desktop app.

## Control UI Feature Inventory

### Room / Admin Behavior

- Derives room ID from `/room/:roomId/control`.
- Falls back to `default-room` when no room is found.
- Prompts for admin password on load.
- Stores admin key in `sessionStorage` using a room-specific key.
- Joins Socket.IO with:
  - `roomId`
  - `role: "admin"`
  - `adminKey`
- Handles join errors and incorrect password retry.
- Shows overlay URL for the current room.
- Includes copy-to-clipboard behavior for the overlay URL.

### Team Names

- Blue team name input.
- Orange team name input.
- Names are sent through queued or instant match-info updates.
- Server normalizes names to uppercase.
- Empty team name payloads preserve existing server names.

### Scores

- Blue score display.
- Orange score display.
- Blue score `+` button.
- Blue score `-` / undo goal button.
- Orange score `+` button.
- Orange score `-` / undo goal button.
- Large `BLUE GOAL` action.
- Large `ORANGE GOAL` action.

### Series Score

- Blue series display.
- Orange series display.
- Blue series `+` and `-` controls.
- Orange series `+` and `-` controls.
- Series score is capped by the selected series win requirement.

### Best-Of / Series Settings

- Series length selector supports:
  - `Bo1`
  - `Bo2`
  - `Bo3`
  - `Bo5`
  - `Bo7`
- Server calculates wins required from series type.
- Series win requirement updates when match info is applied.
- Current game number is calculated from blue series + orange series + 1.
- Series metadata fields include:
  - league name
  - week / round
  - series info

### Match Info Update Modes

- `Queue Match Info` sends `updateDisplayInfoQueued`.
- `Instant Match Info` sends `updateDisplayInfoInstant`.
- Queued updates go through normal overlay delay.
- Instant updates emit immediate full overlay state through `instantOverlayState`.
- Controller tracks dirty state for match info changes.

### Logos

- Blue logo upload.
- Orange logo upload.
- Logo preview in controller.
- Logo status text.
- Server stores logo files per room:
  - `public/overlay-assets/:roomId/blue-logo.png`
  - `public/overlay-assets/:roomId/orange-logo.png`
- Server returns cache-busted logo URLs.
- Clear logo routes exist server-side for both teams.

### Overlay Background

- Controller can upload a PNG overlay image.
- Controller can clear the overlay image.
- Server stores overlay background per room:
  - `public/overlay-assets/:roomId/overlay.png`
- Overlay background path is preserved across full reset.

### Rosters And Substitutes

- Blue active roster has 3 player fields.
- Blue substitutes have 2 player fields.
- Orange active roster has 3 player fields.
- Orange substitutes have 2 player fields.
- Controller supports click-based active/substitute swapping:
  - click a sub
  - click an active player
  - values swap in the controller form
- Server normalizes roster/substitute values to uppercase.
- Overlay displays only active roster entries, not substitute bench entries.

### Player Stats

- No dedicated player stat fields were identified in the current legacy controller.
- Current player-related data is roster and substitute names.
- Any future stat work should be treated as new module behavior unless hidden behavior is discovered later.

### Game Winner Controls

- `blueWins` marks blue as the game winner.
- `orangeWins` marks orange as the game winner.
- Server records a final-history entry with:
  - winner team
  - winner name
  - final blue score
  - final orange score
  - game number
- Server increments the winning team's series score if below the wins-required cap.
- Server resets current game score to 0-0 after marking game winner.

### Reset Controls

- Reset current game score.
- Reset series and history.
- Full reset / new match.
- Full reset preserves the uploaded overlay background path.
- Full reset emits `overlayQueueReset`.

### Undo / History

- Server stores undo snapshots before most mutating admin actions.
- Undo stack is capped at 100 snapshots.
- `Undo Last Action` restores the previous server state.
- Undo emits `overlayQueueReset`.
- History includes:
  - goal entries
  - final game result entries
- Controller renders history list and scrolls it to the newest entry.

### Overlay Delay And Timing Display

- Overlay delay is configured from the controller settings panel.
- Overlay delay is stored in server room state.
- Local controller settings persist overlay delay and hotkeys in `localStorage` under `scoreboardSettings`.
- Timing display controls:
  - start timing display
  - stop timing display
  - reset timing display
- Timing display updates locally every 100ms while running.
- Timing display state is mirrored in overlay state.

### Hotkeys

- Hotkey settings panel exists in the controller.
- Defaults include:
  - blue goal
  - orange goal
  - blue wins
  - orange wins
  - reset game
  - reset series
  - full reset
- Hotkeys are stored in browser `localStorage`.
- Hotkeys do not fire while typing in inputs, textareas, selects, or contenteditable elements.

### Team Swap

- `swapTeams` swaps:
  - team names
  - logo paths
  - active rosters
  - substitute lists
- Server increments `displayInfoVersion` after swap.

## Overlay Output Feature Inventory

### OBS / Browser Source Assumptions

- Overlay is a transparent browser page.
- Body background is transparent.
- Overlay root is fixed 1920x1080.
- Designed for OBS Browser Source usage.
- Uses Socket.IO client script served from the same app.

### Visible Scoreboard Elements

- Optional top match metadata bar:
  - league name
  - week / round
  - series info
- Blue team name.
- Orange team name.
- Blue game score.
- Orange game score.
- Blue series pips.
- Orange series pips.
- Blue logo.
- Orange logo.
- Timing compare panel.
- Blue active roster stack.
- Orange active roster stack.
- Optional overlay background image.

### Series Pips

- Pips are rendered from current series score and wins required.
- Blue pips render left-to-right.
- Orange pips render in reverse direction for visual balance.

### Logos

- Logos display when a team logo path exists.
- Logo elements hide when no logo path exists.

### Rosters

- Overlay displays up to three active roster names per team.
- Empty roster names hide their roster entry.
- Roster stack hides when all entries are empty.
- Roster text is measured and shrunk to fit its visual container.
- Substitute names are not displayed on overlay directly.

### Timing Display

- Timing compare panel appears when timing is running or has a stopped elapsed value.
- Timing display updates every 100ms while running.
- Running timing value gets a highlighted visual state.

### Overlay Delay / Queue Behavior

- Overlay schedules incoming `stateUpdate` payloads based on `overlayDelaySeconds`.
- If delay is zero, state is applied immediately.
- Scheduled states are sorted by target time.
- Overlay applies ready states in order.
- `instantOverlayState` applies display info immediately and purges obsolete queued display info.
- `overlayQueueReset` clears scheduled states and schedules the reset payload according to overlay delay when appropriate.

### Animation / Transition Behavior

- No major animation system was identified.
- Current dynamic behavior is mostly show/hide, live timing updates, delayed queue application, and roster text fitting.

## Server / State / Socket Inventory

### Express Serving

- Serves `/overlay-assets` from the runtime asset folder.
- Serves all static files from `public/`.
- Redirects:
  - `/control.html` to `/room/default-room/control`
  - `/overlay.html` to `/room/default-room/overlay`
- Serves room routes:
  - `/room/:roomId/control`
  - `/room/:roomId/overlay`

### Room State Shape

Current default state fields:

- `leagueName`
- `weekRound`
- `seriesInfo`
- `blueName`
- `orangeName`
- `blueRoster`
- `blueSubs`
- `orangeRoster`
- `orangeSubs`
- `blueScore`
- `orangeScore`
- `blueSeries`
- `orangeSeries`
- `seriesType`
- `seriesWinsRequired`
- `overlayDelaySeconds`
- `timingDisplayRunning`
- `timingDisplayStartEpochMs`
- `timingDisplayElapsedMs`
- `overlayImagePath`
- `blueLogoPath`
- `orangeLogoPath`
- `history`
- `displayInfoVersion`
- `lastInstantDisplayInfoVersion`

Each room stores:

- `state`
- `undoStack`

### Socket Roles

Admin role:

- Requires correct admin password.
- Can mutate state.
- Used by `public/control.html`.

Overlay role:

- Does not require admin password.
- Receives state.
- Used by `public/overlay.html`.

### Socket Events

Room / connection:

- `joinRoom`
- `joinAccepted`
- `joinError`
- `stateUpdate`

Match info:

- `updateDisplayInfoQueued`
- `updateDisplayInfoInstant`
- `instantOverlayState`
- `overlayQueueReset`

Scores:

- `blueGoal`
- `orangeGoal`
- `undoBlueGoal`
- `undoOrangeGoal`
- `resetGame`

Series / game result:

- `blueSeriesWin`
- `orangeSeriesWin`
- `undoBlueSeries`
- `undoOrangeSeries`
- `blueWins`
- `orangeWins`
- `resetSeries`

Timing / delay:

- `setOverlayDelay`
- `startTimingDisplay`
- `stopTimingDisplay`
- `resetTimingDisplay`

Other admin actions:

- `swapTeams`
- `fullReset`
- `undoLastAction`

### Asset Handling

HTTP routes:

- `POST /api/room/:roomId/upload-overlay`
- `POST /api/room/:roomId/clear-overlay`
- `POST /api/room/:roomId/upload-blue-logo`
- `POST /api/room/:roomId/clear-blue-logo`
- `POST /api/room/:roomId/upload-orange-logo`
- `POST /api/room/:roomId/clear-orange-logo`

Rules:

- Only PNG uploads are accepted.
- Files are stored under `public/overlay-assets/:roomId/`.
- Server sends cache-busted URLs after upload.
- Uploaded overlay background is restored into default state when the room initializes if the file exists.
- Uploaded logos are restored into default state when the room initializes if files exist.

### Local Desktop Mode

- When Electron launches the server with `ZBROADCAST_DESKTOP=1`, the default admin password warning is gentler.
- Desktop mode does not remove admin password behavior.
- Desktop mode does not bypass room/admin logic.

## Feature Preservation Checklist

### Must Preserve

- OBS browser-source overlay compatibility.
- Transparent overlay background behavior.
- Room-based controller and overlay URLs until remote architecture is intentionally changed.
- Admin-gated controller role.
- Read-only overlay role.
- Blue/orange team names.
- Blue/orange game scores.
- Blue/orange series scores.
- Best-of / series settings.
- Series pips, including reverse orange pip direction.
- Goal controls.
- Game winner controls.
- Series win controls.
- Reset game.
- Reset series.
- Full reset.
- Undo last action.
- Goal and final-result history.
- Queued display-info updates.
- Instant display-info updates.
- Overlay delay.
- Overlay queue reset behavior.
- Team logo upload/display.
- Overlay background upload/display.
- Active roster display.
- Substitute workflow in the controller.
- Team swap behavior.
- Timing compare display.
- Hotkey suppression while typing.
- `npm start`.
- `npm run desktop`.

### Preserve If Still Useful

- Browser `sessionStorage` admin key behavior.
- Browser `localStorage` scoreboard settings key.
- Current room ID parsing behavior.
- Current controller page layout sections.
- Current history visual design.
- Current roster text-fit behavior.

### Replace With New Module-Native Version

- Large standalone `control.html` controller layout.
- Legacy page-level controller settings panel.
- Embedded legacy controller framing.
- Server-shaped state if local-first module state replaces it safely.
- Old overlay markup if the new module overlay reaches parity.

### Defer Until Remote / Operator Phase

- Remote room redesign.
- Remote operator workflow.
- Multi-operator permissions.
- Cloud persistence.
- Database-backed state.
- Account-based auth.

## Migration Notes And Risks

- The old controller may contain hidden workflow behavior that is not obvious from the first UI scan.
- Overlay delay and queued/instant update behavior are high-risk and must not be lost accidentally.
- Undo and history depend on server-side snapshots and state replacement.
- Room/Admin behavior may be replaced later, but should be preserved until there is a clear remote/operator phase decision.
- Assets, logos, rosters, and substitute workflow need careful migration because they combine server files, room state, controller forms, and overlay rendering.
- OBS overlay output must remain stable during migration.
- Full reset currently preserves the overlay background path; this behavior is easy to miss.
- Instant display-info updates currently purge or patch delayed queued states; this behavior is easy to break.
- Roster text fitting happens in the overlay and should be preserved or intentionally replaced.

## Proper Module Mapping

### `public/modules/rocket-league/panel.html`

Future responsibilities:

- Live operator panel.
- Team names.
- Score controls.
- Series controls.
- Game winner controls.
- Match metadata controls.
- Roster/substitute controls.
- Logo/background controls if still module-owned.
- Timing controls if still module-owned.

Should not include:

- global Home / Preview Overlay / Change Module navigation.
- global modal backdrop.
- Dev Tools test controls.

### `public/modules/rocket-league/overlay.html`

Future responsibilities:

- Stream-facing scoreboard output.
- Team names, scores, series pips.
- Logos.
- Metadata.
- Active roster display.
- Timing display.
- Overlay background or module-native equivalent.
- Clean inactive/empty state.

Should not include:

- operator controls.
- debug controls.
- global app navigation.

### `public/modules/rocket-league/state.js`

Future responsibilities:

- Local-first Rocket League module state.
- Clear field names and defaults.
- Namespaced storage if localStorage is used.
- State reset support.
- Migration helpers if needed.

Potential namespace:

```text
zbroadcast:module:rocket-league
```

### `public/modules/rocket-league/styles.css`

Future responsibilities:

- Module panel styling.
- Module overlay styling.
- Shared Rocket League module visual tokens if useful.
- No app-wide layout or navigation styling.

### Dev Tools Hooks

Future examples:

- mock game state.
- reset module state.
- test logos and rosters.
- simulate score changes.
- force overlay states.
- queue/delay diagnostics.

Testing tools belong in the global Dev Tools Layer, not in the live panel.

### Global Modal Layer Requests

Potential future modal requests:

- confirm full reset.
- confirm series reset.
- setup match preset.
- choose/import team assets.

Modals must render through the app shell Global Modal Layer.

### Future Settings Hooks

Potential settings:

- default series type.
- overlay delay default.
- hotkey preset.
- preferred overlay theme.
- asset defaults.
- performance/reduced animation behavior.

Settings should integrate with the app Settings scene or module settings area, not a disconnected settings system.

## Non-Goals For This Inventory

This inventory does not:

- rebuild Rocket League.
- modify old files.
- change server behavior.
- integrate Twitch.
- integrate OBS WebSocket.
- remove room-based support.
- remove legacy overlay support.
- change admin behavior.
- change Socket.IO events.
- change asset upload behavior.

Use this document as a checklist before starting the proper Rocket League rebuild.
