import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ErrorInfo, type FormEvent, type ReactNode } from 'react'
import { KeyboardInput } from '../game/input/KeyboardInput'
import { SceneManager } from '../game/scenes/SceneManager'
import type { LocalSimulation } from '../game/simulation/LocalSimulation'
import { connect, limitDisplayName, type JoinedRoom } from '../network/connect'

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
  const [multiplayer, setMultiplayer] = useState(() => new URLSearchParams(window.location.search).get('multiplayer') === '1')
  const [input] = useState(() => new KeyboardInput())
  const [simulation, setSimulation] = useState<LocalSimulation | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [joinState, setJoinState] = useState<'idle' | 'connecting' | 'joined' | 'error'>('idle')
  const [joinError, setJoinError] = useState('')
  const [room, setRoom] = useState<JoinedRoom | null>(null)
  const connecting = useRef(false)
  const mounted = useRef(false)
  const currentRoom = useRef<JoinedRoom | null>(null)
  const onReady = useCallback(() => setReady(true), [])
  const onError = useCallback(() => setError(true), [])
  useEffect(() => input.connect(), [input])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      void currentRoom.current?.leave()
    }
  }, [])
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
    input.setEnabled(ready && !error && (!multiplayer || joinState === 'joined'))
    if (simulation) simulation.paused = !ready || error
  }, [simulation, input, ready, error, multiplayer, joinState])

  const joinWorld = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (connecting.current || currentRoom.current) return
    connecting.current = true
    const name = limitDisplayName(displayName.trim())
    setDisplayName(name)
    setJoinError('')
    setJoinState('connecting')
    void connect(undefined, name)
      .then((joined) => {
        if (!mounted.current) {
          void joined.leave()
          return
        }
        currentRoom.current = joined
        joined.onLeave(() => {
          if (!mounted.current || currentRoom.current !== joined) return
          currentRoom.current = null
          setRoom(null)
          setReady(false)
          setJoinError('Connection lost. Retry to rejoin.')
          setJoinState('error')
        })
        setRoom(joined)
        setJoinState('joined')
      })
      .catch((reason: unknown) => {
        console.error(reason)
        if (!mounted.current) return
        setJoinError('Could not connect to the world. Retry to join.')
        setJoinState('error')
      })
      .finally(() => {
        connecting.current = false
      })
  }

  const enterWorld = () => {
    setReady(false)
    setMultiplayer(true)
  }

  const backToOffline = () => {
    setJoinState('idle')
    setMultiplayer(false)
  }

  return (
    <main
      className="world"
      aria-label="排球場 3D 遊戲場景"
    >
      {simulation && (!multiplayer || room) && (
        <WorldBoundary onError={onError}>
          <Suspense fallback={null}>
            <Game
              simulation={simulation}
              input={input}
              onReady={onReady}
              room={room ?? undefined}
            />
          </Suspense>
        </WorldBoundary>
      )}
      {!multiplayer && ready && !error && (
        <button
          className="world-entry"
          onClick={enterWorld}
        >
          Join World
        </button>
      )}
      {multiplayer && joinState !== 'joined' && !error && (
        <div className="loading-overlay join-overlay">
          <form
            className="join-form"
            onSubmit={joinWorld}
          >
            <h1>Join World</h1>
            <label htmlFor="display-name">Display name</label>
            <input
              id="display-name"
              type="text"
              autoComplete="nickname"
              placeholder="Player"
              value={displayName}
              onChange={(event) => setDisplayName(limitDisplayName(event.target.value))}
              disabled={joinState === 'connecting'}
            />
            <button
              type="submit"
              disabled={joinState === 'connecting'}
            >
              {joinState === 'connecting' ? 'Connecting…' : joinState === 'error' ? 'Retry' : 'Join World'}
            </button>
            <button
              type="button"
              onClick={backToOffline}
              disabled={joinState === 'connecting'}
            >
              Back to Offline
            </button>
            {joinState === 'connecting' && <p role="status">Connecting to world…</p>}
            {joinState === 'error' && <p role="alert">{joinError}</p>}
          </form>
        </div>
      )}
      {!ready && !error && (!multiplayer || joinState === 'joined') && (
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
