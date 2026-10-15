import { Room, type Client } from '@colyseus/core'
import { schema, t } from '@colyseus/schema'

const PlayerState = schema({ x: t.number(), y: t.number(), z: t.number(), rotation: t.number() }, 'PlayerState')
const ConnectionState = schema({ players: t.map(PlayerState) }, 'ConnectionState')

export class ConnectionRoom extends Room<{ state: InstanceType<typeof ConnectionState> }> {
  state = new ConnectionState()

  onJoin(client: Client) {
    this.state.players.set(client.sessionId, new PlayerState({ x: 0, y: 0, z: 0, rotation: 0 }))
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId)
  }
}
