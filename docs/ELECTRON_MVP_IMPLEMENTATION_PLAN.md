# Electron MVP Implementation Plan

## Goal

Build the smallest safe Electron MVP for ZBroadcast:

```text
Double-click or launch ZBroadcast as a desktop app
-> Caster Command opens in an app window
-> existing local server/workflow is available
-> OBS can still use the local overlay URL
```

The first Electron implementation should prove launch and dashboard flow only. It should not rewrite the scoreboard, overlay, room system, Socket.IO logic, assets, history, undo, overlay delay, or queued/instant update behavior.

## Likely Files To Add

These are likely additions for the first Electron MVP:

- `electron/main.js`
  - Electron main process.
  - Starts or connects to the local ZBroadcast server.
  - Creates the first desktop window.
  - Loads Caster Command.
  - Handles app shutdown.

- `electron/preload.js`
  - Optional preload bridge for safe desktop-only helpers.
  - Should stay minimal for the first MVP.
  - May expose app/version/server info to Caster Command later.

- `public/caster-command.html`
  - First desktop dashboard/main menu.
  - Can be served by the existing Express static file setup.
  - Should link into the existing control and overlay workflow.

- `public/caster-command.js`
  - Optional dashboard behavior if separating script from HTML.
  - Copies overlay URL.
  - Opens control route or overlay preview.
  - Shows basic server/room information.

- `public/caster-command.css`
  - Optional dashboard styling if separating styles from HTML.

- `electron/README.md`
  - Optional short notes for how the MVP shell works.

- Build/package config files later, once the launch flow is proven.

## Files Likely To Change Later

These files may need small changes later, but should not be changed until the first Electron path is ready:

- `package.json`
  - Add Electron dependency after explicit approval.
  - Add desktop start scripts.
  - Add packaging scripts later.

- `package-lock.json`
  - Will update only when packages are installed after approval.

- `server.js`
  - May later export a server start/stop function instead of immediately listening.
  - May later accept a desktop-selected port.
  - May later expose a Caster Command route if needed.
  - Should not be refactored in the first MVP unless absolutely necessary.

- `public/control.html`
  - May later gain desktop-aware navigation back to Caster Command.
  - Should not be changed for the first MVP.

- `public/overlay.html`
  - May later need desktop-safe asset path handling.
  - Should not be changed for the first MVP.

- App icon, installer, and packaging metadata files.

## What Should Not Be Touched First

Do not touch these behaviors in the first Electron implementation:

- Scoreboard state shape.
- Room ID rules.
- Socket.IO events.
- Control page operator actions.
- Overlay rendering.
- OBS browser-source behavior.
- Server-side asset upload and storage behavior.
- Logo behavior.
- Roster and substitute behavior.
- History behavior.
- Undo behavior.
- Overlay delay behavior.
- Queued update behavior.
- Instant update behavior.
- Admin/control and overlay role behavior.

Do not edit these files in the first implementation unless the user explicitly approves a narrow change:

- `server.js`
- `public/control.html`
- `public/overlay.html`
- `package.json`
- `package-lock.json`

## Starting Or Connecting To The Existing Server

The safest first approach is for Electron to treat the current Node server as the compatibility core.

Preferred first MVP behavior:

1. Electron checks whether the expected local ZBroadcast server is already responding.
2. If not responding, Electron starts the existing server as a child process using Node.
3. Electron waits until the server responds locally.
4. Electron opens the first app window to Caster Command.
5. Caster Command links to existing local routes.

Default target URLs:

```text
Caster Command: http://localhost:3000/caster-command.html
Control:        http://localhost:3000/room/default-room/control
Overlay:        http://localhost:3000/room/default-room/overlay
```

For the first MVP, use the current default port `3000` unless it is already occupied.

Port conflict handling should be simple at first:

- If port `3000` is already running ZBroadcast, connect to it.
- If port `3000` is occupied by something else, show a clear error in the desktop app.
- Do not add automatic dynamic port switching until OBS URL behavior is designed.

Reason: OBS needs a stable overlay URL. Dynamic ports create operator confusion unless Caster Command clearly owns the URL workflow.

## First Caster Command Dashboard

Caster Command should be an operational main menu, not a marketing page.

The first version should contain:

- App title: `ZBroadcast`
- Current session/room: `default-room`
- Server status: starting, running, or error
- Control button: open `/room/default-room/control`
- Overlay preview button: open `/room/default-room/overlay`
- Copy OBS overlay URL button
- Displayed OBS overlay URL
- Short status area for copied URL or server errors

Optional but safe additions:

- Open control in the current Electron window.
- Open control in an external browser.
- Open overlay preview in a second Electron window.

Do not add full match controls to Caster Command in the first MVP. The existing control page remains the production control surface.

## OBS Overlay Output

OBS should continue using the local overlay URL:

```text
http://localhost:3000/room/default-room/overlay
```

The Electron shell should not require OBS to capture an Electron window.

This preserves:

- transparent overlay behavior,
- 1920x1080 browser-source output,
- existing Socket.IO state updates,
- existing overlay delay handling,
- existing asset/logo/background rendering,
- existing room route behavior.

Caster Command should make the OBS URL easy to copy and verify.

## Risks

### Ports

- Port `3000` may already be in use.
- Dynamic ports would break or complicate the OBS URL.
- A future version may need a port setting, but the first MVP should keep this stable and explicit.

### Server Startup

- Electron must not open Caster Command before the server is ready.
- If server startup fails, the app should show a clear error instead of a blank window.
- If another ZBroadcast server is already running, Electron should connect instead of starting a duplicate.

### App Shutdown

- Electron should shut down the child server process it started.
- Electron should not kill a server process it did not start.
- Unexpected shutdowns can leave a child process running if not handled carefully.

### Packaging

- Packaging Node plus Electron can be larger than expected.
- Relative paths may behave differently in development and packaged builds.
- Runtime writable folders such as uploaded assets need a later desktop-safe plan.
- Installer and auto-update work should wait until the MVP launch flow is proven.

### Security

- Keep the local app local by default.
- Do not weaken admin/control role behavior during desktop wrapping.
- Do not expose remote operator functionality as part of the first MVP.

## Exact First Implementation Steps

1. Confirm the current web app still runs with `npm start`.
2. Confirm the current control and overlay routes still work.
3. Add a minimal Caster Command page as a new static file.
4. Keep Caster Command limited to launch/navigation/status actions.
5. Add the minimal Electron main process file.
6. Make Electron check whether `http://localhost:3000` is already serving ZBroadcast.
7. If not running, make Electron start the current Node server as a child process.
8. Add a readiness wait before loading Caster Command.
9. Open Caster Command in the first Electron window.
10. Add a clean shutdown path for the child server process Electron started.
11. Add package scripts and Electron dependency only after explicit approval to install packages.
12. Run the current smoke test checklist against the Electron-launched app.
13. Verify OBS can still use `http://localhost:3000/room/default-room/overlay`.
14. Do not package an installer until the development launch flow works reliably.

## First MVP Success Criteria

- ZBroadcast launches from a desktop command or app wrapper.
- Caster Command opens first.
- The existing local server is available.
- The existing control page still works.
- The existing overlay page still works.
- OBS can still use the local overlay URL.
- No current production behavior is rewritten or broken.
