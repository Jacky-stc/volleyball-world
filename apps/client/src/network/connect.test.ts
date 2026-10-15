import { afterEach, expect, it, vi } from 'vitest'
import { LocalPrediction } from '../game/localPrediction'
import { sendMovement } from './connect'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('sequences immediate, periodic, blur and visibility intents without sending transforms', () => {
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
  const stop = sendMovement(
    { send } as unknown as Parameters<typeof sendMovement>[0],
    () => ({ horizontal: 1, vertical: 0, run: true }),
    (input) => prediction.sequenceInput(input)
  )
  vi.advanceTimersByTime(50)
  windowEvents.dispatchEvent(new Event('blur'))
  documentEvents.dispatchEvent(new Event('visibilitychange'))
  expect(send.mock.calls).toEqual([
    ['move', { x: 1, z: -0, sequence: 1 }],
    ['move', { x: 1, z: -0, sequence: 2 }],
    ['move', { x: 0, z: -0, sequence: 3 }],
    ['move', { x: 0, z: -0, sequence: 4 }],
  ])
  stop()
  vi.advanceTimersByTime(100)
  windowEvents.dispatchEvent(new Event('blur'))
  documentEvents.dispatchEvent(new Event('visibilitychange'))
  expect(send).toHaveBeenCalledTimes(4)
})
