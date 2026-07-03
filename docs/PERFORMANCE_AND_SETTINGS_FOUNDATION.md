# Performance And Settings Foundation

## Goal

Document a performance-first foundation plan for ZBroadcast before adding heavier modules such as Predictions, Twitch integrations, or always-running live overlay monitors.

ZBroadcast is moving toward a desktop-first esports broadcast control app. That means responsiveness is part of the product, not cleanup for later.

## Performance Priority

ZBroadcast should be usable on modest and budget PCs.

Broadcast tools are used under pressure. During a live cast, short freezes can be just as damaging as broken features because the operator needs immediate feedback from buttons, hotkeys, overlays, and recovery controls.

Performance should be treated as a core requirement:

- The desktop app should stay responsive while focused.
- The desktop app should stay usable when interacted with from another monitor.
- Module controls should avoid unnecessary work.
- Visual polish should not come before reliable operation.
- Heavy features should be optional or lazy-loaded.

## Known Symptoms

Observed issues so far:

- Intermittent 2-5 second stalls.
- Inconsistent launch time.
- Temporary hover and click unresponsiveness.
- Stalls while focused and clicking around.
- Stalls while focused and scrolling.
- Stalls while the app is not focused but still being interacted with.
- Stalls after tabbing away and back.
- Occasional pauses even around Quit behavior.

There is no single confirmed trigger yet. The issue existed before temporary DevTools diagnostics were added.

## Possible Cause Categories

The current stall could come from one source or from several smaller costs stacking together.

Areas to investigate:

- Electron/Chromium renderer stalls.
- Embedded legacy controller iframe cost.
- Socket.IO reconnect or state-sync bursts.
- Full DOM rerenders in `public/control.html`.
- Overlay rendering, animation, text fitting, and timing work.
- Server-side state cloning and history behavior.
- DevTools overhead when DevTools is open.
- Windows, GPU, or Chromium compositing behavior.
- App startup and local server startup sequencing.

The current Rocket League controller works, but it was built as a standalone web page. Running it inside the desktop shell means the shell, controller iframe, overlay preview, Socket.IO, and Electron renderer all share practical performance responsibility.

## Immediate Investigation Approach

Use small comparisons before changing architecture.

Recommended checks:

- Compare `npm run desktop` against the normal browser workflow using `npm start`.
- Test with DevTools closed.
- Test with DevTools open only when recording or reading diagnostics.
- Test with only Control Room loaded.
- Test with Overlay Preview loaded.
- Test tab-out/tab-back behavior.
- Test quick clicking and scrolling inside the embedded controller.
- Use the Performance tab recordings when possible.
- Add temporary diagnostics only when needed.
- Remove diagnostics before merging unless they become a deliberate developer setting.

The goal is to identify whether the pauses come from the app shell, the embedded controller, overlay rendering, Socket.IO state bursts, Electron focus behavior, or startup sequencing.

## Performance Budgets / Design Rules

Until the baseline is understood, use conservative design rules:

- Do not run hidden live iframes by default.
- Do not add always-on background modules unless the user enables them.
- Avoid unnecessary animation loops.
- Avoid repeated full DOM rebuilds when targeted updates are enough.
- Keep modules lazy-loaded.
- Keep heavy integrations disabled until needed.
- Prefer local-first responsiveness over visual flair.
- Add settings for reduced motion and performance modes.
- Treat live overlay monitor features as optional, not default.
- Keep diagnostics temporary unless they become an explicit dev setting.

These rules should guide future modules, especially Predictions, Twitch/EventSub, OBS integrations, and live monitor views.

## Settings Scene Priority

Settings should come early because performance and local configuration are now product concerns.

Future Settings scene options should include:

- Performance Mode / Low Resource Mode.
- Enable or disable live overlay monitor.
- Reduced animations.
- Diagnostics mode.
- Local server port.
- Admin password / local auth handling.
- OBS connection settings later.
- Twitch connection settings later.
- Theme and display options.

The first Settings MVP does not need to solve every item. It should create a stable place for local desktop configuration before heavier modules are added.

## Recommended Next Branches

Suggested small branches:

- `performance-baseline-investigation`
- `settings-scene-mvp`
- `local-server-config`
- `optional-performance-mode`
- `prediction-module-proof-of-concept`

Each branch should stay narrow and reviewable. Performance work should avoid large rewrites until the baseline is clear.

## Decision

Pause new heavy visual layers for now, especially always-running background overlay previews.

Recommended direction:

- Establish the performance baseline first.
- Add a Settings foundation early.
- Make live overlay monitors optional.
- Keep Rocket League stable while measuring.
- Build Predictions only after the shell has a clearer performance profile.

The product path should be steady: responsiveness first, settings second, heavier modules third.
