// Reusable animated chat preview widget used in hero sections

export default function ChatPreview({ messages, onActivate }) {
  return (
    <div className="hero-chat-preview">

      {/* Header */}
      <div className="hero-chat-header">
        <div className="hero-chat-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#19c37d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          </svg>
        </div>
        <div>
          <p className="hero-chat-name">Survival Expert AI</p>
          <p className="hero-chat-status">
            <span className="hero-chat-dot" />
            Online now
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="hero-chat-body">
        {messages.map((msg, i) => (
          <div key={i} className={`hero-msg ${msg.role}`}>{msg.text}</div>
        ))}
        <div className="hero-msg-typing">
          <span /><span /><span />
        </div>
      </div>

      {/* Input bar */}
      <div className="hero-chat-input-bar">
        <span className="hero-chat-placeholder">Type your response...</span>
        <button className="hero-chat-send" aria-label="Send" onClick={onActivate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

    </div>
  )
}
