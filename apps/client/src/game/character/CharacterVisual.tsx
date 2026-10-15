import type { PlayerAnimation } from '@volleyball/game-core'
import { useFrame, useLoader } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { CharacterAnimator } from './CharacterAnimator'
import { createCharacterModel } from './createCharacterModel'

export function CharacterVisual({
  animateFromMovement = false,
  getAnimation,
  isPaused,
}: {
  animateFromMovement?: boolean
  getAnimation?: () => PlayerAnimation
  isPaused?: () => boolean
}) {
  const gltf = useLoader(GLTFLoader, '/assets/characters/robot.glb')
  const animator = useRef<CharacterAnimator | null>(null)
  const model = useMemo(() => createCharacterModel(gltf.scene, gltf.animations), [gltf])
  const movement = useRef({
    previous: new Vector3(),
    current: new Vector3(),
    initialized: false,
    movingFor: 0,
    stillFor: 0,
    animation: 'idle' as PlayerAnimation,
  })

  useEffect(() => {
    animator.current = new CharacterAnimator(model, gltf.animations)
    return () => {
      animator.current?.dispose()
      animator.current = null
    }
  }, [model, gltf])

  useFrame((_, delta) => {
    let animation = getAnimation?.() ?? 'idle'
    if (animateFromMovement && model.parent) {
      const motion = movement.current
      model.parent.getWorldPosition(motion.current)
      if (motion.initialized && delta > 0) {
        const speed = Math.hypot(motion.current.x - motion.previous.x, motion.current.z - motion.previous.z) / delta
        if (speed > 0.2) {
          motion.movingFor += Math.min(delta, 0.05)
          motion.stillFor = 0
          if (motion.movingFor >= 0.08) motion.animation = 'walk'
        } else {
          motion.stillFor += Math.min(delta, 0.05)
          motion.movingFor = 0
          if (motion.stillFor >= 0.12) motion.animation = 'idle'
        }
      }
      motion.previous.copy(motion.current)
      motion.initialized = true
      animation = motion.animation
    }
    animator.current?.update(animation, isPaused?.() ? 0 : Math.min(delta, 0.1))
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
