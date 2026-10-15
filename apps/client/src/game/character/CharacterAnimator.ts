import { AnimationMixer, type AnimationClip, type AnimationAction, type Object3D } from 'three'
import type { PlayerAnimation } from '@volleyball/game-core'

const clipNames = { idle: 'Idle', walk: 'Walking', run: 'Running' } as const
export class CharacterAnimator {
  private mixer: AnimationMixer
  private actions: Record<PlayerAnimation, AnimationAction>
  private current: PlayerAnimation = 'idle'
  constructor(
    private root: Object3D,
    clips: AnimationClip[]
  ) {
    this.mixer = new AnimationMixer(root)
    this.actions = Object.fromEntries(
      Object.entries(clipNames).map(([state, name]) => {
        const clip = clips.find((entry) => entry.name === name)
        if (!clip) throw new Error(`Character animation missing: ${name}`)
        return [state, this.mixer.clipAction(clip)]
      })
    ) as Record<PlayerAnimation, AnimationAction>
    this.actions.idle.play()
  }
  update(animation: PlayerAnimation, delta: number) {
    if (this.current !== animation) {
      this.actions[this.current].fadeOut(0.2)
      this.actions[animation].reset().fadeIn(0.2).play()
      this.current = animation
    }
    this.mixer.update(delta)
  }
  dispose() {
    this.mixer.stopAllAction()
    this.mixer.uncacheRoot(this.root)
  }
}
