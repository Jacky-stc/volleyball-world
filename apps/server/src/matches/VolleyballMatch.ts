import type { MatchEntryResult } from '@volleyball/game-core/court'
import { randomUUID } from 'node:crypto'

// One court's isolated match membership. ConnectionRoom is only the entry adapter;
// this session owns no social transforms, chat, or movement simulation.
// A separate Colyseus gameplay transport can own this session in Phase 3.
export class VolleyballMatch {
  private id: string | undefined
  private seats = new Map<string, 1 | 2>()

  join(sessionId: string): MatchEntryResult {
    const existing = this.seats.get(sessionId)
    if (existing) return { status: 'accepted', matchId: this.id!, seat: existing }
    if (this.seats.size === 2) return { status: 'rejected', reason: 'full' }
    this.id ??= randomUUID()
    const seat = Array.from(this.seats.values()).includes(1) ? 2 : 1
    this.seats.set(sessionId, seat)
    return { status: 'accepted', matchId: this.id, seat }
  }

  leave(sessionId: string) {
    this.seats.delete(sessionId)
    if (this.seats.size === 0) this.id = undefined
  }
}
