import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { FixedCamera } from './camera/FixedCamera'
import { CharacterView } from './character/CharacterView'
import type { KeyboardInput } from './input/KeyboardInput'
import { PrototypeScene } from './scenes/PrototypeScene'
import type { LocalSimulation } from './simulation/LocalSimulation'

interface Props {
  simulation: LocalSimulation
  input: KeyboardInput
  onReady: () => void
}
function World({ simulation, input, onReady }: Props) {
  useEffect(() => {
    onReady()
  }, [onReady])
  useFrame((_, delta) => {
    simulation.advance(delta, input.sample())
  }, -1)
  return (
    <>
      <FixedCamera />
      <PrototypeScene />
      <CharacterView simulation={simulation} />
    </>
  )
}
export default function Game(props: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 14, 17], fov: 48, near: 0.1, far: 180 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
      fallback={<div className="webgl-fallback">此瀏覽器無法啟用 WebGL，請使用支援 3D 繪圖的瀏覽器。</div>}
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  )
}
