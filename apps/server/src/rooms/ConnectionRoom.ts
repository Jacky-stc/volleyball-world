import { Room, type Client } from '@colyseus/core'
import { schema, t } from '@colyseus/schema'

const PlayerState = schema(
  { x: t.number(), y: t.number(), z: t.number(), rotation: t.number(), lastProcessedSequence: t.number() },
  'PlayerState'
)
const ConnectionState = schema({ players: t.map(PlayerState) }, 'ConnectionState')

const TICK_MS = 1000 / 60
const MOVEMENT_SPEED = 2.8
const INPUT_TIMEOUT_MS = 250

type Movement = { x: number; z: number; sequence: number; receivedAt: number }

export class ConnectionRoom extends Room<{ state: InstanceType<typeof ConnectionState> }> {
  state = new ConnectionState()
  private movementInputs = new Map<string, Movement>()

  onCreate() {
    this.onMessage('move', (client, message: unknown) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      if (!message || typeof message !== 'object') return
      const { x, z, sequence } = message as { x?: unknown; z?: unknown; sequence?: unknown }
      if (typeof x !== 'number' || typeof z !== 'number' || !Number.isFinite(x) || !Number.isFinite(z)) return
      if (typeof sequence !== 'number' || !Number.isSafeInteger(sequence) || sequence <= 0) return
      const latest = this.movementInputs.get(client.sessionId)?.sequence ?? player.lastProcessedSequence
      if (sequence <= latest) return
      const clampedX = Math.max(-1, Math.min(1, x))
      const clampedZ = Math.max(-1, Math.min(1, z))
      const length = Math.max(1, Math.hypot(clampedX, clampedZ))
      this.movementInputs.set(client.sessionId, { x: clampedX / length, z: clampedZ / length, sequence, receivedAt: performance.now() })
    })

    // Fixed steps with bounded catch-up; message frequency never determines speed.
    let accumulator = 0
    this.setSimulationInterval((elapsedMs) => {
      accumulator += Math.max(0, Math.min(elapsedMs, TICK_MS * 6))
      const now = performance.now()
      while (accumulator + 1e-8 >= TICK_MS) {
        for (const [sessionId, input] of this.movementInputs) {
          const player = this.state.players.get(sessionId)
          if (!player) continue
          // Acknowledge only at simulation time, including zero/expired intents.
          // Newer held intents supersede any older messages received between ticks.
          player.lastProcessedSequence = input.sequence
          if (now - input.receivedAt > INPUT_TIMEOUT_MS) {
            this.movementInputs.delete(sessionId)
            continue
          }
          player.x += input.x * MOVEMENT_SPEED * (TICK_MS / 1000)
          player.z += input.z * MOVEMENT_SPEED * (TICK_MS / 1000)
        }
        accumulator -= TICK_MS
      }
    }, TICK_MS)
  }

  onJoin(client: Client) {
    this.state.players.set(client.sessionId, new PlayerState({ x: 0, y: 0, z: 0, rotation: 0, lastProcessedSequence: 0 }))
  }

  onLeave(client: Client) {
    this.movementInputs.delete(client.sessionId)
    this.state.players.delete(client.sessionId)
  }
}
