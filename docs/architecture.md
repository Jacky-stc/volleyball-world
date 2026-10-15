# Phase 1 implementation

## Current court scene

The environment is now a rectangular orange/coral volleyball court with white lines and a turquoise free zone. The playing area is 9 × 18 world units; the full walkable floor is 15 × 24. The old island scenery and its colliders have been removed. Only the ground, outer safety boundaries and net posts have colliders. The static net is visual only at this stage, so the character may walk between halves; ball/net physics and match rules are not implemented. The fixed front-facing camera has been moved back to frame the longer floor. This supersedes the island obstacle descriptions below.

## Scope

One offline rectangular volleyball court, one animated character, camera-relative walking and running, fixed elevated front-facing perspective camera, static collision. No backend or network packages are installed.

## Data flow

```text
Keyboard input
    → PlayerInput (screen-relative intent)
    → LocalSimulation, fixed 1/60 second steps
    → game-core movementVelocity
    → Rapier kinematic character controller
    → collision-corrected PlayerState + previous position
    → interpolated CharacterView + AnimationMixer
```

React state holds loading and errors. Simulation state is an ordinary mutable TypeScript object; no React state updates occur inside the per-frame simulation.

`LocalSimulation` is the single owner of physics advancement. R3F's frame callback runs it before the visual update. Rendering interpolates between the previous and current simulation positions. Catch-up is capped at six fixed steps, so a long browser stall does not teleport the player. Lost focus clears input.

## Boundaries

`game-core` contains types, movement and the step accumulator, with no rendering or physics imports. `CharacterController` adapts desired motion to Rapier and reports the resulting position. The velocity used for animations is calculated from actual collision-corrected displacement, not just the pressed keys. Rotation follows actual horizontal motion.

The player is a position-based kinematic body with a capsule. Gravity is applied explicitly; ground snapping preserves contact. Static boxes approximate ground, trees, benches, rocks and the welcome sign. The low shoreline curb represents a taller safety barrier, keeping the character inside the prototype island. Small decorative grass and stones are intentionally non-blocking.

`SceneManager` resolves a single scene descriptor, including spawn, GLB path and colliders. There is no router, event bus, ECS or speculative manager layer. The scenery is loaded as one GLB; it is not reconstructed as hundreds of runtime React components.

The GLB character is cloned before animation. Its actual idle pose is measured to normalize height: the imported rest pose has a different armature scale. Idle, Walking and Running clips are cross-faded. Character animation is visual and does not change collision or world position.

## Assets and lifecycle

All assets are local. The GLB loader participates in Suspense; an error boundary handles failed assets, and physics initialization errors produce a retry screen. Input listeners, simulation worlds, and animation mixers are cleaned up on unmount. React StrictMode is enabled to exercise effect cleanup.

The fixed perspective camera looks from +Z toward the scene center, with no diagonal yaw. Portrait screens pull the camera back. The canvas fills the viewport; document overflow is disabled. The header, footer, text HUD, help dialog and buttons have been removed at the user's request. Movement maps screen-right to +X and screen-up to -Z.

## Later phases

Phase 2 can add `apps/server` and `packages/protocol` when a real network contract exists. Keep input intent and simulation state separate. Do not reuse client positions as authoritative state. Server physics sharing, prediction and reconciliation require a deliberate follow-up design; none are implemented or implied by this offline prototype.
