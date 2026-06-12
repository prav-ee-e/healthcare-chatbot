import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'

// ── Constants ─────────────────────────────────────────────────────────────────
// Use Vite proxy in dev (/api → :8000), or direct URL if proxy not available
const API_BASE = import.meta.env.VITE_API_URL || '/api'

const QUICK_PROMPTS = [
  { icon: '🤒', text: 'I have a fever and headache. What should I do?' },
  { icon: '💊', text: 'What are common side effects of ibuprofen?' },
  { icon: '🧠', text: 'Tips for managing anxiety and stress' },
  { icon: '🩺', text: 'How often should I get a health checkup?' },
  { icon: '💤', text: 'How much sleep do adults need?', },
  { icon: '🥗', text: 'What foods help boost the immune system?' },
]

const TOPICS = [
  { id: 'symptoms', label: 'Symptoms', icon: '🔍' },
  { id: 'medications', label: 'Medications', icon: '💊' },
  { id: 'mental', label: 'Mental Health', icon: '🧠' },
  { id: 'nutrition', label: 'Nutrition', icon: '🥗' },
  { id: 'fitness', label: 'Fitness', icon: '🏃' },
  { id: 'preventive', label: 'Preventive', icon: '🛡️' },
]

const DISCLAIMER = `MediAssist provides general health information only. 
It is not a substitute for professional medical advice, diagnosis, or treatment. 
Always consult a qualified healthcare provider for medical concerns.`

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="message assistant">
      <div className="avatar assistant-avatar">M</div>
      <div className="bubble typing-bubble">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`message ${msg.role}`} style={{ animationDelay: '0ms' }}>
      {!isUser && <div className="avatar assistant-avatar">M</div>}
      <div className={`bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          </div>
        )}
        <span className="timestamp">{formatTime(msg.timestamp)}</span>
      </div>
      {isUser && <div className="avatar user-avatar">You</div>}
    </div>
  )
}

function Sidebar({ activeChat, chats, onNewChat, onSelectChat, onDeleteChat }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">✚</span>
          <span className="logo-text">MediAssist</span>
        </div>
        <p className="logo-tagline">Your AI Health Companion</p>
      </div>

      <button className="new-chat-btn" onClick={() => onNewChat()}>
        <span>＋</span> New Conversation
      </button>

      <div className="sidebar-section-label">Topics</div>
      <div className="topic-grid">
        {TOPICS.map(t => (
          <button
            key={t.id}
            className="topic-chip"
            onClick={() => onNewChat(t.label)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {chats.length > 0 && (
        <>
          <div className="sidebar-section-label">History</div>
          <ul className="chat-list">
            {chats.map(chat => (
              <li
                key={chat.id}
                className={`chat-item ${chat.id === activeChat ? 'active' : ''}`}
                onClick={() => onSelectChat(chat.id)}
              >
                <span className="chat-item-icon">💬</span>
                <span className="chat-item-title">{chat.title}</span>
                <button
                  className="delete-btn"
                  onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id) }}
                  title="Delete"
                >×</button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="sidebar-footer">
        <div className="disclaimer-box">
          <span className="disclaimer-icon">⚕️</span>
          <p>{DISCLAIMER}</p>
        </div>
        <div className="emergency-note">
          <strong>Emergency?</strong> Call <strong>112</strong> or your local emergency number immediately.
        </div>
      </div>
    </aside>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [chats, setChats] = useState([])          // { id, title, messages[] }
  const [activeChatId, setActiveChatId] = useState(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const activeChat = chats.find(c => c.id === activeChatId)
  const messages = activeChat?.messages || []

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 140) + 'px'
    }
  }, [input])

  // ── Chat management ──────────────────────────────────────────────────────────
  const createChat = useCallback((topicHint = '') => {
    const id = Date.now().toString()
    const title = topicHint || 'New Conversation'
    const newChat = { id, title, messages: [] }
    setChats(prev => [newChat, ...prev])
    setActiveChatId(id)
    setError(null)
    if (topicHint) {
      // Pre-seed with topic prompt
      setTimeout(() => sendMessage(`Tell me about ${topicHint}`, id, []), 100)
    }
    return id
  }, [])

  const deleteChat = useCallback((id) => {
    setChats(prev => prev.filter(c => c.id !== id))
    setActiveChatId(prev => prev === id ? null : prev)
  }, [])

  // ── Send Message ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text, chatId, existingMessages) => {
    const msgText = (text || input).trim()
    if (!msgText || isLoading) return

    setInput('')
    setError(null)

    const targetId = chatId || activeChatId || createChat()
    const userMsg = { role: 'user', content: msgText, timestamp: new Date() }

    // Optimistically update UI
    let currentMessages
    setChats(prev => prev.map(c => {
      if (c.id !== targetId) return c
      currentMessages = [...(existingMessages ?? c.messages), userMsg]
      const title = c.title === 'New Conversation' && c.messages.length === 0
        ? msgText.slice(0, 40) + (msgText.length > 40 ? '…' : '')
        : c.title
      return { ...c, title, messages: currentMessages }
    }))

    setIsLoading(true)
    setStreamingContent('')

    const apiMessages = (currentMessages || [...(existingMessages ?? messages), userMsg])
      .map(m => ({ role: m.role, content: m.content }))

    try {
      // ── Try streaming first ──────────────────────────────────────────────────
      let full = ''
      let streamFailed = false

      try {
        const res = await fetch(`${API_BASE}/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages, stream: true }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail || `Server error ${res.status} — is the backend running on port 8000?`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const lines = decoder.decode(value, { stream: true }).split('\n')
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') break
            try {
              const parsed = JSON.parse(payload)
              if (parsed.error) throw new Error(parsed.error)
              if (parsed.chunk) {
                full += parsed.chunk
                setStreamingContent(full)
              }
            } catch { /* skip malformed chunk */ }
          }
        }
      } catch (streamErr) {
        // ── Fallback: non-streaming /chat ────────────────────────────────────
        streamFailed = true
        console.warn('Streaming failed, falling back to /chat:', streamErr.message)

        const res = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(
            err.detail ||
            `Cannot reach backend. Make sure:\n1. uvicorn is running on port 8000\n2. ANTHROPIC_API_KEY is set in backend/.env`
          )
        }

        const data = await res.json()
        full = data.reply || ''
      }

      if (!full) throw new Error('Empty response from AI. Check your GEMINI_API_KEY in backend/.env')

      // ── Commit final assistant message ───────────────────────────────────────
      const assistantMsg = { role: 'assistant', content: full, timestamp: new Date() }
      setChats(prev => prev.map(c =>
        c.id === targetId
          ? { ...c, messages: [...c.messages, assistantMsg] }
          : c
      ))
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
      setStreamingContent('')
    }
  }, [input, activeChatId, isLoading, messages, createChat])

  // ── Keyboard handler ─────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const showWelcome = !activeChatId || messages.length === 0

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Sidebar
        activeChat={activeChatId}
        chats={chats}
        onNewChat={createChat}
        onSelectChat={(id) => { setActiveChatId(id); setError(null) }}
        onDeleteChat={deleteChat}
      />

      <main className="chat-panel">
        {/* Top bar */}
        <header className="chat-header">
          <button className="toggle-sidebar" onClick={() => setSidebarOpen(p => !p)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <div className="header-info">
            <h1 className="header-title">
              {activeChat?.title || 'MediAssist'}
            </h1>
            <span className="header-status">
              <span className="status-dot" /> AI Health Assistant · Always available
            </span>
          </div>
          {activeChatId && (
            <button
              className="clear-btn"
              onClick={() => setChats(prev => prev.map(c =>
                c.id === activeChatId ? { ...c, messages: [] } : c
              ))}
            >
              Clear chat
            </button>
          )}
        </header>

        {/* Messages */}
        <div className="messages-container">
          {showWelcome ? (
            <div className="welcome-screen">
              <div className="welcome-icon">✚</div>
              <h2 className="welcome-title">How can I help you today?</h2>
              <p className="welcome-sub">
                Ask me anything about health, symptoms, medications, wellness, and more.
              </p>
              <div className="quick-prompts">
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    className="quick-prompt-btn"
                    onClick={() => {
                      const id = activeChatId || createChat()
                      sendMessage(p.text, id, [])
                    }}
                  >
                    <span className="qp-icon">{p.icon}</span>
                    <span>{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => <Message key={i} msg={msg} />)}
              {isLoading && streamingContent ? (
                <div className="message assistant">
                  <div className="avatar assistant-avatar">M</div>
                  <div className="bubble assistant-bubble">
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                    </div>
                    <span className="cursor-blink" />
                  </div>
                </div>
              ) : isLoading ? (
                <TypingIndicator />
              ) : null}
            </>
          )}
          {error && (
            <div className="error-toast">
              <span>⚠️</span>
              <span>{error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="input-area">
          <div className="input-box">
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about symptoms, medications, wellness…"
              rows={1}
              disabled={isLoading}
            />
            <button
              className={`send-btn ${(!input.trim() || isLoading) ? 'disabled' : ''}`}
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              title="Send message"
            >
              {isLoading ? <span className="spinner" /> : '↑'}
            </button>
          </div>
          <p className="input-hint">
            Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line ·
            Not medical advice — consult a doctor for diagnoses
          </p>
        </div>
      </main>
    </div>
  )
}
