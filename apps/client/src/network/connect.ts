import { Client } from '@colyseus/sdk'

type PlayerState = { x: number; y: number; z: number; rotation: number }
type ConnectionState = { players: Map<string, PlayerState> }

// Explicit opt-in: offline gameplay never opens a network connection.
// The caller owns the returned room and must call room.leave() when finished.
export async function connect(endpoint = 'http://localhost:2567') {
  return new Client(endpoint).joinOrCreate<ConnectionState>('connection')
}
