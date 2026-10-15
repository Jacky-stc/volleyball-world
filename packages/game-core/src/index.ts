export interface Vector3Like {
  x: number
  y: number
  z: number
}
export type PlayerAnimation = 'idle' | 'walk' | 'run'
export interface PlayerInput {
  horizontal: number
  vertical: number
  run: boolean
}
export interface PlayerState {
  position: Vector3Like
  velocity: Vector3Like
  rotation: number
  animation: PlayerAnimation
}

export const FIXED_DT = 1 / 60
export const WALK_SPEED = 2.8
export const RUN_SPEED = 5.2

// Camera looks straight from +Z: screen-right is +X; screen-up is -Z.
export function movementVelocity(input: PlayerInput): Vector3Like {
  const length = Math.hypot(input.horizontal, input.vertical)
  if (length === 0) return { x: 0, y: 0, z: 0 }
  const scale = (input.run ? RUN_SPEED : WALK_SPEED) / Math.max(1, length)
  return {
    x: input.horizontal * scale,
    y: 0,
    z: -input.vertical * scale,
  }
}

export function animationFromSpeed(speed: number): PlayerAnimation {
  return speed < 0.12 ? 'idle' : speed > WALK_SPEED + 0.3 ? 'run' : 'walk'
}

export function createPlayerState(position: Vector3Like): PlayerState {
  return { position: { ...position }, velocity: { x: 0, y: 0, z: 0 }, rotation: Math.PI / 4, animation: 'idle' }
}

// Bounded catch-up prevents a background tab or long frame from teleporting the player.
export class FixedStepper {
  private accumulator = 0
  advance(delta: number, step: (dt: number) => void): number {
    this.accumulator += Math.max(0, Math.min(delta, FIXED_DT * 6))
    while (this.accumulator + 1e-10 >= FIXED_DT) {
      step(FIXED_DT)
      this.accumulator -= FIXED_DT
    }
    return Math.max(0, this.accumulator / FIXED_DT)
  }
  reset() {
    this.accumulator = 0
  }
}
