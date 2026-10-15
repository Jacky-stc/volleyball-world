import { afterEach, expect, test, vi } from 'vitest'
import { KeyboardInput } from './KeyboardInput'

afterEach(() => vi.unstubAllGlobals())

test('E is explicit, ignores repeat and text editing, respects disabled input, and cleans up', () => {
  const events = new EventTarget()
  class Element extends EventTarget {
    tagName = 'INPUT'
    isContentEditable = false
  }
  vi.stubGlobal('HTMLElement', Element)
  vi.stubGlobal('window', events)
  vi.stubGlobal('document', new EventTarget())
  const input = new KeyboardInput()
  const disconnect = input.connect()
  const join = vi.fn()
  const stop = input.onCourtInteraction(join)
  const press = (extra = {}) => {
    const event = new Event('keydown', { cancelable: true })
    Object.assign(event, { code: 'KeyE', repeat: false, ...extra })
    events.dispatchEvent(event)
  }
  press()
  press({ repeat: true })
  press({ ctrlKey: true })
  // Model an event originating in the chat input.
  const editing = new Event('keydown')
  Object.defineProperty(editing, 'target', { value: new Element() })
  Object.assign(editing, { code: 'KeyE' })
  events.dispatchEvent(editing)
  input.setEnabled(false)
  press()
  expect(join).toHaveBeenCalledTimes(1)
  input.setEnabled(true)
  stop()
  press()
  expect(join).toHaveBeenCalledTimes(1)
  disconnect()
})
