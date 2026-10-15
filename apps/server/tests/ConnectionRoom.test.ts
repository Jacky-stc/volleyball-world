import { Server } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { createServer } from 'node:http'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { connect, movementIntent } from '../../client/src/network/connect'
import { LocalPrediction } from '../../client/src/game/localPrediction'
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

test('join names are server-owned, sanitized, replicated, and removed on leave', async () => {
  const first = await connect(endpoint, '  Alice  ')
  const second = await connect(endpoint, '  Bob\nSmith  ')
  const empty = await connect(endpoint, ' \n ')
  const long = await connect(endpoint, 'A'.repeat(30))
  const invalid = await connect(endpoint, 42 as unknown as string)
  try {
    await expect.poll(() => second.state.players.get(first.sessionId)?.displayName).toBe('Alice')
    await expect.poll(() => first.state?.players.get(second.sessionId)?.displayName).toBe('Bob Smith')
    await expect.poll(() => empty.state?.players.get(empty.sessionId)?.displayName).toBe('Player')
    await expect.poll(() => long.state?.players.get(long.sessionId)?.displayName).toBe('A'.repeat(20))
    await expect.poll(() => invalid.state?.players.get(invalid.sessionId)?.displayName).toBe('Player')
    await first.leave()
    await expect.poll(() => second.state.players.has(first.sessionId)).toBe(false)
  } finally {
    if (first.connection.isOpen) await first.leave()
    await second.leave()
    await empty.leave()
    await long.leave()
    await invalid.leave()
  }
})

test('chat broadcasts validated text with server-owned sender identity and survives reconnect', async () => {
  const first = await connect(endpoint, '  Alice  ')
  const second = await connect(endpoint, 'Bob')
  const firstMessages: unknown[] = []
  const secondMessages: unknown[] = []
  const stopFirst = first.onMessage('chat', (message: unknown) => firstMessages.push(message))
  const stopSecond = second.onMessage('chat', (message: unknown) => secondMessages.push(message))
  let rejoined: Awaited<ReturnType<typeof connect>> | undefined
  try {
    await expect.poll(() => second.state?.players.size).toBe(2)
    first.send('chat', '  Hello   Bob  ')
    const hello = { sessionId: first.sessionId, displayName: 'Alice', text: 'Hello Bob' }
    await expect.poll(() => secondMessages).toEqual([hello])
    await expect.poll(() => firstMessages).toEqual([hello])

    for (const invalid of [' \n ', 'x'.repeat(201), { text: 'Forged', displayName: 'Bob' }, 42]) first.send('chat', invalid)
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(secondMessages).toEqual([hello])

    second.send('chat', '  Hi Alice  ')
    const reply = { sessionId: second.sessionId, displayName: 'Bob', text: 'Hi Alice' }
    await expect.poll(() => firstMessages).toEqual([hello, reply])
    await expect.poll(() => secondMessages).toEqual([hello, reply])

    await first.leave()
    rejoined = await connect(endpoint, 'Alice Again')
    await expect.poll(() => second.state.players.has(rejoined!.sessionId)).toBe(true)
    rejoined.send('chat', 'Back')
    await expect
      .poll(() => secondMessages)
      .toEqual([hello, reply, { sessionId: rejoined!.sessionId, displayName: 'Alice Again', text: 'Back' }])
  } finally {
    stopFirst()
    stopSecond()
    if (first.connection.isOpen) await first.leave()
    await second.leave()
    if (rejoined) await rejoined.leave()
  }
})

