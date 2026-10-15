import { beforeAll, describe, expect, it } from 'vitest'
import { initializePhysics } from '../physics/CharacterController'
import { courtScene } from '../scenes/SceneManager'
import { LocalSimulation } from './LocalSimulation'

beforeAll(async () => {
  await initializePhysics()
})
describe('offline world with real Rapier collision', () => {
  it('settles on the ground, stops at the boundary, and resets', () => {
    const simulation = new LocalSimulation(courtScene)
    try {
      for (let i = 0; i < 120; i++) simulation.advance(1 / 60, { horizontal: 0, vertical: 0, run: false })
      expect(simulation.player.position.y).toBeGreaterThanOrEqual(0)
      expect(simulation.player.position.y).toBeLessThan(0.05)
      // Traverse both halves without the removed scenery blocking the player.
      for (let i = 0; i < 360; i++) simulation.advance(1 / 60, { horizontal: 0, vertical: 1, run: true })
      expect(simulation.player.position.z).toBeGreaterThan(-11.7)
      expect(simulation.player.position.z).toBeLessThan(-11.5)
      expect(simulation.player.animation).toBe('idle')
      simulation.reset()
      expect(simulation.player.position).toEqual(courtScene.spawn)
      expect(simulation.player.animation).toBe('idle')
    } finally {
      simulation.dispose()
    }
  })
  it('slides along the rectangular court boundary and stays on the floor', () => {
    const simulation = new LocalSimulation(courtScene)
    try {
      for (let i = 0; i < 600; i++) simulation.advance(1 / 60, { horizontal: 1, vertical: 1, run: true })
      expect(simulation.player.position.x).toBeLessThan(7.2)
      expect(simulation.player.position.x).toBeGreaterThan(7)
      expect(simulation.player.position.z).toBeGreaterThan(-11.7)
      expect(simulation.player.position.y).toBeGreaterThanOrEqual(0)
    } finally {
      simulation.dispose()
    }
  })
  it('does not move while paused or advance stale interpolation after reset', () => {
    const simulation = new LocalSimulation(courtScene)
    try {
      simulation.paused = true
      simulation.advance(1, { horizontal: 1, vertical: 0, run: true })
      expect(simulation.player.position).toEqual(courtScene.spawn)
      simulation.paused = false
      simulation.advance(0.05, { horizontal: 1, vertical: 0, run: true })
      expect(simulation.player.position.x).toBeGreaterThan(0)
      simulation.reset()
      expect(simulation.previous).toEqual(courtScene.spawn)
    } finally {
      simulation.dispose()
    }
  })
})
