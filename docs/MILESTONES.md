# ZBroadcast Milestones

## Current Project Status Summary

ZBroadcast is a working broadcast overlay/control system that is pivoting from a web-app-first tool into a desktop-first broadcast control app.

The current app already supports a real production-style workflow: launch the server, open control, open overlay output, update match state live, and use OBS Browser Source for broadcast output. The desktop foundation is now underway so ZBroadcast can launch like a normal PC app and open Caster Command first.

## Completed Milestones

### Phase 1 - Core Scoreboard: Complete

The core scoreboard phase is complete.

Completed capabilities:

- Working Node.js + Express + Socket.IO app.
- Real-time scoreboard control.
- OBS overlay output.
- Room-based control and overlay pages.
- Server-side overlay assets.
- Team logos.
- Rosters and substitutes.
- Match history.
- Undo behavior.
- Overlay delay.
- Timing display.
- Queued metadata updates.
- Instant metadata updates.
- Existing web workflow still available through `npm start`.

### Phase 2 - Remote/Railway Support: Complete

The remote testing phase is complete.

Completed capabilities:

- App was deployed for remote testing.
- Remote control and overlay workflow was tested.
- Temporary admin password flow was used for remote/Railway testing.
- Remote rooms/operators were validated as possible future architecture.

Important note: remote support is not the immediate foundation of the desktop pivot. It remains future architecture while the local desktop app becomes the primary product path.

### Phase 3A - Desktop Shell MVP: Complete

The first desktop shell milestone is complete.

Completed capabilities:

- Electron has been added for local desktop development.
- `npm run desktop` works as the desktop launch path.
- Caster Command/dashboard opens first.
- The app can navigate to Control inside the Electron window.
- The app can navigate to Overlay Preview inside the Electron window.
- The old web app still works with `npm start`.
- The desktop shell preserves the existing server/control/overlay workflow.

Known watch item:

- The first desktop launch may be slower than later launches. This should be watched during testing, but it is not currently a blocker.

### Phase 3B - Main Menu / Control Room Flow: Complete

The first real in-app product flow is complete.

Completed capabilities:

- Game-style main menu added.
- Control Room setup flow added.
- Stream / Esports / Presets selector added.
- START flow added.
- Existing Rocket League controller launches from Control Room.
- Preview Overlay flow works.
- Home navigation works.
- Existing `server.js`, `public/control.html`, and `public/overlay.html` behavior preserved.

## Current Active Phase

### Phase 3 - Desktop Foundation: In progress

The active phase is building the desktop foundation without breaking the working web overlay system.

Current active sub-phase:

### Phase 3C - Rocket League Module Integration

Phase 3C is about turning the current embedded Rocket League controller into a cleaner first-class desktop module over time, while preserving the working scoreboard behavior.

Progress so far:

- Rocket League module plan added.
- Module catalog created.
- Rocket League defined as the first active/runnable module.
- Control Room selector reads module catalog data.
- Launch flow is module-aware.
- Embedded wrapper strip was removed.
- Existing `public/control.html` and `public/overlay.html` behavior preserved.

Current focus:

- Keep Caster Command as the first desktop screen.
- Keep the existing Rocket League scoreboard behavior working.
- Improve the embedded controller experience gradually.
- Keep OBS using the local overlay URL.
- Keep local desktop testing smooth.
- Avoid rewriting scoreboard, overlay, room, Socket.IO, asset, history, undo, delay, or queued/instant update behavior too early.

## Next Major Milestone

### Phase 4 - Personal Live Tests

The next major milestone is personal live testing.

Goal:

- Use ZBroadcast in a real or near-real production scenario controlled by the project owner.
- Validate that the desktop launch flow, control page, overlay preview, and OBS output are usable under live pressure.
- Identify production friction before involving outside testers.

## Future Milestone Ladder

### Phase 3C - Rocket League Module Integration

Goal:

- Turn the current embedded Rocket League controller into a cleaner first-class desktop module over time.
- Preserve the working scoreboard behavior while improving the desktop module wrapper.
- Keep the current controller usable until each replacement piece is proven.

### Phase 3D - Caster Command Dashboard v1

Goal:

- Turn Caster Command from a placeholder into a useful production home screen.
- Keep it focused on session status, production links, OBS URL, server state, and operator readiness.
- Do not move full match controls into Caster Command until the current workflow is protected.

### Phase 3E - Personal Live Test Candidate

Goal:

- Prepare a build/workflow that is good enough for the project owner to use in a controlled live test.
- Confirm the smoke checklist passes.
- Confirm OBS workflow is stable.
- Confirm recovery paths are clear if something goes wrong.

### Phase 4 - Personal Live Tests

Goal:

- Run ZBroadcast in personal live or rehearsal productions.
- Record issues, friction, missing controls, and reliability concerns.
- Decide what must be fixed before private outside testers use it.

### Phase 5 - Private Closed Live Tests

Goal:

- Let trusted users/operators test ZBroadcast in controlled real productions.
- Collect feedback on setup, desktop launch, control workflow, OBS setup, and live reliability.
- Keep the test group small enough to fix issues quickly.

### Phase 6 - Public Open Tests / Beta

Goal:

- Open testing to a wider group.
- Improve onboarding, documentation, packaging, and error handling.
- Begin treating remote operator architecture, auth, and persistence as product-grade concerns.

### Phase 7 - Release 1.0

Goal:

- Ship a stable first public release.
- Provide a reliable desktop app experience.
- Preserve OBS compatibility.
- Support the core broadcast workflow confidently.
- Have clear docs, setup flow, recovery guidance, and known limitations.

## Current Risks / Blockers

- Desktop launch still needs more hands-on testing.
- First launch can be slower than later launches.
- The desktop admin convenience is local-development-only and must not become the public security model.
- Current server state is still mostly in memory.
- OBS depends on stable local URLs.
- Packaging and installer behavior are not implemented yet.
- Remote rooms/operators should not drive the current desktop foundation work.
- The current working prototype files are large and fragile, so changes should stay small.

## Next Actions

- Run `npm start` and confirm the old web workflow still works.
- Run `npm run desktop` and confirm Caster Command opens first.
- Open Control from the desktop app and confirm buttons work.
- Open Overlay Preview from the desktop app and confirm it updates.
- Add the overlay URL to OBS and confirm Browser Source output still works.
- Run the smoke test checklist.
- Track slow first launch behavior.
- Keep Caster Command focused on dashboard/navigation before adding production controls.

## Hype Checkpoint

ZBroadcast has crossed an important line: it is no longer only a web overlay prototype. It now has the beginning of a real desktop control-app path while keeping the working OBS overlay system alive.

The next win is simple and big: prove the desktop workflow in a personal live test.
