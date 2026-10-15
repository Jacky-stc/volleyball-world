import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, type Group } from 'three'
import { sendMovement, type JoinedRoom } from '../network/connect'
import { CharacterVisual } from './character/CharacterVisual'
import type { KeyboardInput } from './input/KeyboardInput'
import { LocalPrediction } from './localPrediction'

type RemotePlayer = { sessionId: string; x: number; y: number; z: number; rotation: number; displayName: string }

function faceVisualMovement(visual: Group, previous: { x: number; z: number }, delta: number) {
  const dx = visual.position.x - previous.x
  const dz = visual.position.z - previous.z
  previous.x = visual.position.x
  previous.z = visual.position.z
  if (delta <= 0 || Math.hypot(dx, dz) / delta <= 0.2) return
  const facing = Math.atan2(dx, dz)
  const difference = Math.atan2(Math.sin(facing - visual.rotation.y), Math.cos(facing - visual.rotation.y))
  visual.rotation.y += difference * (1 - Math.exp(-16 * delta))
}

function PlayerName({ name }: { name: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 96
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context unavailable')
    context.font = 'bold 48px sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.lineWidth = 6
    context.strokeStyle = '#17212b'
    context.fillStyle = '#ffffff'
    context.strokeText(name, 256, 48, 490)
    context.fillText(name, 256, 48, 490)
    return new CanvasTexture(canvas)
  }, [name])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <sprite
      position={[0, 2.05, 0]}
      scale={[2.4, 0.45, 1]}
    >
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
      />
    </sprite>
  )
}

function LocalPlayerVisual({ prediction, input, name }: { prediction: LocalPrediction; input: KeyboardInput; name: string }) {
  const group = useRef<Group>(null)
  const previous = useRef({ x: prediction.position.x, z: prediction.position.z })

  useFrame((_, delta) => {
    prediction.advance(input.sample(), delta)
    const visual = group.current
    if (!visual) return
    visual.position.set(prediction.position.x, prediction.position.y, prediction.position.z)
    faceVisualMovement(visual, previous.current, delta)
  })

  return (
    <group ref={group}>
      <CharacterVisual animateFromMovement />
      <PlayerName name={name} />
    </group>
  )
}

function RemotePlayerVisual({ target }: { target: RemotePlayer }) {
  const group = useRef<Group>(null)
  const previous = useRef({ x: target.x, z: target.z })
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
    faceVisualMovement(visual, previous.current, delta)
  })

  return (
    <group
      ref={group}
      position={spawn.current.position}
      rotation={spawn.current.rotation}
    >
      <CharacterVisual animateFromMovement />
      <PlayerName name={target.displayName} />
    </group>
  )
}

export function RemotePlayers({ input, room }: { input: KeyboardInput; room: JoinedRoom }) {
  const [players, setPlayers] = useState<RemotePlayer[]>([])
  const [localSessionId, setLocalSessionId] = useState<string>()
  const prediction = useRef(new LocalPrediction())

  useEffect(() => {
    const clear = () => {
      stopMovement()
      setPlayers([])
    }
    const localPrediction = new LocalPrediction()
    prediction.current = localPrediction
    setLocalSessionId(room.sessionId)
    const stopMovement = sendMovement(room, () => localPrediction.drainInputs())
    const update = () => {
      const players = room.state?.players
      if (!players) return
      const local = players.get(room.sessionId)
      if (local) localPrediction.reconcile(local)
      setPlayers(
        Array.from(players, ([sessionId, transform]) => ({
          sessionId,
          x: transform.x,
          y: transform.y,
          z: transform.z,
          rotation: transform.rotation,
          displayName: transform.displayName,
        }))
      )
    }
    room.onStateChange(update)
    room.onLeave(clear)
    update()

    return () => {
      stopMovement()
      room.onStateChange.remove(update)
      room.onLeave.remove(clear)
    }
  }, [room])

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
        name={player.displayName}
      />
    )
  )
}
