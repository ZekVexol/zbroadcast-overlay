# ZBroadcast Module Contract

This document defines what a proper ZBroadcast module should provide.

Use this as a practical checklist when adding or rebuilding modules. Keep modules small, local-first, and aligned with the app shell layers.

## Layer Alignment

Every module must fit into the official ZBroadcast app layer stack:

1. Dev Tools Layer
2. Global Modal Layer
3. Floating Navigation Layer
4. Scene / Module Content Layer
5. Preview / Atmosphere Background Layer
6. App Base / Electron Window Layer

Modules live inside this stack. They do not own the stack.

## 1. Catalog Metadata

A module should declare metadata in the module catalog.

Expected fields include:

- `id`
- `displayName`
- `shortName`
- `category`
- `type`
- `status`
- `runnable`
- `layoutSize`
- `controlUrl` or panel path
- `overlayUrl` if the module has Preview Overlay output
- tags
- compatibility notes
- optional future Dev Tools hooks
- optional future Settings hooks

Layout size values:

- `minor`
- `major`
- `legacy-major`

The catalog is the app shell's first source of truth for module availability and layout behavior.

## 2. Control Room Panel

A proper module should provide a compact live operator panel when it needs operator controls.

Rules:

- Lives in the Scene / Module Content Layer.
- Fits inside the module's assigned layout size.
- Does not own global navigation.
- Does not own the global modal layer.
- Does not create full-screen opaque wrappers.
- Keeps critical controls accessible.
- Scrolls internally when content grows.
- Keeps testing/debug controls out of the live panel.

The panel is for live operation. It should not become a development workbench.

## 3. Preview Overlay Output

A proper module may provide stream-facing visual output.

Rules:

- Used by the Preview Overlay scene/output.
- Can also appear as a low-opacity Control Room background preview.
- Is visually separate from the operator panel.
- Does not contain operator controls.
- Handles inactive, idle, or empty state cleanly.
- Stays OBS/browser-source friendly when used as stream output.

Preview output is what the audience sees. The Control Room panel is what the operator uses.

## 4. Shared State

A proper module should have a clear state boundary.

Rules:

- Use namespaced local-first state, for example:

```text
zbroadcast:module:<module-id>
```

- Do not store unrelated app settings inside module state.
- Keep module state resettable by Dev Tools/debug tooling.
- Keep state shape understandable and conservative.
- Add remote, Twitch, API, or server-backed state later as a layer on top, not as the first dependency.

Local-first state keeps modules testable before external integrations exist.

## 5. Dev Tools Hooks

A module may expose contextual Dev Tools when active.

Rules:

- Testing tools belong in the global Dev Tools Layer.
- Testing tools do not belong inside live Control Room panels.
- Module Dev Tools should appear only when relevant.
- Module Dev Tools should not add constant cost when closed.

Predictions examples:

- mock team names
- game/series test controls
- mock point `+` controls

## 6. Modal Requests

A module may request modals, but the app shell renders them.

Rules:

- Modals must render through the Global Modal Layer.
- Modules should not create their own app-wide modal/backdrop systems.
- Module-local iframe modals should be avoided.
- The global backdrop covers the full app viewport.
- Clicking outside cancels or closes.
- Clicking inside does not close.
- Backdrop click never confirms destructive actions.

The module can request "show setup" or "confirm winner." The app shell owns the modal.

## 7. Layout Size Classes

### Minor

Minor modules are compact supporting modules.

Examples:

- Predictions
- sponsor rotator
- stream goals
- alerts

Rules:

- Fit into compact cards.
- Can share space with other minor modules.
- Center as a group when only minor modules are active.

### Major

Major modules are full game or event control modules.

Examples:

- future rebuilt Rocket League controller
- future Rainbow Six controller

Rules:

- Receive primary Control Room space.
- May have minor modules beside or around them later.
- Should still obey the app shell layer model.

### Legacy Major

Legacy major modules are older embedded modules preserved during transition.

Current example:

- Rocket League Scoreboard

Rules:

- Preserve working behavior first.
- Allow full-frame embedded control surfaces when needed.
- Rebuild into the proper module contract later.

## 8. Optional Settings

Modules may eventually expose settings.

Rules:

- Module settings should integrate with the app Settings scene or a module-specific settings area.
- Do not create disconnected settings systems.
- Do not store module settings inside unrelated app settings unless there is a deliberate shared setting.

## 9. Proper Module Examples

### Predictions

Predictions is the first proper ZBroadcast module.

It provides:

- catalog metadata
- `layoutSize: "minor"`
- Control Room panel
- Preview Overlay output
- shared local state
- contextual Dev Tools testing controls
- global modal requests for setup and confirm winner

Predictions proves the intended pattern: clean live panel, stream-facing overlay, testing tools in Dev Tools, and modals owned by the app shell.

### Rocket League

Rocket League is currently `legacy-major`.

It is still useful and must remain preserved, but it is not yet a proper module under this contract because it still uses:

- the old embedded `public/control.html` flow
- the old `public/overlay.html` output
- existing server/socket state

Future Rocket League cleanup should gradually move it toward:

- catalog metadata
- first-class Control Room panel
- module overlay output
- module Dev Tools hooks
- module settings hooks

Rocket League cleanup should not block new modules that already follow this contract.

For the preserve-first rebuild path, see `docs/ROCKET_LEAGUE_MODULE_PLAN.md`.

## Module Checklist

Before treating a module as first-class, confirm:

- It has catalog metadata.
- It declares a layout size.
- Its live panel stays inside the Scene / Module Content Layer.
- Its overlay output is separate from its panel.
- Its state is namespaced.
- Its debug/testing controls live in Dev Tools.
- Its modals render through the Global Modal Layer.
- It does not duplicate app navigation.
- It does not create app-wide wrappers.
- It handles inactive/empty state cleanly.

Keep the contract practical. Build the smallest module that proves the pattern, then improve it safely.
