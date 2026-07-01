# Desktop Shell Decision

## Goal

Decide the safest first desktop-wrapper approach for ZBroadcast.

Current ZBroadcast is a working Node.js + Express + Socket.IO web app with:

- `server.js`
- `public/control.html`
- `public/overlay.html`
- OBS Browser Source overlay output
- room-based URLs
- server-side assets
- logos
- rosters
- history
- undo
- overlay delay
- queued and instant updates

The desktop target is:

```text
Double-click ZBroadcast as a normal PC app
-> Caster Command dashboard opens
-> existing local server/workflow is available
-> OBS can still use the overlay output
-> remote rooms/operators remain future architecture
```

The first desktop MVP should prove launch and dashboard flow without breaking the current web app.

## Option 1: Electron

### What It Means For This Repo

Electron would add a desktop app wrapper around the existing Node app. The existing server could continue to run locally, and Electron could open a desktop window pointed at a new Caster Command dashboard served by the local app or bundled as a local page.

This would likely mean adding Electron-specific files later, such as a main process file and packaging config. The current `server.js`, `control.html`, and `overlay.html` could remain mostly intact for the first MVP.

### Beginner Difficulty

Moderate.

Electron is JavaScript-first and fits the current repo's Node stack, but desktop packaging, app lifecycle, ports, child processes, and installer output introduce new concepts.

### Existing Code Reuse

High.

The current Node/Express/Socket.IO server can be reused directly or with light startup wrapping. The current control and overlay pages can keep working through the same local routes.

### Launching Current Workflow

Electron can:

- start the local Express server from the desktop app,
- open Caster Command in the first app window,
- provide buttons that open `/room/default-room/control`,
- provide a copyable OBS overlay URL for `/room/default-room/overlay`,
- optionally open overlay preview in another Electron window.

### OBS Integration

Good.

OBS can keep using a browser-source URL from the local server. This preserves the current OBS workflow and avoids forcing OBS to capture an Electron window.

### Twitch/EventSub Integration

Good future fit.

Twitch/EventSub integration can stay in Node, which matches the current server runtime. Local OAuth callback handling, WebSocket clients, and API calls are all common in Node/Electron apps.

### Risks

- Adds a large desktop runtime.
- Packaging and auto-update choices can become complex.
- The app must manage server startup/shutdown cleanly.
- Port conflicts need a plan.
- Care is needed to avoid mixing desktop shell work with unrelated app refactors.

### Good First Step?

Yes, if the first implementation is very small.

Electron is the most natural wrapper for the current Node-based prototype because it can reuse the existing runtime and web UI with minimal behavior changes.

## Option 2: Tauri

### What It Means For This Repo

Tauri would add a Rust-based desktop shell around a web frontend. The current Node server would either need to keep running as a sidecar process or be replaced/reworked over time.

For this repo, the safest Tauri version would still launch the existing Node server rather than rewrite the app in Rust.

### Beginner Difficulty

High.

Tauri is efficient, but it adds Rust, Tauri config, sidecar process management, platform setup, and a different desktop security model.

### Existing Code Reuse

Medium to high only if Node stays as a sidecar.

The current HTML pages can be reused. The current Node server can be reused if packaged as a sidecar. But the desktop layer itself does not naturally live in the same runtime as the current app.

### Launching Current Workflow

Tauri could:

- launch the current Node server as a sidecar,
- open Caster Command in a Tauri window,
- keep the existing control and overlay routes available locally,
- expose the overlay URL to OBS.

This is possible, but process management and packaging are more involved than Electron.

### OBS Integration

Good if the local server remains.

OBS can still use the local overlay route. Tauri itself does not improve the OBS path unless it preserves the current browser-source URL.

### Twitch/EventSub Integration

Good long-term, but more complex early.

Twitch/EventSub can be handled in Node sidecar code or Rust. Keeping it in Node preserves current project direction. Moving it to Rust would be premature for the desktop MVP.

### Risks

- Adds Rust and Tauri concepts before the desktop product shape is proven.
- Sidecar packaging can create beginner-unfriendly build/debug problems.
- Rewriting server logic into Rust would be a large and risky detour.
- The app could split into two runtimes too early.

### Good First Step?

Not recommended for the first MVP.

Tauri may be attractive later for a smaller desktop footprint, but it is not the safest first wrapper for a working Node/Socket.IO prototype.

## Option 3: Neutral/Custom Local Launcher

### What It Means For This Repo

