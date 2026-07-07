# Current State

## Project Structure

```text
ZBroadcast_Overlay/
  .gitignore
  package.json
  package-lock.json
  server.js
  docs/
    ProjectHistorySummaries.txt
    CURRENT_STATE.md
    DESKTOP_PIVOT_PLAN.md
  public/
    caster-command.html
    modules/
      rocket-league/
        panel.js
        panel.css
        overlay.html
        state.js
        styles.css
      predictions/
    overlay-assets/        # Created at runtime when assets are uploaded
  node_modules/            # Local installed dependencies
```

The repository is currently a desktop-first app shell backed by a local Node.js server. Caster Command owns the normal operator flow. Rocket League now runs as an app-mounted module panel with a separate module overlay output.

## Current Files

### `server.js`

Runs the Express and Socket.IO server.

Current responsibilities:

- Serves static files from `public/`.
- Holds in-memory room state for each room ID.
- Validates room IDs with a conservative alphanumeric, underscore, and dash allowlist.
- Allows overlay sockets to join without an admin password.
- Stores uploaded PNG assets under `public/overlay-assets/:roomId/`.
- Supports upload and clear routes for overlay background, blue logo, and orange logo assets.
- Broadcasts authoritative room state over Socket.IO.
- Tracks game score, series score, match metadata, rosters, substitute fields, team logos, overlay delay, timing display state, history, and undo snapshots.
- Supports queued display-info updates and instant display-info updates.
- Emits overlay-specific events such as `instantOverlayState` and `overlayQueueReset` to keep delayed overlay queues coherent.

Main HTTP routes:

- `POST /api/room/:roomId/upload-overlay` stores a PNG overlay background.
- `POST /api/room/:roomId/clear-overlay` removes the room overlay background.
- `POST /api/room/:roomId/upload-blue-logo` stores a PNG blue-team logo.
- `POST /api/room/:roomId/clear-blue-logo` removes the blue-team logo file.
- `POST /api/room/:roomId/upload-orange-logo` stores a PNG orange-team logo.
- `POST /api/room/:roomId/clear-orange-logo` removes the orange-team logo file.

Main Socket.IO events:

- `joinRoom`
- `updateDisplayInfoQueued`
- `updateDisplayInfoInstant`
- `blueGoal`
- `orangeGoal`
- `undoBlueGoal`
- `undoOrangeGoal`
- `resetGame`
- `blueSeriesWin`
- `orangeSeriesWin`
- `undoBlueSeries`
- `undoOrangeSeries`
- `blueWins`
- `orangeWins`
- `setOverlayDelay`
- `startTimingDisplay`
- `stopTimingDisplay`
- `resetTimingDisplay`
- `resetSeries`
- `swapTeams`
- `fullReset`
- `undoLastAction`

### `public/caster-command.html`

The desktop-first app shell and normal operator interface.

Current responsibilities:

- Provides Main Menu, Module Select, Control Room, Settings, Dev Tools, and Preview Overlay scenes.
- Loads module catalog metadata from `public/modules/catalog.json`.
- Mounts normal app panels such as Rocket League from module `panelScriptUrl` metadata.
- Keeps iframe panel fallback available for compatibility modules.
- Routes Preview Overlay and Control Room background preview to the active module overlay output.
- Owns global modals and navigation.

### `public/modules/rocket-league/panel.js`

The active Rocket League Control Room panel.

Current responsibilities:

- Renders the Rocket League operator panel as app DOM inside Caster Command.
- Uses local module state under `zbroadcast:module:rocket-league`.
- Provides Match Setup, Teams, saved teams, score controls, event history, undo, reset, and Swap Teams.
- Requests app modals through the global modal layer.

### `public/modules/rocket-league/overlay.html`

The Rocket League Preview Overlay / OBS output.

Current responsibilities:

- Reads local Rocket League module state.
- Renders the broadcast-facing Rocket League scorebug.
- Displays team names, logos, scores, match info, series pips, and active-player stacks.
- Applies instant display-info updates immediately and purges older delayed display-info state where needed.
- Clears scheduled overlay states when reset events require the queue to be rebuilt.

### `package.json`

Defines the Node project metadata, `npm start` script, and runtime dependencies.

Current dependencies:

- `express`
- `socket.io`
- `multer`

### `package-lock.json`

Locks the exact installed dependency tree for reproducible npm installs.

### `.gitignore`

Currently ignores local dependency and runtime-output style files as configured for this repo.

### `docs/ProjectHistorySummaries.txt`

Historical project notes from earlier design and development conversations. It is useful context, but parts of it are older than the current code.

### `node_modules/`

Local dependency install folder. It is not application source and should not be edited manually.

### `public/overlay-assets/`

