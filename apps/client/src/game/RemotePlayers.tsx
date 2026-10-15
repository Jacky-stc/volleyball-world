import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { connect, sendMovement } from '../network/connect'
import { CharacterVisual } from './character/CharacterVisual'
import type { KeyboardInput } from './input/KeyboardInput'
import { LocalPrediction } from './localPrediction'

type RemotePlayer = { sessionId: string; x: number; y: number; z: number; rotation: number }

function LocalPlayerVisual({ prediction, input }: { prediction: LocalPrediction; input: KeyboardInput }) {
  const group = useRef<Group>(null)

  useFrame((_, delta) => {
    prediction.advance(input.sample(), delta)
    const visual = group.current
    if (!visual) return
    visual.position.set(prediction.position.x, prediction.position.y, prediction.position.z)
    visual.rotation.y = prediction.position.rotation
  })

  return (
    <group ref={group}>
      <CharacterVisual animateFromMovement />
    </group>
  )
}

function RemotePlayerVisual({ target }: { target: RemotePlayer }) {
  const group = useRef<Group>(null)
  // Stable spawn props: subsequent snapshots must not reset the visual transform.
  const spawn = useRef<{ position: [number, number, number]; rotation: [number, number, number] }>({
    position: [target.x, target.y, target.z],
    rotation: [0, target.rotation, 0],
  })

  useFrame((_, delta) => {
    const visual = group.current
    if (!visual) return
    // Frame-rate-independent easing; only Three.js presentation state is changed.
    const alpha = 1 - Math.exp(-12 * delta)
    visual.position.x += (target.x - visual.position.x) * alpha
    visual.position.y += (target.y - visual.position.y) * alpha
    visual.position.z += (target.z - visual.position.z) * alpha
    const angle = target.rotation - visual.rotation.y
    visual.rotation.y += Math.atan2(Math.sin(angle), Math.cos(angle)) * alpha
  })

  return (
    <group
      ref={group}
      position={spawn.current.position}
      rotation={spawn.current.rotation}
    >
      <CharacterVisual animateFromMovement />
    </group>
  )
}

export function RemotePlayers({ input }: { input: KeyboardInput }) {
  const [players, setPlayers] = useState<RemotePlayer[]>([])
  const [localSessionId, setLocalSessionId] = useState<string>()
  const prediction = useRef(new LocalPrediction())

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('multiplayer') !== '1') return

    let active = true
    let room: Awaited<ReturnType<typeof connect>> | undefined
    let update: (() => void) | undefined
    let stopMovement: (() => void) | undefined
    const clear = () => {
      stopMovement?.()
      setPlayers([])
    }

    void connect()
      .then((joined) => {
        if (!active) {
          void joined.leave()
          return
        }
        room = joined
        const localPrediction = new LocalPrediction()
        prediction.current = localPrediction
        setLocalSessionId(joined.sessionId)
        stopMovement = sendMovement(
          joined,
          () => input.sample(),
          (input) => localPrediction.sequenceInput(input)
        )
        update = () => {
          const players = joined.state?.players
          if (!players) return
          const local = players.get(joined.sessionId)
          if (local) localPrediction.reconcile(local)
          setPlayers(
            Array.from(players, ([sessionId, transform]) => ({
              sessionId,
              x: transform.x,
              y: transform.y,
              z: transform.z,
              rotation: transform.rotation,
            }))
          )
        }
        joined.onStateChange(update)
        joined.onLeave(clear)
        update()
      })
      .catch(console.error)

    return () => {
      active = false
      stopMovement?.()
      if (room) {
        if (update) room.onStateChange.remove(update)
        room.onLeave.remove(clear)
        void room.leave()
      }
    }
  }, [input])

  return players.map((player) =>
    player.sessionId !== localSessionId ? (
      <RemotePlayerVisual
        key={player.sessionId}
        target={player}
      />
    ) : (
      <LocalPlayerVisual
        key={player.sessionId}
        prediction={prediction.current}
        input={input}
      />
    )
  )
}
