# Control Room Shell Plan

## Goal

Document the intended Control Room shell architecture for ZBroadcast as it moves from embedded legacy pages toward a desktop-first broadcast control app.

The key idea is simple: Control Room should become one persistent desktop app scene. The app shell should stay constant while the active module control surface changes inside it.

Rocket League is the first official module, but it is not the final layout standard.

## Core Idea

Control Room should behave like a stable production workspace:

- The Control Room scene stays open as the main live-operation area.
- The app shell remains constant.
- Only the active module control surface changes.
- Navigation and quick controls stay in predictable locations.
- Module setup happens before live operation, not as clutter over the live scene.

The current Rocket League controller is still embedded from the old web app. That is acceptable for now because it preserves working scoreboard behavior while the desktop shell improves around it.

## Layered Model

The long-term Control Room should use a layered, sandwich-style model.

### Back Layer: Live Monitor

- Optional low-opacity live overlay preview or broadcast monitor.
- Helps the operator see output context without leaving Control Room.
- Should not block clicks or interfere with the active module.
- Should be subtle enough that controls remain readable.

### Middle Layer: Active Module

- The active module control surface lives here.
- Rocket League Scoreboard is the first module.
- Future modules, such as Predictions, should use this same layer.
- This layer should be the main working area during a live session.

### Top Layer: Floating App Controls

- Home.
- Change Module.
- Preview Overlay.
- Future quick actions.

These controls should stay lightweight and consistently positioned. They should not become a large title bar or full-width toolbar.

## What Belongs In The Control Room Shell

- Home navigation.
- Change Module navigation.
- Preview Overlay access.
- Future quick actions.
- Active module area.
- Optional live monitor background.
- Shared shell behavior such as loading/error states.
- Shared resize and layout handling.

## What Does Not Belong There

- Large title bars.
- Repeated module name labels.
- Cluttered status text.
- Module selection UI during live operation.
- Store, monetization, or account upgrade content.
- Heavy setup flows while the operator is already in a live Control Room session.

Module context should come from the setup/selector flow, not from labels stacked over the live scene.

## Rocket League Current Role

Rocket League is currently an app-mounted module panel loaded from `public/modules/rocket-league/panel.js`.

Current role:

- It is officially registered as a module.
- It launches from the Control Room setup flow.
- It uses `public/modules/rocket-league/overlay.html` as its overlay output.
- It should remain functional while the app shell improves around it.

Important constraint:

- Full Rocket League UI cleanup is future work.
- Do not block other module work on rewriting the Rocket League controller.
- Preserve existing scoreboard behavior until a safer replacement path exists.

## Future Module Behavior

Future modules should fit into the same Control Room shell.

Expected direction:

- Predictions should fit into the middle module layer.
- Stream modules and esports modules should share the same shell.
- Multiple modules should eventually be selected and configured from setup.
- Live operation should not show messy module labels or setup controls over the active scene.

The Control Room should feel like one app scene with interchangeable tools, not a set of unrelated webpages.

## Local Desktop Priority

ZBroadcast should keep moving toward local-first desktop use.

Priorities:

- The desktop app should feel like the product.
- Local config/settings should come before heavy module expansion.
- Local server, port, OBS URL, and operator preferences should become easier to manage.
- Web/Railway behavior can remain supported, but it should not drive the immediate app structure.

Remote rooms and remote operators remain future architecture.

## Near-Term Implementation Plan

Keep the work in small, safe branches.

1. Implement the Control Room shell foundation.
2. Add an optional low-opacity live overlay monitor behind the module layer.
3. Improve resize behavior around the shell and embedded module area.
4. Add a Settings scene MVP for local desktop configuration.
5. Build Predictions as the first stream-level proof-of-concept module.

Each step should preserve:

- `npm start`.
- `npm run desktop`.
- Existing Rocket League controller behavior.
- Existing overlay output behavior.
- OBS Browser Source compatibility.

The right path is steady: make the desktop shell feel real first, then expand modules once the shell is stable.
