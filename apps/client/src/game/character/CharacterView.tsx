import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Group } from 'three'
import type { LocalSimulation } from '../simulation/LocalSimulation'
import { CharacterVisual } from './CharacterVisual'

export function CharacterView({ simulation }: { simulation: LocalSimulation }) {
  const group = useRef<Group>(null)
  useFrame((_, delta) => {
    if (!group.current) return
    const { player, previous, alpha } = simulation
    group.current.position.set(
      previous.x + (player.position.x - previous.x) * alpha,
      previous.y + (player.position.y - previous.y) * alpha,
      previous.z + (player.position.z - previous.z) * alpha
    )
    const difference = Math.atan2(
      Math.sin(player.rotation - group.current.rotation.y),
      Math.cos(player.rotation - group.current.rotation.y)
    )
    group.current.rotation.y += difference * (1 - Math.exp(-16 * delta))
  })
  return (
    <group ref={group}>
      <CharacterVisual
        getAnimation={() => simulation.player.animation}
        isPaused={() => simulation.paused}
      />
    </group>
  )
}
