import { describe, expect, it } from 'vitest'
import { animationFromSpeed, FixedStepper, movementVelocity, RUN_SPEED, WALK_SPEED } from './index'

describe('camera-relative movement', () => {
  it('keeps cardinal and diagonal movement at the same speed', () => {
    for (const [horizontal, vertical] of [
      [1, 0],
      [0, 1],
      [1, 1],
      [-1, 1],
    ]) {
      const velocity = movementVelocity({ horizontal, vertical, run: false })
      expect(Math.hypot(velocity.x, velocity.z)).toBeCloseTo(WALK_SPEED)
    }
  })
  it('maps screen-up away from the camera and screen-right across it', () => {
    const up = movementVelocity({ horizontal: 0, vertical: 1, run: false })
    const right = movementVelocity({ horizontal: 1, vertical: 0, run: true })
    expect(up.x).toBe(0)
    expect(up.z).toBeLessThan(0)
    expect(right.x).toBeGreaterThan(0)
    expect(right.z).toBeCloseTo(0)
    expect(Math.hypot(right.x, right.z)).toBeCloseTo(RUN_SPEED)
  })
  it('idles when collision reduces actual velocity to zero', () => {
    expect(animationFromSpeed(0)).toBe('idle')
    expect(animationFromSpeed(WALK_SPEED)).toBe('walk')
    expect(animationFromSpeed(RUN_SPEED)).toBe('run')
  })
})

describe('fixed timestep', () => {
  it.each([30, 60, 144])('simulates the same distance at %i render frames per second', (fps) => {
    const clock = new FixedStepper()
    let distance = 0
    for (let i = 0; i < fps * 4; i++)
      clock.advance(1 / fps, (dt) => {
        distance += WALK_SPEED * dt
      })
    expect(distance).toBeCloseTo(WALK_SPEED * 4, 8)
  })
  it('caps catch-up after a long stall', () => {
    let steps = 0
    new FixedStepper().advance(10, () => {
      steps++
    })
    expect(steps).toBe(6)
  })
})
