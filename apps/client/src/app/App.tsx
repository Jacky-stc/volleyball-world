import { Component, Suspense, lazy, useCallback, useEffect, useState, type ErrorInfo, type ReactNode } from 'react'
import { KeyboardInput } from '../game/input/KeyboardInput'
import { SceneManager } from '../game/scenes/SceneManager'
import type { LocalSimulation } from '../game/simulation/LocalSimulation'

const Game = lazy(() => import('../game/Game'))

class WorldBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('World failed to load', error, info)
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function App() {
  const [input] = useState(() => new KeyboardInput())
  const [simulation, setSimulation] = useState<LocalSimulation | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const onReady = useCallback(() => setReady(true), [])
  const onError = useCallback(() => setError(true), [])
  useEffect(() => input.connect(), [input])
  useEffect(() => {
    let cancelled = false
    let runtime: LocalSimulation | undefined
    Promise.all([import('../game/physics/CharacterController'), import('../game/simulation/LocalSimulation')])
      .then(async ([physics, { LocalSimulation }]) => {
        await physics.initializePhysics()
        if (cancelled) return
        runtime = new LocalSimulation(new SceneManager().load('court'))
        setSimulation(runtime)
      })
      .catch((reason: unknown) => {
        console.error(reason)
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
      runtime?.dispose()
    }
  }, [])
  useEffect(() => {
    input.setEnabled(ready && !error)
    if (simulation) simulation.paused = !ready || error
  }, [simulation, input, ready, error])
  return (
    <main
      className="world"
      aria-label="排球場 3D 遊戲場景"
    >
      {simulation && (
        <WorldBoundary onError={onError}>
          <Suspense fallback={null}>
            <Game
              simulation={simulation}
              input={input}
              onReady={onReady}
            />
          </Suspense>
        </WorldBoundary>
      )}
      {!ready && !error && (
        <div
          className="loading-overlay"
          role="status"
          aria-label="正在載入場景"
        >
          <span className="loader" />
        </div>
      )}
      {error && (
        <div
          className="loading-overlay"
          role="alert"
        >
          <p>場景無法載入，請確認瀏覽器支援 WebGL。</p>
          <button onClick={() => window.location.reload()}>重新載入</button>
        </div>
      )}
    </main>
  )
}
