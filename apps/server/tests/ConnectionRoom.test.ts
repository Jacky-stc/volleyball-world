import { Server } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { createServer } from 'node:http'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { connect, movementIntent } from '../../client/src/network/connect'
import { ConnectionRoom } from '../src/rooms/ConnectionRoom.js'

const http = createServer()
const server = new Server({ transport: new WebSocketTransport({ server: http }), greet: false })
server.define('connection', ConnectionRoom)
let endpoint: string

beforeAll(async () => {
  await server.listen(0, '127.0.0.1')
  const address = http.address()
  if (!address || typeof address === 'string') throw new Error('Missing server address')
  endpoint = `http://127.0.0.1:${address.port}`
})
afterAll(async () => {
  await server.gracefullyShutdown(false)
})

test('input preserves direction and normalizes diagonals without sending speed or position', () => {
  expect(movementIntent({ horizontal: 0, vertical: 1, run: true })).toEqual({ x: 0, z: -1 })
  const diagonal = movementIntent({ horizontal: 1, vertical: 1, run: false })
  expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(1)
})

test('two clients receive bounded authoritative movement, stop, expiry, and disconnect', async () => {
  const first = await connect(endpoint)
  const second = await connect(endpoint)
  let timer: ReturnType<typeof setInterval> | undefined
  let sequence = 0
  try {
    expect(second.roomId).toBe(first.roomId)
    await expect.poll(() => second.state?.players.size).toBe(2)
    // Oversized input and extra fields cannot teleport or select another player.
    const move = () => first.send('move', { sequence: ++sequence, x: 100000, z: -100000, y: 500, speed: 999, sessionId: second.sessionId })
    timer = setInterval(move, 30)
    move()
    await expect.poll(() => second.state.players.get(first.sessionId)?.x ?? 0).toBeGreaterThan(0.2)
    clearInterval(timer)
    first.send('move', { sequence: ++sequence, x: 0, z: 0 })
    await new Promise((resolve) => setTimeout(resolve, 150))
    const remote = second.state.players.get(first.sessionId)!
    expect(remote.lastProcessedSequence).toBe(sequence)
    expect(second.state.players.get(second.sessionId)!.lastProcessedSequence).toBe(0)
    const stopped = { x: remote.x, z: remote.z }
    expect(remote.x).toBeLessThan(3)
    expect(remote.z).toBeCloseTo(-remote.x)
    expect(remote.y).toBe(0)
    expect(second.state.players.get(second.sessionId)!.x).toBe(0)
    expect(first.state.players.get(first.sessionId)!.x).toBe(remote.x)
    for (const message of [null, {}, { x: '10', z: 0 }, { x: Infinity, z: 0 }, { x: NaN, z: 0 }, { position: { x: 999, z: 999 } }]) {
      first.send('move', message)
    }
    for (const invalidSequence of [sequence, sequence - 1, -1, 1.5, '100', Number.MAX_SAFE_INTEGER + 1]) {
      first.send('move', { x: 1, z: 0, sequence: invalidSequence })
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect({ x: remote.x, z: remote.z }).toEqual(stopped)
    expect(remote.lastProcessedSequence).toBe(sequence)
    first.send('move', { sequence: ++sequence, x: 1, z: 0 })
    await expect.poll(() => remote.x).toBeGreaterThan(stopped.x)
    await new Promise((resolve) => setTimeout(resolve, 400))
    const expired = remote.x
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(remote.x).toBe(expired)
    expect(expired - stopped.x).toBeLessThanOrEqual(2.8 * 0.3)
    await first.leave()
    await expect.poll(() => second.state.players.has(first.sessionId)).toBe(false)
  } finally {
    clearInterval(timer)
    if (first.connection.isOpen) await first.leave()
    await second.leave()
  }
})
