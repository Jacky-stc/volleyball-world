import { useLoader } from '@react-three/fiber'
import { useMemo } from 'react'
import { Mesh } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { courtScene } from './SceneManager'

export function PrototypeScene() {
  const gltf = useLoader(GLTFLoader, courtScene.model)
  const model = useMemo(() => {
    const root = gltf.scene.clone(true)
    root.traverse((object) => {
      if (object instanceof Mesh) {
        object.receiveShadow = true
        object.castShadow = true
      }
    })
    return root
  }, [gltf])
  return (
    <>
      <color
        attach="background"
        args={['#126f7e']}
      />
      <hemisphereLight args={['#ffffff', '#557680', 1.7]} />
      <directionalLight
        position={[-8, 16, 7]}
        intensity={2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-normalBias={0.04}
      />
      <primitive object={model} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.32, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color="#126f7e"
          roughness={0.65}
        />
      </mesh>
    </>
  )
}
