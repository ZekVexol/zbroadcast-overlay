# Predictions Module Plan

## Core Vision

Predictions is a Control Room module for ZBroadcast. It should let a caster or operator start, update, end, or cancel a prediction during a stream or cast.

The overlay visual should appear as a tug-of-war/progress bar with two sides competing for control. This module should prove that ZBroadcast can support stream-interaction tools, not only scoreboard tools.

The first version should work locally before any Twitch API or EventSub integration is added.

## Local MVP Behavior

- Start a prediction from the Control Room.
- Set a prediction title manually.
- Set Option A and Option B names manually.
- Show the prediction on the overlay.
- Manually adjust Option A and Option B progress for local testing.
- Complete the prediction with Option A or Option B as the winner.
- Cancel or end the prediction early.
- Support overlay states for active, completed, cancelled, and hidden.

Esports Mode can auto-fill options from active match teams later. For the local MVP, manual names are enough.

## Esports Mode

For Rocket League, Predictions should eventually be able to pull the Blue and Orange team names from the active match.

This should not require rewriting the Rocket League controller yet. It can use current scoreboard/team state only when that is safe and low-risk. If team names are unavailable, the module should fall back to manual Option A and Option B names.

## Overlay Visual Direction

- Tug-of-war progress bar.
- Two clear team or option sides.
- Animated progress changes.
- Clear winner/result state.
- Clean broadcast-safe styling.
- OBS Browser Source compatible.

The overlay should look useful even without Twitch data. Manual progress controls should be enough to test the visual direction locally.

## Control Room UI Direction

Predictions should fit into the existing Control Room/module system.

It should not clutter the live Rocket League controller. The first version can be its own module screen or a stream module panel. Later, it should support presets so a caster can quickly load common prediction setups.

## Future Twitch Integration

Later versions can connect to Twitch Predictions API and EventSub.

Future Twitch work may include:

- Creating real Twitch predictions from ZBroadcast.
- Pulling live vote/channel point progress.
- Resolving predictions from ZBroadcast.
- Cancelling predictions from ZBroadcast.
- Syncing prediction state with Twitch events.

Do not build Twitch integration in the local MVP.

## Required State And Events

Likely local state:

- `active`: prediction active/inactive
- `title`
- `optionAName`
- `optionBName`
- `optionAProgress`
- `optionBProgress`
- `selectedWinner`
- `status`: `idle`, `active`, `completed`, `cancelled`

Likely socket events:

- `prediction:start`
- `prediction:update`
- `prediction:complete`
- `prediction:cancel`
- `prediction:clear`

These names are planning targets only. Final event names should match the app's existing Socket.IO style when implementation starts.

## What Not To Do Yet

- Do not implement Twitch API yet.
- Do not implement real channel point voting yet.
- Do not overhaul the Rocket League controller yet.
- Do not add monetization or store logic.
- Do not add database storage yet.
- Do not make Predictions dependent on remote rooms yet.

## Recommended First Code Step

Start with the smallest safe branch:

1. Add Predictions module metadata to `public/modules/catalog.json`.
2. Show Predictions as a Stream module in the Control Room selector.
3. Keep it disabled or marked local MVP until the controller and overlay route exist.

This proves the module catalog and Control Room selector can represent stream-interaction modules without changing scoreboard behavior.
