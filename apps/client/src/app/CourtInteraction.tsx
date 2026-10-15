import type { MatchEntryResult } from '@volleyball/game-core/court'
import { useEffect, useState } from 'react'
import type { KeyboardInput } from '../game/input/KeyboardInput'
import { canRequestMatch, requestMatch, type JoinedRoom } from '../network/connect'

export function CourtInteraction({ room, input }: { room: JoinedRoom; input: KeyboardInput }) {
  const [near, setNear] = useState(false)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<MatchEntryResult>()

  useEffect(() => {
    let waiting = false
    let accepted = false
    const update = () => setNear(canRequestMatch(room))
    const stopMessages = room.onMessage<MatchEntryResult>('match:entry', (entry) => {
      waiting = false
      accepted = entry.status === 'accepted'
      setPending(false)
      setResult(entry)
    })
    const stopInput = input.onCourtInteraction(() => {
      if (waiting || accepted) return
      if (requestMatch(room)) {
        waiting = true
        setPending(true)
        setResult(undefined)
      }
    })
    room.onStateChange(update)
    update()
    return () => {
      stopInput()
      stopMessages()
      room.onStateChange.remove(update)
    }
  }, [room, input])

  const message =
    result?.status === 'accepted'
      ? `Match entry accepted — seat ${result.seat}/2. Gameplay coming soon.`
      : pending
        ? 'Requesting match entry…'
        : near
          ? result?.status === 'rejected' && result.reason === 'full'
            ? 'Match full. Press E to retry.'
            : 'Press E to Join'
          : null

  return message ? (
    <div
      className="court-interaction"
      role="status"
    >
      {message}
    </div>
  ) : null
}
