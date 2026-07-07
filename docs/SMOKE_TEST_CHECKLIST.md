# Smoke Test Checklist

Use this checklist after changes to confirm the current ZBroadcast desktop/module workflow still works.

## Local Startup

- [ ] Run `npm start`.
- [ ] Confirm the server starts without crashing.
- [ ] Confirm the server reports the expected port, usually `3000`.

## App Shell And Module Routes

- [ ] Open Caster Command.
- [ ] Confirm Main Menu opens.
- [ ] Open Module Select.
- [ ] Open Rocket League.
- [ ] Confirm the Rocket League Control Room panel renders as app UI.
- [ ] Open Preview Overlay.
- [ ] Confirm the Rocket League overlay output renders.
- [ ] Return to Control Room and confirm the background preview appears when enabled.

## Score And Series Controls

- [ ] Add a blue goal and confirm the control page and overlay update.
- [ ] Add an orange goal and confirm the control page and overlay update.
- [ ] Undo a blue goal and confirm the score does not go below `0`.
- [ ] Undo an orange goal and confirm the score does not go below `0`.
- [ ] Mark blue as game winner and confirm history, series score, and game score behavior.
- [ ] Mark orange as game winner and confirm history, series score, and game score behavior.
- [ ] Add blue series wins and confirm pips update.
- [ ] Add orange series wins and confirm pips update.
- [ ] Undo blue series and confirm pips update.
- [ ] Undo orange series and confirm pips update.
- [ ] Reset game and confirm only current game score is cleared.
- [ ] Reset series and confirm scores, series, and history reset as expected.
- [ ] Full reset and confirm match state resets while the app remains connected.
- [ ] Swap teams and confirm names, logos, rosters, and subs swap sides.
- [ ] Undo last action and confirm the previous state is restored.

## Match Info, Delay, And Overlay Queue

- [ ] Edit league name, week/round, series info, team names, and series type.
- [ ] Use queued match info update and confirm the overlay updates according to overlay delay.
- [ ] Use instant match info update and confirm the overlay updates immediately.
- [ ] Set overlay delay to `0` and confirm normal immediate overlay updates.
- [ ] Set overlay delay to a nonzero value and confirm score/state changes are delayed on the overlay.
- [ ] Confirm full reset clears or rebuilds the delayed overlay queue correctly.
- [ ] Confirm undo last action clears or rebuilds the delayed overlay queue correctly.

## Rosters And Assets

- [ ] Enter three active roster players for blue and confirm they appear on overlay.
- [ ] Enter three active roster players for orange and confirm they appear on overlay.
- [ ] Enter substitute players.
- [ ] Click a sub and then an active player on the same team; confirm the values swap.
- [ ] Upload a blue PNG logo and confirm the preview and overlay update.
- [ ] Clear the blue logo and confirm it no longer appears after match info is applied.
- [ ] Upload an orange PNG logo and confirm the preview and overlay update.
- [ ] Clear the orange logo and confirm it no longer appears after match info is applied.
- [ ] Upload a PNG overlay background and confirm the overlay uses it.
- [ ] Clear the overlay background and confirm the overlay removes it.

## History And Hotkeys

- [ ] Confirm goal actions add goal entries to history.
- [ ] Confirm game winner actions add final-score history blocks.
- [ ] Confirm reset series clears history.
- [ ] Configure hotkeys and save settings.
- [ ] Confirm hotkeys trigger expected score/reset actions when focus is not in a form field.
- [ ] Click into a text input and confirm hotkeys do not fire while typing.

## OBS Browser Source

- [ ] Add the overlay URL as an OBS Browser Source.
- [ ] Use a 1920x1080 source size.
- [ ] Confirm transparent background behavior works as expected.
- [ ] Confirm score, series pips, metadata, rosters, logos, timing display, and overlay background render in OBS.
- [ ] Confirm OBS updates when the control page changes state.

## Optional Remote/Railway Check

This is optional and is not required for desktop pivot work.

- [ ] Open the deployed control URL, if a remote deployment exists.
- [ ] Enter the configured remote admin password.
- [ ] Open the deployed overlay URL.
- [ ] Confirm Socket.IO connects remotely.
- [ ] Confirm score and overlay updates work remotely.
- [ ] Confirm uploads work only if remote persistent storage behavior is understood.
