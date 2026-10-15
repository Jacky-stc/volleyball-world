# Project

Browser-based 2.5D multiplayer social volleyball game.

## Stack

- TypeScript
- React + Vite
- React Three Fiber / Three.js
- Rapier
- pnpm monorepo
- Node.js + Colyseus for future multiplayer

## Architecture Rules

- React handles UI, not per-frame simulation.
- R3F / Three.js handles rendering.
- Keep simulation state independent from Three.js objects.
- Keep rendering, simulation, and networking concerns separated.
- Server will be authoritative for multiplayer state.
- Prefer simple implementations over premature abstractions.

## Development Rules

- Only implement the requested scope.
- Do not proactively implement future phases.
- Do not refactor unrelated code.
- Do not add dependencies unless necessary.
- Keep changes minimal.
- Preserve existing architecture unless the task requires changing it.
- If unrelated issues are found, mention them but do not fix them unless blocking.
- Run only relevant validation after changes.

## Documentation

Read only when relevant:

- `docs/architecture.md` — current architecture and implementation decisions
- `docs/project-direction.md` — product direction and future goals
- `docs/assets.md` — asset conventions
- `docs/validation.md` — validation/testing guidance
