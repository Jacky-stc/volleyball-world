import { describe, expect, it } from 'vitest'
import { advanceLocalPrediction, LocalPrediction } from './localPrediction'

describe('local multiplayer prediction', () => {
  const right = { horizontal: 1, vertical: 0, run: false }
  const origin = { x: 0, y: 0, z: 0, rotation: 0, lastProcessedSequence: 0 }

  it('replays exactly the sent and unsent commands after a complete-command acknowledgement', () => {
    const prediction = new LocalPrediction()
    prediction.advance(right, 0.02)
    prediction.advance({ ...right, horizontal: 0, vertical: 1 }, 0.03)
    const commands = prediction.drainInputs()
    expect(commands).toEqual([
      { x: 1, z: -0, durationMs: 20, sequence: 1 },
      { x: 0, z: -1, durationMs: 30, sequence: 2 },
    ])
    expect(prediction.drainInputs()).toEqual([])
    prediction.advance(right, 0.01)
    const authoritative = Object.freeze({ ...origin, x: 0.056, lastProcessedSequence: 1 })
    for (let i = 0; i < 5; i++) prediction.reconcile(authoritative)
    expect(prediction.position.x).toBeCloseTo(0.084)
    expect(prediction.position.z).toBeCloseTo(-0.084)
    expect(prediction.pendingCount).toBe(2)
    prediction.reconcile({ ...origin, x: 10, lastProcessedSequence: 3 })
    expect(prediction.position.x).toBe(10)
    expect(prediction.pendingCount).toBe(0)
    prediction.reconcile({ ...origin, x: 11, lastProcessedSequence: 3 })
    expect(prediction.position.x).toBe(11)
  })

  it('bounds stalled frames and records idle time so it consumes server time too', () => {
    const prediction = new LocalPrediction()
    prediction.advance(right, 2)
    prediction.advance({ ...right, horizontal: 0 }, 0.05)
    prediction.advance(right, NaN)
    expect(prediction.position.x).toBeCloseTo(0.28)
    expect(prediction.drainInputs().map((input) => input.durationMs)).toEqual([100, 50])
  })

  it('moves immediately at server speed without changing the authoritative spawn', () => {
    const authoritative = Object.freeze({ x: 10, y: 3, z: 20, rotation: 1 })
    const predicted = { ...authoritative }
    advanceLocalPrediction(predicted, { horizontal: 1, vertical: 1, run: true }, 0.5)
    expect(predicted.x).toBeCloseTo(10 + 1.4 / Math.sqrt(2))
    expect(predicted.z).toBeCloseTo(20 - 1.4 / Math.sqrt(2))
    expect(predicted.y).toBe(3)
    expect(predicted.rotation).toBe(1)
    expect(authoritative).toEqual({ x: 10, y: 3, z: 20, rotation: 1 })
  })

  it('produces the same displacement at different render rates', () => {
    for (const fps of [30, 60, 144]) {
      const predicted = { x: 0, z: 0 }
      for (let frame = 0; frame < fps; frame++) {
        advanceLocalPrediction(predicted, { horizontal: -1, vertical: 0, run: false }, 1 / fps)
      }
      expect(predicted.x).toBeCloseTo(-2.8)
      expect(predicted.z).toBe(0)
    }
  })

  it('stops immediately on release and preserves subunit intent magnitude', () => {
    const predicted = { x: 0, z: 0 }
    advanceLocalPrediction(predicted, { horizontal: 0, vertical: -0.5, run: false }, 1)
    expect(predicted.z).toBeCloseTo(1.4)
    advanceLocalPrediction(predicted, { horizontal: 0, vertical: 0, run: true }, 1)
    expect(predicted).toEqual({ x: 0, z: 1.4 })
  })
})
