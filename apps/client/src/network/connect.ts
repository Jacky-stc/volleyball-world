import { Client } from '@colyseus/sdk'
import type { PlayerInput } from '@volleyball/game-core'

export type PlayerState = { x: number; y: number; z: number; rotation: number; lastProcessedSequence: number; displayName: string }
export type MovementMessage = { x: number; z: number; sequence: number; durationMs: number }
export type ChatEvent = { sessionId: string; displayName: string; text: string }
type ConnectionState = { players: Map<string, PlayerState> }

export function limitDisplayName(value: string) {
  return Array.from(value).slice(0, 20).join('')
}

// Explicit opt-in: offline gameplay never opens a network connection.
// The caller owns the returned room and must call room.leave() when finished.
export async function connect(endpoint = 'http://localhost:2567', displayName = 'Player') {
  return new Client(endpoint).joinOrCreate<ConnectionState>('connection', { displayName })
}

export type JoinedRoom = Awaited<ReturnType<typeof connect>>

export function sendChat(room: JoinedRoom, message: string) {
  const text = message.trim()
  if (!text) return false
  room.send('chat', text)
  return true
}

export function movementIntent(input: PlayerInput) {
  const x = Math.max(-1, Math.min(1, input.horizontal))
  const z = Math.max(-1, Math.min(1, -input.vertical))
  const length = Math.max(1, Math.hypot(x, z))
  return { x: x / length, z: z / length }
}

// Input transport only: transforms are received exclusively through room state.
export function sendMovement(room: Awaited<ReturnType<typeof connect>>, drainInputs: () => MovementMessage[]) {
  const send = () => {
    const inputs = drainInputs()
    // Bounded batches preserve ordered commands even at high render rates.
    for (let i = 0; i < inputs.length; i += 64) room.send('move', inputs.slice(i, i + 64))
  }
  const visibility = () => {
    if (document.hidden) send()
  }
  send()
  const timer = window.setInterval(send, 50)
  // There is no held intent to stop: only already-predicted time is transmitted.
  window.addEventListener('blur', send)
  document.addEventListener('visibilitychange', visibility)
  return () => {
    window.clearInterval(timer)
    window.removeEventListener('blur', send)
    document.removeEventListener('visibilitychange', visibility)
  }
}
