import {
  animationFromSpeed,
  createPlayerState,
  FixedStepper,
  movementVelocity,
  type PlayerInput,
  type Vector3Like,
} from '@volleyball/game-core'
import { CharacterController } from '../physics/CharacterController'
import type { courtScene } from '../scenes/SceneManager'

export class LocalSimulation {
  readonly player
  readonly previous: Vector3Like
  readonly physics: CharacterController
  private clock = new FixedStepper()
  alpha = 0
  paused = false

  constructor(private scene: typeof courtScene) {
    this.player = createPlayerState(scene.spawn)
    this.previous = { ...scene.spawn }
    this.physics = new CharacterController(scene.colliders, scene.spawn)
  }
  advance(delta: number, input: PlayerInput) {
    if (this.paused) {
      this.clock.reset()
      this.alpha = 1
      return
    }
    this.alpha = this.clock.advance(delta, (dt) => {
      Object.assign(this.previous, this.player.position)
      const desired = movementVelocity(input)
      const next = this.physics.step(desired, dt)
      const vx = (next.x - this.player.position.x) / dt
      const vz = (next.z - this.player.position.z) / dt
      Object.assign(this.player.velocity, { x: vx, y: (next.y - this.player.position.y) / dt, z: vz })
      Object.assign(this.player.position, next)
      this.player.animation = animationFromSpeed(Math.hypot(vx, vz))
      if (Math.hypot(vx, vz) > 0.12) this.player.rotation = Math.atan2(vx, vz)
    })
    if (this.player.position.y < -5) this.reset()
  }
  reset() {
    this.physics.reset(this.scene.spawn)
    Object.assign(this.player, createPlayerState(this.scene.spawn))
    Object.assign(this.previous, this.scene.spawn)
    this.clock.reset()
    this.alpha = 0
  }
  dispose() {
    this.physics.dispose()
  }
}
