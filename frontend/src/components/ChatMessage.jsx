/**
 * Renders AI markdown-style chat responses with proper formatting.
 * Handles: ## headers, ### sub-headers, **bold**, numbered lists, bullet lists, plain text.
 */

function renderInline(text) {
  // Split on **bold** markers and render bold spans
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function ChatMessage({ content }) {
  if (!content || typeof content !== 'string') return null

  const lines = content.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()

    // Empty line → spacer
    if (!line) {
      elements.push(<div key={i} className="chat-md-spacer" />)
      i++
      continue
    }

    // ## Section header
    if (line.startsWith('## ')) {
      elements.push(
        <div key={i} className="chat-md-section">
          <span className="chat-md-section-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          {renderInline(line.slice(3))}
        </div>
      )
      i++
      continue
    }

    // ### Sub-section header
    if (line.startsWith('### ')) {
      elements.push(
        <div key={i} className="chat-md-subsection">
          {renderInline(line.slice(4))}
        </div>
      )
      i++
      continue
    }

    // Numbered list — collect consecutive numbered items
    if (/^\d+\.\s/.test(line)) {
      const listItems = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const match = lines[i].trim().match(/^(\d+)\.\s+(.+)$/)
        if (match) {
          listItems.push({ num: match[1], text: match[2] })
        }
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} className="chat-md-ol">
          {listItems.map((item, idx) => (
            <li key={idx} className="chat-md-li-num">
              <span className="chat-md-num-badge">{item.num}</span>
              <span>{renderInline(item.text)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Bullet list — collect consecutive bullet items
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const listItems = []
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('• '))) {
        listItems.push(lines[i].trim().replace(/^[-•]\s+/, ''))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="chat-md-ul">
          {listItems.map((item, idx) => (
            <li key={idx} className="chat-md-li-bullet">
              <span className="chat-md-bullet-dot" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Regular paragraph text
    elements.push(
      <p key={i} className="chat-md-p">
        {renderInline(line)}
      </p>
    )
    i++
  }

  return <div className="chat-md-body">{elements}</div>
}
