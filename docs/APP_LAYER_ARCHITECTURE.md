# ZBroadcast App Layer Architecture

## 1. Core App Shell Concept

ZBroadcast should use one global desktop app shell.

Scenes should share common layers instead of each scene inventing its own structure. Main Menu, Settings, Control Room, Preview Overlay, and future module workbenches should feel like parts of the same desktop app.

Modules should be built as independent entities, then slotted into Control Room. Future modules should not be built directly as one-off Control Room pages.

## 2. Global Layer Model

From top to bottom:

1. Dev Tools / Admin Overlay layer
   - Global developer/admin access.
   - Available across scenes.
   - Easy to hide, disable, or restrict later.

2. Modal layer
   - In-app confirmations, warnings, setup popups, and unsaved-change prompts.
   - Examples: prediction setup, confirm winner, unsaved settings.

3. Navigation layer
   - Floating common navigation controls.
   - Examples: Home, Change Module, Preview Overlay, Control Room.
   - Positions should stay consistent across scenes where they appear.

4. Scene content layer
   - The actual interactive content for the current scene.
   - Examples: main menu buttons, settings tabs, module selector, Control Room module grid.

5. Background layer
   - Scene atmosphere, blank background, or low-opacity live output preview.
   - Must not block clicks.
   - Expensive live previews should be lazy-loaded or controlled by settings.

6. Base app window layer
   - Electron desktop window foundation.

## 3. Global Dev Tools Structure

Dev Tools should be global, not part of an individual module.

Planned hierarchy:

```text
Dev Tools
- Navigation
  - Scenes
    - alphabetized scene list
  - Modules
    - alphabetized module/workbench list
- Other Commands
  - reload app later
  - reset local state later
  - diagnostics toggle later
- Context Tools
  - scene-specific or module-specific tools that appear only when relevant
```

Rules:

- Navigation is a top-level Dev Tools section.
- Scenes and Modules live under Navigation.
- Other Commands sit at the same level as Navigation.
- Dev Tools should let a developer/admin navigate anywhere in the app quickly.
- Dev Tools should not be embedded inside module UI.

## 4. Scene Model

Important scenes:

- Main Menu
- Settings
- Module Select / Control Room setup
- Control Room
- Preview Overlay
- Module Workbenches

There is one Control Room scene. Do not create a separate Empty Control Room scene.

Control Room supports states:

- no modules loaded
- one module loaded
- multiple modules loaded

## 5. Control Room Structure

Control Room should use:

- Dev Tools layer
- Navigation layer
- Module grid/content layer
- Low-opacity live output preview background layer

Rules:

- Preview Overlay should always be accessible from Control Room.
- If no module overlay exists, Preview Overlay can fall back to the default room overlay or show an empty/idle output.
- Module grid should support one module centered/primary.
- Two modules should split space cleanly.
- Three or more modules should use a responsive grid later.
- Control Room should not become a custom layout per module.

## 6. Module Lifecycle

Each module should eventually support:

- catalog metadata
- hidden/dev workbench scene
- Control Room panel view
- overlay output view
- optional Settings entries
- optional Dev Tools hooks
- future presets

## 7. Module Workbench Scenes

Workbenches are hidden/developer-accessible module build spaces.

They are used to design and test modules outside Control Room. The finished module panel is what gets slotted into Control Room.

Workbenches should be reachable from:

```text
Dev Tools > Navigation > Modules
```

## 8. Predictions Example

Future Predictions structure:

- Predictions Workbench
- Predictions Control Room panel
- Predictions overlay output
- Predictions Dev Tools
- Local MVP first
- Twitch API/EventSub later

Product decisions:

- Prediction overlay preview does not live inside the controller panel.
- Preview Overlay and the Control Room background preview should show output.
- Progress sliders and testing controls belong in Dev Tools, not caster-facing UI.
- Prediction setup should use a modal.
- Multiple options should be supported.

## 9. Rocket League Example

Rocket League is currently a legacy embedded controller module.

It can remain special/legacy for now. Later it can be split into:

- Rocket League workbench
- Rocket League Control Room panel
- Rocket League overlay output
- Rocket League Dev Tools

Rocket League cleanup should not block Predictions.

## 10. Performance / Optimization Rules

- Do not run hidden expensive iframes by default.
- Lazy-load module workbenches and overlays.
- Do not keep inactive modules doing heavy work.
- Low Resource Mode should eventually disable live preview background and reduce animation.
- Dev Tools should not add constant performance cost when closed.
- Keep the app usable on modest/budget PCs.

## 11. Offline / Local-First Note

HTML, CSS, and JavaScript inside Electron are still local desktop app code.

The app can be packaged with local files and run offline for local features. Internet access is only needed for integrations such as Twitch, YouTube, TikTok, Discord, updates, store/account, or remote features.

## 12. Near-Term Implementation Order

1. Add global Dev Tools shell.
2. Add Dev Tools navigation structure.
3. Add module workbench routing/concept.
4. Rebuild Predictions as:
   - workbench
   - Control Room panel
   - overlay output
   - Dev Tools hooks
5. Continue Twitch integration later.

Keep each step small, reviewable, and reversible.
