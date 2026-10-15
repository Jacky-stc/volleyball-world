import { expect, test } from 'vitest'
import { courtDimensions, courtInteraction, isWithinCourtInteraction } from './court'

test('interaction is a finite inclusive circle at the near baseline', () => {
  expect(courtInteraction.z).toBe(courtDimensions.length / 2)
  expect(isWithinCourtInteraction({ x: 0, z: 0 })).toBe(false)
  expect(isWithinCourtInteraction({ x: 0, z: 7 })).toBe(true)
  expect(isWithinCourtInteraction({ x: 2, z: 9 })).toBe(true)
  expect(isWithinCourtInteraction({ x: 2.01, z: 9 })).toBe(false)
  expect(isWithinCourtInteraction({ x: 2, z: 11 })).toBe(false)
  expect(isWithinCourtInteraction({ x: NaN, z: 9 })).toBe(false)
  expect(isWithinCourtInteraction({ x: 0, z: Infinity })).toBe(false)
})
