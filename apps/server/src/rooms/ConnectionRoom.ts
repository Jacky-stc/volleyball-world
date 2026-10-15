import { Room, type Client } from '@colyseus/core'
import { schema, t } from '@colyseus/schema'
import { isWithinCourtInteraction } from '@volleyball/game-core/court'
import { VolleyballMatch } from '../matches/VolleyballMatch.js'

const PlayerState = schema(
  { x: t.number(), y: t.number(), z: t.number(), rotation: t.number(), lastProcessedSequence: t.number(), displayName: t.string() },
  'PlayerState'
)
const ConnectionState = schema({ players: t.map(PlayerState) }, 'ConnectionState')

const TICK_MS = 1000 / 60
const MOVEMENT_SPEED = 2.8
const INPUT_TIMEOUT_MS = 250
const DEFAULT_DISPLAY_NAME = 'Player'
const MAX_DISPLAY_NAME_LENGTH = 20
const MAX_CHAT_LENGTH = 200

function displayNameFromOptions(options: unknown) {
  const value = options && typeof options === 'object' && 'displayName' in options ? options.displayName : undefined
  if (typeof value !== 'string') return DEFAULT_DISPLAY_NAME
  const name = value
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return Array.from(name).slice(0, MAX_DISPLAY_NAME_LENGTH).join('') || DEFAULT_DISPLAY_NAME
}

type Movement = { x: number; z: number; sequence: number; durationMs: number; receivedAt: number }
type MovementQueue = { commands: Movement[]; latestSequence: number; creditMs: number }

export class ConnectionRoom extends Room<{ state: InstanceType<typeof ConnectionState> }> {
  state = new ConnectionState()
  private movementInputs = new Map<string, MovementQueue>()
  private match = new VolleyballMatch()

  onCreate() {
    this.onMessage('match:join', (client, message: unknown) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      // No client-selected identity, position, room, or seat is accepted.
      if (message !== null) {
        client.send('match:entry', { status: 'rejected', reason: 'invalid-request' })
        return
      }
      if (!isWithinCourtInteraction(player)) {
        client.send('match:entry', { status: 'rejected', reason: 'out-of-range' })
        return
      }
      client.send('match:entry', this.match.join(client.sessionId))
    })

    this.onMessage('chat', (client, message: unknown) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || typeof message !== 'string' || message.length > MAX_CHAT_LENGTH * 2) return
      const text = message
        .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (!text || Array.from(text).length > MAX_CHAT_LENGTH) return
      this.broadcast('chat', { sessionId: client.sessionId, displayName: player.displayName, text })
    })

    this.onMessage('move', (client, message: unknown) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      if (!Array.isArray(message) || message.length > 64) return
      const queue = this.movementInputs.get(client.sessionId)!
      for (const command of message) {
        if (!command || typeof command !== 'object') continue
        const { x, z, sequence, durationMs } = command
        if (typeof x !== 'number' || typeof z !== 'number' || !Number.isFinite(x) || !Number.isFinite(z)) continue
        if (!Number.isSafeInteger(sequence) || sequence <= queue.latestSequence) continue
        if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 100) continue
        if (queue.commands.length >= 256) break
        const clampedX = Math.max(-1, Math.min(1, x))
        const clampedZ = Math.max(-1, Math.min(1, z))
        const length = Math.max(1, Math.hypot(clampedX, clampedZ))
        queue.commands.push({ x: clampedX / length, z: clampedZ / length, sequence, durationMs, receivedAt: performance.now() })
        queue.latestSequence = sequence
      }
    })

    // Fixed steps with bounded catch-up; message frequency never determines speed.
    let accumulator = 0
    this.setSimulationInterval((elapsedMs) => {
      accumulator += Math.max(0, Math.min(elapsedMs, TICK_MS * 6))
      const now = performance.now()
      while (accumulator + 1e-8 >= TICK_MS) {
        for (const [sessionId, queue] of this.movementInputs) {
          const player = this.state.players.get(sessionId)
          if (!player) continue
          // Server elapsed time limits movement, regardless of client message rate.
          // Credit covers the 50 ms transport batches, but cannot accumulate while idle indefinitely.
          queue.creditMs = Math.min(100, queue.creditMs + TICK_MS)
          while (queue.commands.length) {
            const input = queue.commands[0]!
            const expired = now - input.receivedAt > INPUT_TIMEOUT_MS
            if (!expired && input.durationMs > queue.creditMs + 1e-8) break
            queue.commands.shift()
            if (!expired) {
              queue.creditMs = Math.max(0, queue.creditMs - input.durationMs)
              player.x += input.x * MOVEMENT_SPEED * (input.durationMs / 1000)
              player.z += input.z * MOVEMENT_SPEED * (input.durationMs / 1000)
            }
            // Ack a complete command only; expired commands are rejected and corrected by replay.
            player.lastProcessedSequence = input.sequence
          }
        }
        accumulator -= TICK_MS
      }
    }, TICK_MS)
  }

  onJoin(client: Client, options: unknown) {
    this.movementInputs.set(client.sessionId, { commands: [], latestSequence: 0, creditMs: 0 })
    this.state.players.set(
      client.sessionId,
      new PlayerState({ x: 0, y: 0, z: 0, rotation: 0, lastProcessedSequence: 0, displayName: displayNameFromOptions(options) })
    )
  }

  onLeave(client: Client) {
    this.match.leave(client.sessionId)
    this.movementInputs.delete(client.sessionId)
    this.state.players.delete(client.sessionId)
  }
}
