import { Client } from '@colyseus/sdk'
import type { PlayerInput } from '@volleyball/game-core'

type PlayerState = { x: number; y: number; z: number; rotation: number }
type ConnectionState = { players: Map<string, PlayerState> }

// Explicit opt-in: offline gameplay never opens a network connection.
// The caller owns the returned room and must call room.leave() when finished.
export async function connect(endpoint = 'http://localhost:2567') {
  return new Client(endpoint).joinOrCreate<ConnectionState>('connection')
}

export function movementIntent(input: PlayerInput) {
  const length = Math.max(1, Math.hypot(input.horizontal, input.vertical))
  return { x: input.horizontal / length, z: -input.vertical / length }
}

// Input transport only: transforms are received exclusively through room state.
export function sendMovement(room: Awaited<ReturnType<typeof connect>>, sample: () => PlayerInput) {
  const send = () => room.send('move', movementIntent(sample()))
  const stop = () => room.send('move', { x: 0, z: 0 })
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
