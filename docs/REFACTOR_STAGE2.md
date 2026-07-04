# Refactor Stage 2

This stage keeps site behavior the same while moving low-risk code out of the legacy files.

## Frontend files

- `script.js` now loads multiple frontend scripts.
- `js/constants.js` contains shared constants and simple global state.
- `js/utils.js` contains shared helpers.
- `js/legacy-app.js` still contains most app features for compatibility.
- `js/autosync.js` contains realtime and gentle polling.

## API files

- `sb-api.js` now loads feature-based API modules.
- Existing global function names are kept, so HTML onclick handlers should still work.

No SQL is required for this update.
