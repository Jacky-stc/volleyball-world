import { afterEach, expect, it, vi } from 'vitest'
import { LocalPrediction } from '../game/localPrediction'
import { canRequestMatch, requestMatch, limitDisplayName, sendChat, sendMovement } from './connect'

it('only sends empty match intent for the connected local player in range', () => {
  const send = vi.fn()
  const player = { x: 0, z: 0 }
  const room = {
    send,
    sessionId: 'local',
    connection: { isOpen: true },
    state: {
      players: new Map([
        ['local', player],
        ['remote', { x: 0, z: 9 }],
      ]),
    },
  }
  const joined = room as unknown as Parameters<typeof requestMatch>[0]
  expect(requestMatch(joined)).toBe(false)
  expect(send).not.toHaveBeenCalled()
  player.z = 9
  expect(canRequestMatch(joined)).toBe(true)
  expect(requestMatch(joined)).toBe(true)
  expect(send).toHaveBeenCalledExactlyOnceWith('match:join', null)
  room.connection.isOpen = false
  expect(requestMatch(joined)).toBe(false)
  room.state.players.clear()
  expect(canRequestMatch(joined)).toBe(false)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('limits a display name to 20 Unicode code points', () => {
  expect(limitDisplayName('😀'.repeat(21))).toBe('😀'.repeat(20))
})

it('sends trimmed chat text and ignores empty input', () => {
  const send = vi.fn()
  const room = { send } as unknown as Parameters<typeof sendChat>[0]
  expect(sendChat(room, '  Hello  ')).toBe(true)
  expect(sendChat(room, ' \n ')).toBe(false)
  expect(send).toHaveBeenCalledExactlyOnceWith('chat', 'Hello')
})

it('batches predicted commands periodically and flushes on blur and visibility without sending transforms', () => {
  vi.useFakeTimers()
  const windowEvents = new EventTarget()
  const documentEvents = new EventTarget()
  vi.stubGlobal('window', {
    setInterval,
    clearInterval,
    addEventListener: windowEvents.addEventListener.bind(windowEvents),
    removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
  })
  vi.stubGlobal('document', documentEvents)
  Object.assign(documentEvents, { hidden: true })
  const send = vi.fn()
  const prediction = new LocalPrediction()
  const right = { horizontal: 1, vertical: 0, run: true }
  prediction.advance(right, 0.01)
  const stop = sendMovement({ send } as unknown as Parameters<typeof sendMovement>[0], () => prediction.drainInputs())
  prediction.advance(right, 0.02)
  prediction.advance(right, 0.03)
  vi.advanceTimersByTime(50)
  prediction.advance(right, 0.01)
  windowEvents.dispatchEvent(new Event('blur'))
  prediction.advance(right, 0.01)
  documentEvents.dispatchEvent(new Event('visibilitychange'))
  expect(send.mock.calls).toEqual([
    ['move', [{ x: 1, z: -0, durationMs: 10, sequence: 1 }]],
    [
      'move',
      [
        { x: 1, z: -0, durationMs: 20, sequence: 2 },
        { x: 1, z: -0, durationMs: 30, sequence: 3 },
      ],
    ],
    ['move', [{ x: 1, z: -0, durationMs: 10, sequence: 4 }]],
    ['move', [{ x: 1, z: -0, durationMs: 10, sequence: 5 }]],
  ])
  stop()
  prediction.advance(right, 0.01)
  vi.advanceTimersByTime(100)
  windowEvents.dispatchEvent(new Event('blur'))
  documentEvents.dispatchEvent(new Event('visibilitychange'))
  expect(send).toHaveBeenCalledTimes(4)
})
