# Volleyball World

## Project Goal

Build a browser-based 2.5D multiplayer social volleyball game.

The game should visually feel like a 2.5D/isometric game, but the underlying
world should be fully 3D.

Players should be able to:

- Walk freely around a 3D social world
- See other online players
- Chat with nearby or same-room players
- Move between different scenes/areas
- Walk up to a volleyball court and join a match
- Play real-time 1v1 volleyball
- Potentially support 2v2 in the future

The first version should focus on a small playable vertical slice rather than
building a full MMO/social game.

---

# Tech Stack

## Language

TypeScript

## Client

- React
- Vite
- Three.js
- React Three Fiber
- Rapier Physics

React should handle application UI.

Examples:

- Login
- Chat
- HUD
- Settings
- Match UI
- Scoreboard

Three.js / React Three Fiber should handle the game world.

Examples:

- World rendering
- Characters
- Camera
- Lighting
- Environment
- Volleyball
- Visual effects

Do NOT use React state for per-frame game simulation.

---

# Server

Use:

- Node.js
- TypeScript
- Colyseus
- WebSocket

The server should be authoritative for multiplayer game state.

The client sends player input.

Example:

{
input: "MOVE_RIGHT",
tick: 1842
}

The server determines authoritative state such as:

- Player position
- Player velocity
- Ball position
- Ball velocity
- Match state
- Score

---

# Repository Architecture

Use a pnpm monorepo.

Suggested structure:

apps/
client/
server/

packages/
game-core/
protocol/
shared/

Responsibilities:

client

- React UI
- Three.js rendering
- Input
- Client-side prediction
- Interpolation

server

- Colyseus rooms
- Authoritative simulation
- Match management
- Multiplayer state

game-core

- Physics-independent gameplay logic where possible
- Volleyball rules
- Simulation
- Collision/gameplay calculations

protocol

- Network messages
- Shared network schemas

shared

- Common TypeScript types/utilities

---

# Game Architecture

The client should conceptually contain:

Game
├── SceneManager
├── NetworkManager
├── InputManager
├── PhysicsManager
├── AudioManager
└── UI integration

Do not tightly couple game simulation to Three.js objects.

For example, avoid:

function updateBall(sprite: THREE.Mesh)

Prefer:

interface BallState {
position: Vector3Like
velocity: Vector3Like
}

function updateBall(ball: BallState, dt: number)

Rendering should consume simulation state.

---

# World Design

The world is 3D but should visually resemble a 2.5D game.

Use a fixed angled camera.

Start by evaluating an OrthographicCamera.

Example camera direction:

camera.position.set(10, 15, 10)
camera.lookAt(0, 0, 0)

Players should not initially be able to rotate the camera.

---

# Scenes

Eventually the game may contain scenes such as:

- Town
- Beach
- Gym
- Volleyball courts
- Shops

Scenes should be managed through a SceneManager rather than React Router.

Example:

sceneManager.load("beach")

Scene assets should primarily be created in Blender and exported as GLB/GLTF.

Do not manually construct large environments using hundreds of React
components unless an object actually needs independent runtime behavior.

---

# Character

Characters are 3D models with animations.

Potential animations:

- Idle
- Walk
- Run
- Jump
- Serve
- Receive
- Spike
- Block

Use Three.js AnimationMixer or the appropriate React Three Fiber abstraction.

Player simulation state should be independent from the visual model.

Example:

interface PlayerState {
id: string
position: Vector3Like
rotation: number
velocity: Vector3Like
animation: PlayerAnimation
}

---

# Multiplayer World

Use Colyseus Rooms.

Possible future structure:

World
├── LobbyRoom
├── BeachRoom
├── GymRoom
└── VolleyballMatchRoom

Social areas and volleyball matches have different networking requirements.

Social world:

- Approximately 10-20 network updates/sec
- Interpolate remote players on the client
- Prioritize smooth movement over exact simulation

Volleyball match:

- Target fixed 60 tick/sec simulation
- Server authoritative
- Client-side prediction
- Server reconciliation
- Remote-player interpolation

Rendering FPS and network tick rate must remain independent.

---

# Physics

Use Rapier for general world physics:

- Ground
- Walls
- Buildings
- Player collision
- Static environment collision

Volleyball gameplay physics may use custom gameplay logic where necessary.

The goal is not physically perfect volleyball.

The goal is responsive and fun volleyball.

Potential custom systems:

- Ball impact response
- Serve
- Spike
- Block
- Ball speed limits
- Gameplay-specific trajectories

---

# Networking Principles

Do not trust client positions.

Client sends inputs.

Server calculates authoritative state.

Eventually support:

- Client-side prediction
- Server reconciliation
- Remote-player interpolation
- Latency handling
- Reconnection

Do not implement all advanced networking systems in the first prototype.

---

# MVP

Do NOT attempt to build a full MMO.

The first vertical slice should contain:

1. One small 3D scene
2. One playable character
3. WASD movement
4. Fixed 2.5D-style camera
5. Idle/walk/run animations
6. Basic world collision
7. Two browser clients can connect
8. Players can see each other moving
9. Player names appear above characters
10. Basic chat
11. One volleyball court
12. Player can approach the court and press E to join
13. Two players can enter a 1v1 match
14. Basic volleyball mechanics
15. Basic scoring

Stop and evaluate architecture after this vertical slice.

---

# Development Phases

## Phase 1 - Offline world prototype

Implement:

- Vite + React
- React Three Fiber
- Basic scene
- Camera
- Character controller
- WASD
- Collision
- Character animation

No multiplayer yet.

## Phase 2 - Social multiplayer

Add:

- Node.js
- Colyseus
- Player rooms
- Player spawning
- Remote player synchronization
- Interpolation
- Player names
- Chat

## Phase 3 - Volleyball prototype

Implement locally first:

- Court
- Ball
- Serve
- Receive
- Spike
- Net collision
- Ground collision
- Scoring

## Phase 4 - Multiplayer volleyball

Add:

- VolleyballMatchRoom
- Authoritative simulation
- Fixed timestep
- Input synchronization
- Client prediction
- Reconciliation
- Ball synchronization

## Phase 5 - Expansion

Only after the vertical slice works:

- Multiple scenes
- 2v2
- Matchmaking
- Character customization
- Persistent accounts
- Friends
- Ranking
- Inventory

---

# Engineering Priorities

Prioritize:

1. Clear separation between rendering and simulation
2. Clear separation between React UI and game loop
3. Server-authoritative multiplayer architecture
4. Stable fixed-timestep simulation
5. Performance
6. Maintainable TypeScript architecture

Avoid premature complexity.

Do not introduce ECS, complex event buses, microservices, databases, or
distributed infrastructure unless the current requirements justify them.

When implementing a feature, prefer the simplest architecture that can
reasonably evolve toward the design above.
