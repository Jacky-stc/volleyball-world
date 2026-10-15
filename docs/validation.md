# Phase 1 validation

## Rectangular court update — 2026-10-15

Rebuilt the scene as a 9 × 18 orange/coral court on a 15 × 24 turquoise floor, with white boundary/attack lines and a static visual net. Removed all island props and their colliders. Updated real-physics tests to cross both halves and stop at the new long/short boundaries. All 11 tests pass. No volleyball mechanics were introduced.

## Fullscreen camera update — 2026-10-15

Replaced the diagonal orthographic view with an elevated, front-facing perspective camera. Removed the header, footer, text HUD and controls. Updated movement axes to match the camera. All 11 tests and the production build pass. Browser checks confirm an edge-to-edge canvas, empty visible page text, and document dimensions equal to the viewport (no scroll overflow). The earlier interface checks below describe the original Phase 1 UI, which has since been removed.

Validated on 2026-10-15 using Node.js 24.18.0 and pnpm 11.19.0.

## Automated

- `pnpm test`: 11 tests passed across 3 files.
- `pnpm build`: both workspaces pass TypeScript checks; Vite production build succeeds.
- Movement tests cover camera-relative axes, diagonal speed normalization, running speed, and idle/walk/run selection from actual speed.
- Fixed-step tests compare four simulated seconds at 30, 60, and 144 render FPS and verify bounded catch-up after a stall.
- Real Rapier tests cover ground contact, stopping at the welcome board, movement along obstacles, island bounds, pause, and reset.
- The real character GLB is loaded in a regression test to verify visible human-scale bounds across idle, walking, and running. This catches the asset's rest-pose scale mismatch.

## Browser checks

Tested in the Codex Chromium browser at 1280 × 720 and 390 × 844:

- The local GLB scene and character load and render with shadows and the fixed angled camera.
- Holding W for approximately one second moves the character about 2.7 world units along screen-up.
- Holding Shift + W reports 5.20 m/s and `run`; releasing returns to `idle`.
- Reset returns the character to the spawn point.
- Pause shows the paused state and prevents movement; resume restores input.
- The help dialog opens and closes with simulation paused while it is open.
- Narrow layout fits without horizontal overflow; the complete island remains visible.
- Holding the touch direction button moves the character, and releasing stops it.

The viewport override was reset after testing. A desktop screenshot is saved locally at `artifacts/phase-1-desktop.jpg` (ignored by Git).

## Known limitations

- Vite reports large chunks for Three.js and the Rapier compatibility bundle (embedded WASM). The game and physics are lazy loaded, but this prototype has not yet optimized asset delivery.
- The installed R3F / Three.js combination emits upstream deprecation warnings for Clock and the soft-shadow constant. No application runtime errors were observed.
- Browser automation confirms basic desktop and touch-button behavior; it is not a substitute for testing real mobile GPUs or long play sessions.
- The environment is a deliberately small procedural GLB. Colliders are simplified and the shoreline has a safety boundary. It is not a production art scene.
- No networking, backend or volleyball gameplay is included.
