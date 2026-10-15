import type { PlayerInput } from '@volleyball/game-core'
import { movementIntent, type MovementMessage, type PlayerState } from '../network/connect'

// Matches ConnectionRoom's MOVEMENT_SPEED; keep local prediction presentation-only.
const MOVEMENT_SPEED = 2.8

export function advanceLocalPrediction(position: { x: number; z: number }, input: PlayerInput, delta: number) {
  const intent = movementIntent(input)
  position.x += intent.x * MOVEMENT_SPEED * delta
  position.z += intent.z * MOVEMENT_SPEED * delta
}

type Transform = Pick<PlayerState, 'x' | 'y' | 'z' | 'rotation'>

export class LocalPrediction {
  readonly position: Transform = { x: 0, y: 0, z: 0, rotation: 0 }
  // One integrated displacement per send interval, including the current unsent interval.
  // These values are presentation-only and are never sent to the server.
  private pending = new Map<number, { x: number; z: number }>()
  private nextSequence = 1

  get pendingCount() {
    return this.pending.size
  }

  sequenceInput(input: PlayerInput): MovementMessage {
    return { ...movementIntent(input), sequence: this.nextSequence++ }
  }

  advance(input: PlayerInput, delta: number) {
    const displacement = { x: 0, z: 0 }
    advanceLocalPrediction(displacement, input, delta)
    this.position.x += displacement.x
    this.position.z += displacement.z
    if (displacement.x === 0 && displacement.z === 0) return
    const pending = this.pending.get(this.nextSequence) ?? { x: 0, z: 0 }
    pending.x += displacement.x
    pending.z += displacement.z
    this.pending.set(this.nextSequence, pending)
  }

  reconcile(authoritative: Pick<PlayerState, 'x' | 'y' | 'z' | 'rotation' | 'lastProcessedSequence'>) {
    const { x, y, z, rotation, lastProcessedSequence } = authoritative
    Object.assign(this.position, { x, y, z, rotation })
    for (const [sequence, displacement] of this.pending) {
      if (sequence <= lastProcessedSequence) this.pending.delete(sequence)
      else {
        this.position.x += displacement.x
        this.position.z += displacement.z
      }
    }
  }
}
