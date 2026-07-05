# ZBroadcast App Layer Architecture

## Core Concept

ZBroadcast uses one global desktop app shell. Scenes and modules should share the same layer model instead of each area inventing its own structure.

Modules are independent product pieces that slot into Control Room. They should not become one-off pages with their own app chrome, modal systems, or developer tools.

## Official Layer Stack

From top to bottom:

1. Dev Tools Layer
2. Global Modal Layer
3. Floating Navigation Layer
4. Scene / Module Content Layer
5. Preview / Atmosphere Background Layer
6. App Base / Electron Window Layer

## 1. Dev Tools Layer

The Dev Tools Layer is always the top global layer.

Rules:

- Appears across major app scenes.
- Is owned by the app shell, not by scenes or modules.
- Contains developer/admin tools, scene navigation, module toggles, module-specific testing tools, reset tools, and debug tools.
- Module test controls belong here, not inside live caster-facing module panels.
- Should be easy to hide, restrict, or remove from production builds later.
- Must not add constant performance cost when closed.

Examples:

- Scene navigation.
- Control Room module toggles.
- Predictions mock team/game inputs.
- Predictions mock vote controls.
- Reset Local Module State.

## 2. Global Modal Layer

The Global Modal Layer is the app-wide modal system.

Rules:

- Modals render through the app shell, not inside module iframes.
- Fullscreen backdrop covers the app viewport.
- Modal appears above scene/module content and floating navigation.
- Dev Tools remains above modals.
- Clicking outside the modal cancels or closes.
- Clicking inside the modal does not close it.
- Backdrop click never confirms destructive actions.
- Modal text must stay contained without horizontal scrollbars.
- Modules may request modals, but the app shell owns the modal layer.

Examples:

- Settings unsaved changes prompt.
- Reset Local Module State confirmation.
- Predictions setup modal.
- Predictions confirm winner modal.

## 3. Floating Navigation Layer

The Floating Navigation Layer holds scene-level navigation controls.

Rules:

- Sits above scene/module content.
- Sits below global modals.
- Is owned by the app shell.
- Should not be duplicated inside module panels.
- Positions should be consistent across scenes where the controls appear.

Examples:

- Home.
- Back To Control.
- Preview Overlay.
- Change Module.

## 4. Scene / Module Content Layer

The Scene / Module Content Layer contains the main interactive content for the current scene.

Rules:

- Main Menu, Settings, Module Select, Control Room, and Preview Overlay scene content live here.
- Control Room module grid lives here.
- Module panels live here.
- Modules should not create global Dev Tools.
- Modules should not create app-wide modal layers.
- Modules should not create their own floating navigation system.
- Modules should not create opaque full-screen wrappers.
- Only the visible module card or panel should have a background.
- Module iframe/page backgrounds should stay transparent where practical.

Examples:

- Main Menu button stack.
- Settings tab layout.
- Control Room module selector.
- Control Room module grid.
- Predictions panel.
- Legacy Rocket League controller iframe.

## 5. Preview / Atmosphere Background Layer

The Preview / Atmosphere Background Layer is the non-interactive visual background layer.

Rules:

- Provides atmosphere, blank background, or low-opacity live output preview.
- Must not block clicks.
- Must not cover module panels.
- Should use `pointer-events: none` for live preview backgrounds.
- Expensive live previews should be lazy-loaded or controlled by settings.
- Low Resource Mode should eventually disable or reduce this layer.

Important distinction:

- Preview Overlay as a background is a subtle, low-opacity Control Room atmosphere layer.
- Preview Overlay as a scene/output is the dedicated full output preview used to inspect what will appear on stream.

## 6. App Base / Electron Window Layer

The App Base / Electron Window Layer is the desktop foundation.

Rules:

- Provides the Electron/local app window.
- Supports app launch, local server startup, display behavior, and desktop shell behavior.
- Does not contain module-specific UI.
- Should preserve local-first desktop responsiveness.

## Official Module Rule

A module may provide:

- Control Room panel.
- Preview Overlay output.
- Shared state.
- Dev Tools hooks.
- Modal requests.
- Settings hooks later.
- Catalog metadata.
- Future presets.

A module should not provide:

- Its own global Dev Tools.
- Its own app-wide modal layer.
- Its own floating navigation system.
- Opaque full-screen wrappers.
- Scene-level routing unless explicitly needed.

Modules should ask the app shell for app-level services instead of recreating them.

## Control Room Rules

There is one Control Room scene.

Control Room supports:

- no modules loaded
- one module loaded
- multiple modules loaded later

Rules:

- Preview Overlay should always be accessible from Control Room.
- If an active module has no overlay output, Preview Overlay can fall back to the default room overlay or show an idle output.
- One module should appear centered/primary.
- Two modules should split space cleanly.
- Three or more modules should use a responsive grid later.
- Control Room should not become a custom layout per module.

## Predictions Example

Predictions is the first module proving this layer model.

Current ownership:

- Predictions panel lives in the Scene / Module Content Layer.
- Predictions overlay output lives in Preview Overlay output and can be used by the Preview / Atmosphere Background Layer.
- Predictions testing controls live in the Dev Tools Layer.
- Predictions setup and confirm winner modals use the Global Modal Layer.
- Predictions shared local state coordinates panel, overlay, and Dev Tools.

Product decisions:

- Prediction overlay preview does not live inside the controller panel.
- Progress/testing controls belong in Dev Tools, not in the caster-facing panel.
- Prediction setup uses a modal request handled by the app shell.
- Multiple options are supported.
- Twitch API/EventSub integration comes later.

## Rocket League Example

Rocket League is currently a legacy embedded controller module.

It can remain special/legacy for now. Later it can be split into:

- Rocket League Control Room panel.
- Rocket League overlay output.
- Rocket League Dev Tools hooks.
- Rocket League settings hooks.

Rocket League cleanup should not block Predictions or other module architecture work.

## Module Workbenches

Workbench scenes are hidden/developer-accessible module build spaces.

Rules:

- Workbenches are for designing and testing modules outside Control Room.
- The finished module panel is what gets slotted into Control Room.
- Workbenches should be reachable from Dev Tools navigation later.
- Do not create public-facing workbench scenes for normal operator flow.

## Performance Rules

- Do not run hidden expensive iframes by default.
- Lazy-load module workbenches and overlays.
- Do not keep inactive modules doing heavy work.
- Low Resource Mode should eventually disable live preview background and reduce animation.
- Dev Tools should not add constant performance cost when closed.
- Keep the app usable on modest/budget PCs.

## Offline / Local-First Note

HTML, CSS, and JavaScript inside Electron are local desktop app code.

The app can be packaged with local files and run offline for local features. Internet access is only needed for integrations such as Twitch, YouTube, TikTok, Discord, updates, store/account, or remote features.

## Near-Term Implementation Order

1. Keep the global Dev Tools shell stable.
2. Keep all app-wide modals in the Global Modal Layer.
3. Continue polishing Predictions as a real module:
   - Control Room panel
   - Preview Overlay output
   - shared local state
   - Dev Tools hooks
   - modal requests
4. Improve Settings and performance controls.
5. Continue Rocket League module cleanup only when safe.
6. Add external integrations later.

Keep each step small, reviewable, and reversible.
