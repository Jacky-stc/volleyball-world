import type { PlayerAnimation } from '@volleyball/game-core'
import { useFrame, useLoader } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { CharacterAnimator } from './CharacterAnimator'
import { createCharacterModel } from './createCharacterModel'

export function CharacterVisual({ getAnimation, isPaused }: { getAnimation?: () => PlayerAnimation; isPaused?: () => boolean }) {
  const gltf = useLoader(GLTFLoader, '/assets/characters/robot.glb')
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
    animator.current?.update(getAnimation?.() ?? 'idle', isPaused?.() ? 0 : Math.min(delta, 0.1))
  })

  return (
    <>
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
    </>
  )
}
