# Rocket League Module Plan

## Goal

Plan Phase 3C - Rocket League Module Integration.

The current Rocket League controller works, but it is still a large standalone web control page embedded inside the desktop app shell. Phase 3C should gradually turn it into the first official ZBroadcast module without breaking current scoreboard behavior.

## Current State

- Rocket League scoreboard/control currently lives in `public/control.html`.
- Overlay output currently lives in `public/overlay.html`.
- Server, state, room, asset, and Socket.IO behavior currently lives in `server.js`.
- The desktop app currently launches the controller through the Control Room flow.
- The current desktop app shell treats Rocket League as a selectable Control Room module, but the controller itself is not yet module-aware.

## What Must Be Preserved

- Score controls.
- Series controls.
- Team names.
- Rosters/subs.
- Logos.
- Overlay background.
- History.
- Undo.
- Overlay delay.
- Timing display.
- Queue/instant update behavior.
- OBS browser-source overlay output.
- Room-based URLs.
- `npm start` behavior.
- `npm run desktop` behavior.

## Problems With The Current Embedded Approach

- The old control page has its own layout and spacing.
- App wrapper controls are separate from the controller page.
- Responsive/windowed behavior is rough.
- Module selection exists in the app shell, but the controller itself is not yet module-aware.
- `control.html` is large and fragile.
- Any direct rewrite of `control.html` risks breaking working production behavior.

## Desired Module Direction

Rocket League Scoreboard should become the first official ZBroadcast module.

Proposed module definition:

```text
module id: rocket-league-scoreboard
display name: Rocket League Scoreboard
category: Esports
supported control surface: current scoreboard controller
overlay output: current OBS browser-source overlay
future settings: series type, overlay delay, hotkeys, assets, timing display
future presets: Rocket League Cast
compatibility metadata: local desktop, OBS browser source, room-based workflow
```

The first version of the module system should describe the current working module. It should not force a rewrite of the controller.

## Recommended Migration Phases

### Phase 3C-1: Module Metadata / Config Only

Add static metadata that describes Rocket League Scoreboard.

This should include:

- module id
- display name
- category
- usable/disabled state
- control route
- overlay route
- preset membership
- short internal notes

No scoreboard behavior should change in this step.

### Phase 3C-2: App Shell Reads Module Metadata

Update the Control Room selector to read module labels/routes from metadata instead of hardcoded labels.

Keep this small:

- Rocket League still launches the same existing controller route.
- Rocket League Cast still selects Rocket League.
- START still gates on the runnable Rocket League module.

### Phase 3C-3: Create A Module Wrapper Route/Page If Needed

If the desktop shell needs better structure, add a lightweight module wrapper page or route.

This wrapper could own:

- desktop module framing
- Home / Preview Overlay controls
- future module-specific shell behavior

It should still embed or load the existing `public/control.html` until a safer split exists.

### Phase 3C-4: Improve Embedded Controller Wrapper / Navigation

Make the current embedded controller feel more like part of the desktop app.

Safe improvements may include:

- cleaner wrapper spacing
- consistent app navigation
- clearer preview overlay access
- better handling of desktop window sizes

Do not edit the controller internals unless a specific bug requires it.

### Phase 3C-5: Later Split `control.html` Into Smaller Module Files

Only split `control.html` after behavior is protected.

Possible later split:

- controller markup
- controller styles
- controller client logic
- shared module config

This should be done carefully because `control.html` is currently the working production controller.

### Phase 3C-6: Later Improve Responsive Desktop Layout

Once the module shell is stable, improve the Rocket League controller layout for desktop windows.

This may include:

- better scaling at smaller window sizes
- more desktop-native spacing
- less page-style scrolling
- clearer module navigation

This should happen after the current control behavior has test coverage or a reliable smoke-test path.

## What Not To Do Yet

- Do not rewrite `control.html` yet.
- Do not rewrite `overlay.html` yet.
- Do not change Socket.IO events yet.
- Do not change the server state shape yet.
- Do not break Railway/web app behavior.
- Do not move to a database yet.
- Do not add Twitch integration yet.
- Do not add OBS integration yet.
- Do not combine remote operator architecture with this module cleanup phase.

## First Recommended Coding Step

The smallest first code change after this document should be:

Add static module metadata/config that describes Rocket League Scoreboard, then use that metadata in the app shell instead of hardcoded Control Room labels/routes.

Recommended first implementation shape:

- Add a small module metadata source.
- Define Rocket League Scoreboard in that metadata.
- Keep the control route as `http://localhost:3000/room/default-room/control`.
- Keep the overlay route as `http://localhost:3000/room/default-room/overlay`.
- Update the Caster Command Control Room selector to read display labels and routes from that metadata.
- Do not touch `server.js`, `public/control.html`, or `public/overlay.html` for this first step.

That gives ZBroadcast a real module foundation while keeping the working scoreboard safe.
