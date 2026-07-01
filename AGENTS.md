# AGENTS.md

## Project

This project is ZBroadcast.

ZBroadcast is pivoting from a web-app-first Node.js + Express + Socket.IO broadcast overlay system into a desktop-first broadcast control app.

The current app is a fragile but working production prototype. Preserve current behavior unless explicitly asked to change it.

## Working Rules

- Prefer small, reviewable diffs.
- Do not refactor, rename, move, or restructure files unless explicitly asked.
- Do not deploy, push to GitHub, install packages, enable network access, or use full access unless explicitly approved.
- Do not change app behavior during documentation-only tasks.
- Treat `server.js`, `public/control.html`, and `public/overlay.html` as fragile working production prototype files.
- Before code changes, identify behavior that must be preserved.
- After changes, summarize what changed and what testing was done.

## Desktop Pivot Direction

Remote rooms and remote operators are future architecture, not the immediate foundation.

The immediate desktop target is:

```text
Launch ZBroadcast like a normal PC app -> open Caster Command -> preserve the existing control/overlay workflow during transition.
```

The desktop migration should wrap and preserve the current working overlay system before replacing internals.

## Behavior To Preserve

- Existing control and overlay routes.
- OBS Browser Source compatibility.
- Socket.IO live updates.
- Room-based state boundaries.
- Admin/control role gating.
- Read-only overlay role.
- Score, series, reset, undo, game winner, swap teams, and history behavior.
- Queued and instant metadata updates.
- Overlay delay behavior.
- Server-side overlay background and logo asset workflow.
- Roster and substitute workflow.
- Hotkeys that do not fire while typing.

## Change Discipline

When changing code:

1. State which files will change and why.
2. Identify the current behavior that must remain intact.
3. Make the smallest practical change.
4. Avoid unrelated cleanup.
5. Run or describe focused verification.
