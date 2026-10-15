import { expect, test } from 'vitest'
import { VolleyballMatch } from '../src/matches/VolleyballMatch.js'

test('two seats, idempotent membership, released seats, and fresh session after last departure', () => {
  const match = new VolleyballMatch()
  const first = match.join('a')
  expect(first).toMatchObject({ status: 'accepted', seat: 1 })
  expect(match.join('a')).toEqual(first)
  const second = match.join('b')
  expect(second).toMatchObject({ ...first, seat: 2 })
  expect(match.join('c')).toEqual({ status: 'rejected', reason: 'full' })
  match.leave('a')
  expect(match.join('c')).toEqual(first)
  expect(match.join('b')).toEqual(second)
  match.leave('b')
  match.leave('c')
  expect(match.join('d')).not.toEqual(first)
})
