import { useState, useRef, useEffect } from 'react'
import './App.css'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

interface ChatResponse {
  session_id: string
  output: string
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const generateSessionId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  const startNewChat = () => {
    setMessages([])
    setSessionId(generateSessionId())
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
    setIsLoading(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Create new session if none exists
    const currentSessionId = sessionId || generateSessionId()
    if (!sessionId) {
      setSessionId(currentSessionId)
    }

    // Create abort controller for this request
    const controller = new AbortController()
    setAbortController(controller)

    try {
      const response = await fetch('http://107.218.5.220:5051/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          input: userMessage.content,
          session_id: currentSessionId
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ChatResponse = await response.json()
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.output,
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was cancelled')
      } else {
        console.error('Error sending message:', error)
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
      setAbortController(null)
    }
  }

  const cancelRequest = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">
          <h1>AI Chat</h1>
          <button 
            className="new-chat-btn"
            onClick={startNewChat}
            disabled={isLoading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Chat
          </button>
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <div className="welcome-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h2>Welcome to AI Chat</h2>
              <p>Start a conversation by typing a message below</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`message ${message.isUser ? 'user' : 'ai'}`}>
                <div className="message-avatar">
                  {message.isUser ? (
                    <div className="user-avatar">U</div>
                  ) : (
                    <div className="ai-avatar">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="message-content">
                  <div className="message-text">
                    {message.content.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="message ai">
              <div className="message-avatar">
                <div className="ai-avatar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              disabled={isLoading}
              rows={1}
              className="message-input"
            />
            <div className="input-actions">
              {isLoading ? (
                <button 
                  className="cancel-btn"
                  onClick={cancelRequest}
                  title="Cancel request"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M15 9l-6 6M9 9l6 6"/>
                  </svg>
                </button>
              ) : (
                <button 
                  className="send-btn"
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  title="Send message"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
