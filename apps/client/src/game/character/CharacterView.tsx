import { useFrame, useLoader } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Group } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { LocalSimulation } from '../simulation/LocalSimulation'
import { CharacterAnimator } from './CharacterAnimator'
import { createCharacterModel } from './createCharacterModel'

export function CharacterView({ simulation }: { simulation: LocalSimulation }) {
  const gltf = useLoader(GLTFLoader, '/assets/characters/robot.glb')
  const group = useRef<Group>(null)
  const animator = useRef<CharacterAnimator | null>(null)
  const model = useMemo(() => createCharacterModel(gltf.scene, gltf.animations), [gltf])
  useEffect(() => {
    animator.current = new CharacterAnimator(model, gltf.animations)
    return () => {
      animator.current?.dispose()
      animator.current = null
    }
  }, [model, gltf])
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
    animator.current?.update(player.animation, simulation.paused ? 0 : Math.min(delta, 0.1))
  })
  return (
    <group ref={group}>
      <primitive object={model} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.08, 0]}
      >
        <ringGeometry args={[0.48, 0.53, 48]} />
        <meshBasicMaterial
          color="#e7a348"
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
