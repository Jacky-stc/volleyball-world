import { Client } from '@colyseus/sdk'
import type { PlayerInput } from '@volleyball/game-core'

export type PlayerState = { x: number; y: number; z: number; rotation: number; lastProcessedSequence: number; displayName: string }
export type MovementMessage = { x: number; z: number; sequence: number }
type ConnectionState = { players: Map<string, PlayerState> }

// Explicit opt-in: offline gameplay never opens a network connection.
// The caller owns the returned room and must call room.leave() when finished.
export async function connect(endpoint = 'http://localhost:2567', displayName = 'Player') {
  return new Client(endpoint).joinOrCreate<ConnectionState>('connection', { displayName })
}

export function movementIntent(input: PlayerInput) {
  const length = Math.max(1, Math.hypot(input.horizontal, input.vertical))
  return { x: input.horizontal / length, z: -input.vertical / length }
}

// Input transport only: transforms are received exclusively through room state.
export function sendMovement(
  room: Awaited<ReturnType<typeof connect>>,
  sample: () => PlayerInput,
  sequenceInput: (input: PlayerInput) => MovementMessage
) {
  const send = () => room.send('move', sequenceInput(sample()))
  const stop = () => room.send('move', sequenceInput({ horizontal: 0, vertical: 0, run: false }))
  const visibility = () => {
    if (document.hidden) stop()
  }
  send()
  const timer = window.setInterval(send, 50)
  window.addEventListener('blur', stop)
  document.addEventListener('visibilitychange', visibility)
  return () => {
    window.clearInterval(timer)
    window.removeEventListener('blur', stop)
    document.removeEventListener('visibilitychange', visibility)
  }
}
