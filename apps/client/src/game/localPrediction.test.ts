import { describe, expect, it } from 'vitest'
import { advanceLocalPrediction, LocalPrediction } from './localPrediction'

describe('local multiplayer prediction', () => {
  const right = { horizontal: 1, vertical: 0, run: false }
  const origin = { x: 0, y: 0, z: 0, rotation: 0, lastProcessedSequence: 0 }

  it('discards acknowledged intervals and replays sent and unsent displacement', () => {
    const prediction = new LocalPrediction()
    prediction.advance(right, 0.05)
    expect(prediction.position.x).toBeCloseTo(0.14)
    expect(prediction.sequenceInput(right)).toEqual({ x: 1, z: -0, sequence: 1 })
    prediction.advance(right, 0.05)
    expect(prediction.sequenceInput(right).sequence).toBe(2)
    prediction.advance(right, 0.025)
    const authoritative = Object.freeze({ ...origin, x: 10, y: 3, rotation: 1, lastProcessedSequence: 1 })
    prediction.reconcile(authoritative)
    expect(prediction.pendingCount).toBe(2)
    expect(prediction.position).toEqual({ x: 10 + 0.14 + 0.07, y: 3, z: 0, rotation: 1 })
    prediction.reconcile(authoritative)
    expect(prediction.position.x).toBeCloseTo(10.21)
    expect(authoritative.x).toBe(10)
    prediction.sequenceInput(right)
    prediction.reconcile({ ...origin, x: 0.2, lastProcessedSequence: 3 })
    expect(prediction.pendingCount).toBe(0)
    expect(prediction.position.x).toBe(0.2)
  })

  it('aggregates direction changes within an interval and does not retain idle frames', () => {
    const prediction = new LocalPrediction()
    prediction.advance(right, 0.02)
    prediction.advance({ ...right, horizontal: 0, vertical: 1 }, 0.03)
    prediction.advance({ ...right, horizontal: 0 }, 1)
    expect(prediction.pendingCount).toBe(1)
    prediction.reconcile(origin)
    expect(prediction.position.x).toBeCloseTo(0.056)
    expect(prediction.position.z).toBeCloseTo(-0.084)
    prediction.sequenceInput(right)
    prediction.reconcile({ ...origin, lastProcessedSequence: 1 })
    expect(prediction.pendingCount).toBe(0)
    prediction.advance({ ...right, horizontal: 0 }, 1)
    expect(prediction.pendingCount).toBe(0)
  })

  it('repeated corrections remove drift even when the acknowledgement is unchanged', () => {
    const prediction = new LocalPrediction()
    for (let sequence = 1; sequence <= 100; sequence++) {
      prediction.advance(right, 0.05)
      prediction.sequenceInput(right)
      prediction.reconcile({ ...origin, x: sequence * 0.1, lastProcessedSequence: sequence })
      expect(prediction.position.x).toBe(sequence * 0.1)
      expect(prediction.pendingCount).toBe(0)
    }
    prediction.reconcile({ ...origin, x: 10.05, lastProcessedSequence: 100 })
    expect(prediction.position.x).toBe(10.05)
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
