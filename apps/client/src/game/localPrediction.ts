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
  private pending = new Map<number, MovementMessage>()
  private unsent: MovementMessage[] = []
  private nextSequence = 1

  get pendingCount() {
    return this.pending.size
  }

  drainInputs(): MovementMessage[] {
    const inputs = this.unsent
    this.unsent = []
    return inputs
  }

  advance(input: PlayerInput, delta: number) {
    // Bound stalled/background frames just as the server bounds catch-up time.
    const durationMs = Math.max(0, Math.min(delta * 1000, 100))
    if (!Number.isFinite(durationMs) || durationMs === 0) return
    const command = { ...movementIntent(input), durationMs, sequence: this.nextSequence++ }
    this.pending.set(command.sequence, command)
    this.unsent.push(command)
    this.apply(command)
  }

  private apply(command: MovementMessage) {
    this.position.x += command.x * MOVEMENT_SPEED * (command.durationMs / 1000)
    this.position.z += command.z * MOVEMENT_SPEED * (command.durationMs / 1000)
  }

  reconcile(authoritative: Pick<PlayerState, 'x' | 'y' | 'z' | 'rotation' | 'lastProcessedSequence'>) {
    const { x, y, z, rotation, lastProcessedSequence } = authoritative
    Object.assign(this.position, { x, y, z, rotation })
    for (const [sequence, command] of this.pending) {
      if (sequence <= lastProcessedSequence) this.pending.delete(sequence)
      else this.apply(command)
    }
  }
}
