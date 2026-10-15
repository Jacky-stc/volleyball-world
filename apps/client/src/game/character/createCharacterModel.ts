import { AnimationMixer, Box3, Mesh, Vector3, type AnimationClip, type Group } from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { PLAYER_HEIGHT } from '../physics/CharacterController'

export function createCharacterModel(scene: Group, animations: AnimationClip[]) {
  const root = clone(scene)
  // The imported rest pose uses a different armature scale. Measure the actual
  // idle pose so normalization does not shrink the animated model.
  const pose = new AnimationMixer(root)
  const idle = animations.find((clip) => clip.name === 'Idle')
  if (!idle) throw new Error('Character animation missing: Idle')
  pose.clipAction(idle).play()
  pose.update(0)
  root.updateMatrixWorld(true)
  const bounds = new Box3().setFromObject(root)
  const scale = PLAYER_HEIGHT / bounds.getSize(new Vector3()).y
  pose.stopAllAction()
  pose.uncacheRoot(root)
  root.scale.setScalar(scale)
  root.position.y = -bounds.min.y * scale
  root.traverse((object) => {
    if (object instanceof Mesh) {
      object.castShadow = true
      object.receiveShadow = true
    }
  })
  return root
}
