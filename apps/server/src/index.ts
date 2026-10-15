import { Server } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { ConnectionRoom } from './rooms/ConnectionRoom.js'

const port = Number(process.env.PORT ?? 2567)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535')
}

const server = new Server({ transport: new WebSocketTransport() })
server.define('connection', ConnectionRoom)

await server.listen(port)
console.log(`Multiplayer server listening on port ${port}`)
