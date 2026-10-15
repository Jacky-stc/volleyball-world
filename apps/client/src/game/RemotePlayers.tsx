import { useEffect, useState } from 'react'
import { connect } from '../network/connect'

type RemotePlayer = { sessionId: string; x: number; y: number; z: number; rotation: number }

export function RemotePlayers() {
  const [players, setPlayers] = useState<RemotePlayer[]>([])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('multiplayer') !== '1') return

    let active = true
    let room: Awaited<ReturnType<typeof connect>> | undefined
    let update: (() => void) | undefined
    const clear = () => setPlayers([])

    void connect()
      .then((joined) => {
        if (!active) {
          void joined.leave()
          return
        }
        room = joined
        update = () => {
          const players = joined.state?.players
          if (!players) return
          setPlayers(
            Array.from(players, ([sessionId, transform]) => ({
              sessionId,
              x: transform.x,
              y: transform.y,
              z: transform.z,
              rotation: transform.rotation,
            })).filter((player) => player.sessionId !== joined.sessionId)
          )
        }
        joined.onStateChange(update)
        joined.onLeave(clear)
        update()
      })
      .catch(console.error)

    return () => {
      active = false
      if (room) {
        if (update) room.onStateChange.remove(update)
        room.onLeave.remove(clear)
        void room.leave()
      }
    }
  }, [])

  return players.map(({ sessionId, x, y, z, rotation }) => (
    <group
      key={sessionId}
      position={[x, y, z]}
      rotation={[0, rotation, 0]}
    >
      <mesh
        position={[0, 0.9, 0]}
        castShadow
      >
        <boxGeometry args={[0.65, 1.8, 0.45]} />
        <meshStandardMaterial color="#55d6ea" />
      </mesh>
    </group>
  ))
}
