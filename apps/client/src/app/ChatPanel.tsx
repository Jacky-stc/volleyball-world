import { useEffect, useRef, useState, type FormEvent } from 'react'
import { sendChat, type ChatEvent, type JoinedRoom } from '../network/connect'

const MAX_VISIBLE_MESSAGES = 50

export function ChatPanel({ room }: { room: JoinedRoom }) {
  const [messages, setMessages] = useState<ChatEvent[]>([])
  const [draft, setDraft] = useState('')
  const list = useRef<HTMLOListElement>(null)

  useEffect(
    () =>
      room.onMessage<ChatEvent>('chat', (message) => {
        setMessages((previous) => [...previous.slice(-(MAX_VISIBLE_MESSAGES - 1)), message])
      }),
    [room]
  )

  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight
  }, [messages])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (sendChat(room, draft)) setDraft('')
  }

  return (
    <section
      className="chat-panel"
      aria-label="Room chat"
    >
      <h2>Room chat</h2>
      <ol
        className="chat-messages"
        ref={list}
        aria-live="polite"
      >
        {messages.map((message, index) => (
          <li key={index}>
            <strong>{message.displayName}:</strong> {message.text}
          </li>
        ))}
      </ol>
      <form onSubmit={submit}>
        <input
          aria-label="Chat message"
          placeholder="Message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={200}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
        >
          Send
        </button>
      </form>
    </section>
  )
}
