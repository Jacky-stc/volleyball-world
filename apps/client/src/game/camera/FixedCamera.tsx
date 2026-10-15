import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import { PerspectiveCamera } from 'three'

export function FixedCamera() {
  const { camera, size } = useThree()
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    // Elevated front view, with depth receding straight ahead as in the reference.
    const distance = Math.max(1, 0.85 / (size.width / size.height))
    camera.fov = 48
    camera.position.set(0, 19 * distance, -1 + 25 * distance)
    camera.lookAt(0, 0, -1)
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}
