import RAPIER from '@dimforge/rapier3d-compat'
import { FIXED_DT, type Vector3Like } from '@volleyball/game-core'
import type { BoxCollider } from '../scenes/SceneManager'

export const PLAYER_HEIGHT = 1.65
const RADIUS = 0.3
const CENTER = PLAYER_HEIGHT / 2
let initialization: Promise<void> | undefined
export function initializePhysics() {
  return (initialization ??= RAPIER.init())
}

export class CharacterController {
  readonly world: RAPIER.World
  private body: RAPIER.RigidBody
  private collider: RAPIER.Collider
  private controller: RAPIER.KinematicCharacterController
  private verticalVelocity = 0

  constructor(colliders: BoxCollider[], spawn: Vector3Like) {
    this.world = new RAPIER.World({ x: 0, y: -20, z: 0 })
    this.world.timestep = FIXED_DT
    for (const box of colliders) {
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(...box.halfExtents).setTranslation(...box.center))
    }
    this.body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y + CENTER, spawn.z))
    this.collider = this.world.createCollider(RAPIER.ColliderDesc.capsule(CENTER - RADIUS, RADIUS), this.body)
    this.controller = this.world.createCharacterController(0.015)
    this.controller.enableSnapToGround(0.2)
    this.controller.setMaxSlopeClimbAngle(Math.PI / 4)
    this.controller.setMinSlopeSlideAngle(Math.PI / 3)
    this.world.step()
  }

  step(velocity: Vector3Like, dt: number): Vector3Like {
    this.verticalVelocity = Math.max(-20, this.verticalVelocity - 20 * dt)
    this.controller.computeColliderMovement(this.collider, { x: velocity.x * dt, y: this.verticalVelocity * dt, z: velocity.z * dt })
    const movement = this.controller.computedMovement()
    const position = this.body.translation()
    this.body.setNextKinematicTranslation({ x: position.x + movement.x, y: position.y + movement.y, z: position.z + movement.z })
    this.world.step()
    if (this.controller.computedGrounded()) this.verticalVelocity = 0
    const next = this.body.translation()
    return { x: next.x, y: next.y - CENTER, z: next.z }
  }

  reset(position: Vector3Like) {
    const center = { x: position.x, y: position.y + CENTER, z: position.z }
    this.body.setTranslation(center, true)
    this.body.setNextKinematicTranslation(center)
    this.verticalVelocity = 0
    this.world.step()
  }
  dispose() {
    this.world.free()
  }
}
