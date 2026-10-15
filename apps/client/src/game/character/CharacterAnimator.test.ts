import { readFile } from 'node:fs/promises'
import { Box3, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { expect, it } from 'vitest'
import { CharacterAnimator } from './CharacterAnimator'
import { createCharacterModel } from './createCharacterModel'

it('keeps the real GLB at human scale across idle, walk and run animations', async () => {
  const file = await readFile(new URL('../../../public/assets/characters/robot.glb', import.meta.url))
  const binary = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
  const gltf = await new GLTFLoader().parseAsync(binary, '')
  const root = createCharacterModel(gltf.scene, gltf.animations)
  const animator = new CharacterAnimator(root, gltf.animations)
  try {
    for (const animation of ['idle', 'walk', 'run'] as const) {
      animator.update(animation, 0.25)
      root.updateMatrixWorld(true)
      const bounds = new Box3().setFromObject(root)
      const height = bounds.getSize(new Vector3()).y
      expect(height).toBeGreaterThan(1.3)
      expect(height).toBeLessThan(2)
      expect(Math.abs(bounds.min.y)).toBeLessThan(0.15)
    }
  } finally {
    animator.dispose()
  }
})
