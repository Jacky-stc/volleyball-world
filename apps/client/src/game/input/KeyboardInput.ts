import type { PlayerInput } from '@volleyball/game-core'

const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight'])

export class KeyboardInput {
  private keys = new Set<string>()
  private touch = new Set<string>()
  private running = false
  private enabled = true
  private down = (event: KeyboardEvent) => {
    if (!this.enabled || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.target instanceof HTMLElement && (event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)))
      return
    if (movementKeys.has(event.code)) {
      event.preventDefault()
      this.keys.add(event.code)
    }
  }
  private up = (event: KeyboardEvent) => {
    this.keys.delete(event.code)
  }
  clear = () => {
    this.keys.clear()
    this.touch.clear()
  }
  private visibility = () => {
    if (document.hidden) this.clear()
  }

  connect() {
    window.addEventListener('keydown', this.down)
    window.addEventListener('keyup', this.up)
    window.addEventListener('blur', this.clear)
    document.addEventListener('visibilitychange', this.visibility)
    return () => {
      window.removeEventListener('keydown', this.down)
      window.removeEventListener('keyup', this.up)
      window.removeEventListener('blur', this.clear)
      document.removeEventListener('visibilitychange', this.visibility)
      this.clear()
    }
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled
    this.clear()
  }
  setTouch(key: string, pressed: boolean) {
    if (pressed) this.touch.add(key)
    else this.touch.delete(key)
  }
  setRunning(running: boolean) {
    this.running = running
  }
  sample(): PlayerInput {
    if (!this.enabled) return { horizontal: 0, vertical: 0, run: false }
    const has = (...keys: string[]) => keys.some((key) => this.keys.has(key) || this.touch.has(key))
    return {
      horizontal: Number(has('KeyD', 'ArrowRight')) - Number(has('KeyA', 'ArrowLeft')),
      vertical: Number(has('KeyW', 'ArrowUp')) - Number(has('KeyS', 'ArrowDown')),
      run: this.running || has('ShiftLeft', 'ShiftRight'),
    }
  }
}