A neutral launcher means creating a small local wrapper that starts the existing Node server and opens a browser or simple local dashboard. It could be a batch file, PowerShell script, lightweight executable, or small custom launcher.

The current repo would stay almost unchanged. The launcher would mainly hide `npm start` and open the right URL.

### Beginner Difficulty

Low to moderate.

A simple script is easy. A polished custom executable or installer is more work. The approach can start simple and become more formal later.

### Existing Code Reuse

Very high.

The existing server, control page, overlay page, routes, Socket.IO flow, assets, and OBS behavior all remain exactly as they are.

### Launching Current Workflow

A launcher can:

- start `node server.js`,
- wait for the local server to be available,
- open a browser to Caster Command or the current control route,
- leave the overlay route available for OBS.

For the first version, Caster Command could still be a web page served by the existing app.

### OBS Integration

Very good.

OBS continues to use the same local browser-source URL. This is the least disruptive path for current productions.

### Twitch/EventSub Integration

Neutral.

Future Twitch/EventSub work can remain in Node. The launcher does not block it, but it also does not provide a full desktop app framework for auth windows, tray behavior, app menus, or packaged settings.

### Risks

- May feel less like a real desktop app at first.
- Browser window experience is not the same as a dedicated app window.
- Process cleanup can be rough if implemented as a simple script.
- Packaging and distribution still need a later decision.
- It proves launch flow, but not the full desktop shell.

### Good First Step?

Good as a temporary proof, but not the best final desktop MVP.

This is the safest technical bridge if the only goal is to prove double-click startup without introducing a desktop framework. However, it may need to be replaced by Electron or another shell once Caster Command becomes a real app window.

## Option 4: Wait And Keep Web-Only For Now

### What It Means For This Repo

The repo stays as a Node.js web app. Work continues on the current control and overlay pages without adding a desktop wrapper.

### Beginner Difficulty

Lowest.

No new desktop concepts are introduced.

### Existing Code Reuse

Complete.

Everything remains as-is.

### Launching Current Workflow

The current workflow remains:

- run `npm start`,
- open the control URL in a browser,
- load the overlay URL in OBS.

This does not meet the desktop target by itself.

### OBS Integration

Unchanged and currently working.

OBS continues to use the overlay URL exactly as it does now.

### Twitch/EventSub Integration

Fine for future web/server work.

Twitch/EventSub can be added to the Node app later, but the user experience would still be web-app-first unless a desktop shell is added.

### Risks

- Does not validate the desktop app direction.
- Keeps startup friction in place.
- Caster Command remains conceptual.
- More web-only work may make the later desktop migration larger.

### Good First Step?

Not if the goal is to start the desktop pivot.

Waiting is safest for current behavior, but it does not prove the target launch/dashboard experience.

## Recommendation

Recommended first desktop MVP: **Electron wrapper around the existing local Node server**.

This is the most conservative real desktop-app step because it reuses the current Node/Express/Socket.IO system instead of replacing it. It can prove the key product flow:

```text
Double-click ZBroadcast
-> Electron starts the local server
-> Caster Command opens in the first desktop window
-> existing control page remains available
-> existing overlay URL remains available for OBS
```

The first Electron implementation should be intentionally small:

- Do not rewrite `server.js`.
- Do not rewrite `control.html`.
- Do not rewrite `overlay.html`.
- Do not change scoreboard behavior.
- Add only the minimum desktop shell needed to launch the app and show Caster Command.
- Keep OBS using a local browser-source URL.
- Keep remote rooms/operators as future architecture.

## Why Not Tauri First?

Tauri is not the safest first step because it adds Rust and sidecar packaging complexity before the desktop product flow is proven. It may be worth revisiting later if app size, security model, or installer polish become more important than implementation simplicity.

## Why Not Only A Custom Launcher?

A custom launcher is the safest temporary bridge, but it does not fully prove the desktop app experience. It can be useful as a short-lived stepping stone, but the first real desktop MVP should open Caster Command inside an app window.

## Why Not Wait?

Keeping web-only avoids risk, but it does not move ZBroadcast toward the stated desktop target. The next step should be small enough to protect the current app while still validating the desktop launch flow.

## First Implementation Boundary

The first implementation should be considered successful when:

- ZBroadcast can be launched like a normal PC app.
- Caster Command appears first.
- The current local server/workflow is still available.
- OBS can still use the overlay output.
- No current scoreboard, overlay, asset, history, undo, delay, or queued/instant update behavior is broken.
