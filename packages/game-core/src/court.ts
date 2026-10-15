export const courtDimensions = { width: 9, length: 18, apron: 3, netHeight: 2.43 }
export const courtInteraction = { x: 0, z: courtDimensions.length / 2, radius: 2 }

export function isWithinCourtInteraction(position: { x: number; z: number }) {
  return Math.hypot(position.x - courtInteraction.x, position.z - courtInteraction.z) <= courtInteraction.radius
}

// Entry acknowledgement only. No gameplay transport or simulation is started yet.
export type MatchEntryResult =
  { status: 'accepted'; matchId: string; seat: 1 | 2 } | { status: 'rejected'; reason: 'invalid-request' | 'out-of-range' | 'full' }