Runtime asset storage created and used by the server. Uploaded room assets are expected to live under room-specific folders such as:

```text
public/overlay-assets/default-room/overlay.png
public/overlay-assets/default-room/blue-logo.png
public/overlay-assets/default-room/orange-logo.png
```

The code serves those files through `/overlay-assets/...` URLs with cache-busting query strings.

## Current Tech Stack

- Node.js
- npm
- Express 4
- Socket.IO 4
- Multer
- HTML
- CSS
- Browser JavaScript
- OBS Browser Source
- Local filesystem asset storage
- Browser `localStorage` for operator hotkey/settings preferences
- Browser `sessionStorage` for room admin password entry during a session

## Features That Already Work

- Local web server launched with `npm start`.
- Caster Command app shell with Main Menu, Module Select, Control Room, Settings, Dev Tools, and Preview Overlay.
- Rocket League app-mounted Control Room panel.
- Rocket League module overlay output.
- Control Room background preview using the active Preview Overlay output.
- Predictions module still available through the module system.
- Local module state sync between Rocket League panel and overlay.
- Blue and orange team names.
- Blue and orange game scores.
- Blue and orange series scores.
- Best-of selection with calculated wins required for Bo1, Bo2, Bo3, Bo5, and Bo7.
- Score increment and decrement.
- Series increment and decrement.
- Marking blue or orange as game winner, pushing history, advancing series, and resetting the current game score.
- Reset current game.
- Reset series and history.
- Undo last meaningful Rocket League event.
- Swap team names, logos, rosters, and subs between blue and orange.
- Match metadata fields for event name, division/season/etc, week/round, and series length.
- Roster fields for three active players and two substitutes per team.
- Active/substitute roster swapping in the Teams modal.
- Saved Rocket League team library.
- Overlay display of team logos.
- Event history rendering in the Control Room panel.
- OBS-compatible module overlay page with transparent body and fixed 1920x1080 canvas.

## Features That Must Be Preserved

- OBS Browser Source compatibility.
- Stable module overlay URLs, especially `public/modules/rocket-league/overlay.html`.
- Caster Command module navigation.
- Blue/orange side conventions.
- Fast local score changes.
- Manual operator workflow for goals, game winners, series wins, resets, and undo.
- Series pips.
- Module-scoped team logos and colors.
- Overlay output without operator controls.
- Undo/history behavior that operators rely on during live production.
- Hotkeys that do not trigger while typing.
- Current match metadata, roster, logo, and timing-display concepts.

## Known Risks And Fragile Areas

- Room state is in memory only. Restarting the Node process resets match state, undo stacks, and history.
- Uploaded PNG files persist on disk, but the relationship between persistent files and in-memory state is rebuilt only through default-state file checks.
- There is no database or durable state store.
- Admin authentication is a single shared password, and the default value is intentionally unsafe for public deployment.
- Upload routes are not independently authenticated by HTTP middleware; they rely on obscurity of local/private use rather than a verified admin session.
- Only PNG uploads are accepted. That is simple and OBS-safe, but may surprise users with JPEG/WebP assets.
- File uploads use synchronous filesystem writes and deletes.
- Overlay timing uses client/server wall-clock assumptions and browser timers, not a production-grade synchronized clock.
- Delayed overlay queue logic is more complex than the base scoreboard flow and should be treated carefully.
- Undo snapshots clone whole room state through JSON serialization. This is simple, but it can become heavy if state grows.
- The server stores all active rooms in a plain object with no cleanup lifecycle.
- `fullReset` preserves the overlay background path but resets other state to defaults; this behavior should be reviewed before changing reset semantics.
- Logo clear functions in the control UI clear pending logo paths locally; server clear routes exist, but the current UI flow should be checked carefully before relying on disk cleanup behavior.
- The current UI is a single large HTML file for control and a single large HTML file for overlay. This is workable now, but fragile as the app grows.
- Browser storage keeps operator settings local to one browser profile. Different operators/devices may have different hotkeys and settings.
- The overlay is fixed at 1920x1080 and assumes OBS/browser-source usage at that resolution.

## Deployment And Local Run Assumptions

- The app is expected to run with Node.js installed.
- Dependencies are installed with npm.
- The normal local command is:

```bash
npm start
```

- The server listens on `process.env.PORT` or port `3000`.
- Local app URL:

```text
http://localhost:3000/caster-command.html
```

- Rocket League module overlay URL:

```text
http://localhost:3000/modules/rocket-league/overlay.html
```

- The overlay URL is intended to be loaded into OBS as a Browser Source.
- The server process needs filesystem write access to `public/overlay-assets/`.
- Uploaded room assets are stored locally on the server machine. Moving to a hosted or packaged desktop app should preserve an equivalent writable asset location.