test('two clients receive bounded authoritative movement, stop, finite durations, and disconnect', async () => {
  const first = await connect(endpoint)
  const second = await connect(endpoint)
  let timer: ReturnType<typeof setInterval> | undefined
  let sequence = 0
  try {
    expect(second.roomId).toBe(first.roomId)
    await expect.poll(() => second.state?.players.size).toBe(2)
    // Oversized input and extra fields cannot teleport or select another player.
    const move = () =>
      first.send('move', [{ sequence: ++sequence, durationMs: 30, x: 100000, z: -100000, y: 500, speed: 999, sessionId: second.sessionId }])
    timer = setInterval(move, 30)
    move()
    await expect.poll(() => second.state.players.get(first.sessionId)?.x ?? 0).toBeGreaterThan(0.2)
    clearInterval(timer)
    first.send('move', [{ sequence: ++sequence, durationMs: 10, x: 0, z: 0 }])
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
      first.send('move', [{ x: 1, z: 0, durationMs: 10, sequence: invalidSequence }])
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect({ x: remote.x, z: remote.z }).toEqual(stopped)
    expect(remote.lastProcessedSequence).toBe(sequence)
    first.send('move', [{ sequence: ++sequence, durationMs: 50, x: 1, z: 0 }])
    await expect.poll(() => remote.x).toBeGreaterThan(stopped.x)
    await new Promise((resolve) => setTimeout(resolve, 400))
    const expired = remote.x
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(remote.x).toBe(expired)
    expect(expired - stopped.x).toBeCloseTo(2.8 * 0.05)
    await first.leave()
    await expect.poll(() => second.state.players.has(first.sessionId)).toBe(false)
  } finally {
    clearInterval(timer)
    if (first.connection.isOpen) await first.leave()
    await second.leave()
  }
})

// Exercise real 60 Hz simulation and Colyseus patches, including patches with unchanged acks.
for (const fps of [30, 60, 144]) {
  test(`prediction stays invariant through authoritative patches at ${fps} fps and 50 ms sends`, async () => {
    const room = await connect(endpoint)
    let render: ReturnType<typeof setInterval> | undefined
    let sender: ReturnType<typeof setInterval> | undefined
    const prediction = new LocalPrediction()
    const corrections: number[] = []
    let patches = 0
    try {
      await expect.poll(() => room.state?.players.has(room.sessionId)).toBe(true)
      prediction.reconcile(room.state.players.get(room.sessionId)!)
      room.onStateChange(() => {
        const before = { ...prediction.position }
        prediction.reconcile(room.state.players.get(room.sessionId)!)
        corrections.push(Math.hypot(prediction.position.x - before.x, prediction.position.z - before.z))
        patches++
      })
      let frame = 0
      render = setInterval(() => {
        // Straight, diagonal, reversal and release all within the same transport model.
        const phase = Math.floor(frame++ / (fps / 4)) % 4
        prediction.advance({ horizontal: phase === 2 ? -1 : phase === 3 ? 0 : 1, vertical: phase === 1 ? 1 : 0, run: false }, 1 / fps)
      }, 1000 / fps)
      const send = () => {
        const inputs = prediction.drainInputs()
        if (inputs.length) room.send('move', inputs)
      }
      sender = setInterval(send, 50)
      await new Promise((resolve) => setTimeout(resolve, 1200))
      clearInterval(render)
      clearInterval(sender)
      send()
      await expect.poll(() => prediction.pendingCount).toBe(0)
      expect(patches).toBeGreaterThan(10)
      expect(Math.max(...corrections)).toBeLessThan(0.00001)
    } finally {
      clearInterval(render)
      clearInterval(sender)
      await room.leave()
    }
  })
}

test('invalid durations do not consume sequences and command flooding stays bounded by server time', async () => {
  const room = await connect(endpoint)
  try {
    await expect.poll(() => room.state?.players.has(room.sessionId)).toBe(true)
    const player = room.state.players.get(room.sessionId)!
    for (const durationMs of [undefined, -1, 0, 101, Infinity, NaN, '50']) {
      room.send('move', [{ x: 1, z: 0, sequence: 1, durationMs }])
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(player.lastProcessedSequence).toBe(0)
    expect(player.x).toBe(0)
    room.send('move', [{ x: 1, z: 0, sequence: 1, durationMs: 50 }])
    await expect.poll(() => player.lastProcessedSequence).toBe(1)
    expect(player.x).toBeCloseTo(0.14)
    const before = player.x
    const started = performance.now()
    room.send(
      'move',
      Array.from({ length: 64 }, (_, i) => ({ x: 1, z: 0, sequence: i + 2, durationMs: 100 }))
    )
    await expect.poll(() => player.lastProcessedSequence).toBe(65)
    // Includes at most 100 ms of banked credit. Excess queued time expires and is acknowledged.
    expect(player.x - before).toBeLessThanOrEqual(2.8 * ((performance.now() - started) / 1000 + 0.1))
    expect(player.x - before).toBeLessThan(2.8)
    const stopped = player.x
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(player.x).toBe(stopped)
  } finally {
    await room.leave()
  }
})
