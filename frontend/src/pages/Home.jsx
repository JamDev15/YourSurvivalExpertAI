import { useEffect, useMemo, useRef, useState } from 'react'
import SiteLayout from '../components/SiteLayout.jsx'
import useSeo from '../hooks/useSeo.js'
import '../App.css'

const starterMessage =
   "Let’s build your personalized survival plan. First, what situation are you preparing for — hurricane, power outage, wildfire, or something else?"

const emptyProfile = {
  preparingFor: '',
  concern: '',
  region: '',
}

const starterPrompts = [
  'Power outage',
  'Hurricane preparation',
  'Water storage',
  'Wildfire',
  'General preparedness'
]

const geoRegions = [
  {
    id: 'national',
    label: 'Nationwide (U.S.)',
    name: 'United States',
    city: 'Nationwide',
    state: 'US',
    hazards: ['storms', 'power outages', 'supply gaps'],
  },
  {
    id: 'los-angeles',
    label: 'Los Angeles, CA',
    name: 'Los Angeles',
    city: 'Los Angeles',
    state: 'CA',
    hazards: ['earthquakes', 'wildfires', 'heat waves'],
  },
  {
    id: 'miami',
    label: 'Miami, FL',
    name: 'Miami',
    city: 'Miami',
    state: 'FL',
    hazards: ['hurricanes', 'flooding', 'power loss'],
  },
  {
    id: 'houston',
    label: 'Houston, TX',
    name: 'Houston',
    city: 'Houston',
    state: 'TX',
    hazards: ['storms', 'flooding', 'heat'],
  },
  {
    id: 'chicago',
    label: 'Chicago, IL',
    name: 'Chicago',
    city: 'Chicago',
    state: 'IL',
    hazards: ['winter storms', 'power outages', 'supply delays'],
  },
]

export default function Home() {
    // ...existing code...
  const [selectedRegion, setSelectedRegion] = useState(geoRegions[0])
  const [isChatActive, setIsChatActive] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(emptyProfile)
  const [readyForEmail, setReadyForEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState('idle')
  const [emailValid, setEmailValid] = useState(false)
  const chatEndRef = useRef(null)
  const chatSectionRef = useRef(null)

  const profileSummary = useMemo(() => {
    return [
      { label: 'Preparing for', value: profile.preparingFor || 'Not shared yet' },
      { label: 'Primary concern', value: profile.concern || 'Not shared yet' },
      { label: 'Region', value: profile.region || 'Not shared yet' },
    ]
  }, [profile])

  const completionCount = useMemo(() => {
    return Object.values(profile).filter((value) => String(value).trim()).length
  }, [profile])

  const completionPercent = Math.round((completionCount / 3) * 100)

  const validateEmail = (emailInput) => {
    // RFC 5322 simplified email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    // More strict validation
    if (!emailRegex.test(emailInput)) return false
    
    // Additional checks
    const [localPart, domain] = emailInput.split('@')
    
    // Check local part validity
    if (!localPart || localPart.length === 0 || localPart.length > 64) return false
    if (/^\.|\.$|\.\./.test(localPart)) return false // No leading/trailing/double dots
    
    // Check domain validity
    if (!domain || domain.length < 3) return false
    if (!/^\w+(\.\w+)*\.\w{2,}$/.test(domain)) return false // Must have at least one dot and valid TLD
    if (/^-|-$/.test(domain)) return false // No leading/trailing hyphens
    
    return true
  }

  const handleEmailChange = (event) => {
    const value = event.target.value
    setEmail(value)
    setEmailValid(validateEmail(value))
  }

  const seoTitle = `Survival Guide for ${selectedRegion.name} | yoursurvivalexpert.ai`
  const seoDescription =
    `Get a personalized emergency checklist for ${selectedRegion.name}. ` +
    'Chat with a calm AI survival expert and receive a tailored PDF guide.'

  useSeo({
    title: seoTitle,
    description: seoDescription,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'yoursurvivalexpert.ai',
        url: 'https://yoursurvivalexpert.ai',
        description:
          'Calm, practical emergency readiness guidance with personalized survival guides and checklists.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'yoursurvivalexpert.ai',
        url: 'https://yoursurvivalexpert.ai',
        description:
          'AI survival expert and emergency checklist generator for households and individuals.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: `yoursurvivalexpert.ai - ${selectedRegion.name}`,
        areaServed: `${selectedRegion.city}, ${selectedRegion.state}`,
        description: `Personalized emergency readiness guidance for ${selectedRegion.name}.`,
        url: 'https://yoursurvivalexpert.ai',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What do I receive after chatting?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: `You receive a personalized PDF survival guide and emergency checklist tailored to ${selectedRegion.name} and your household.`,
            },
          },
          {
            '@type': 'Question',
            name: 'Why do you need my email address?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'We use your email only to deliver the personalized guide and checklist you requested.',
            },
          },
          {
            '@type': 'Question',
            name: `Is this advice specific to ${selectedRegion.name}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Yes. The guide accounts for common risks in ${selectedRegion.name} and the situations you care about most.`,
            },
          },
        ],
      },
    ],
  })

  useEffect(() => {
    // Only scroll within the chat feed, not the entire page
    if (!isChatActive || !chatEndRef.current) return
    const chatFeed = chatEndRef.current.closest('.chat-feed')
    if (!chatFeed) return
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      chatFeed.scrollTop = chatFeed.scrollHeight
    }, 0)
  }, [messages, isLoading, isChatActive])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shouldStartChat = params.get('startChat') === '1'
    if (!shouldStartChat) return

    setIsChatActive(true)
    setMessages((current) =>
      current.length === 0 ? [{ role: 'assistant', content: starterMessage }] : current
    )

    setTimeout(() => {
      chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 0)
  }, [])

const activateChat = () => {
  setIsChatActive(true)

  if (messages.length === 0) {
    setMessages([{ role: 'assistant', content: starterMessage }])
  }

  setTimeout(() => {
    chatSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }, 100)
}

  const handlePromptClick = (prompt) => {
    if (!isChatActive) {
      activateChat()
    }
    setInput(prompt)
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    setError('')
    const outgoing = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, outgoing]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, profile }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to reach the survival expert.')
      }

      setMessages((current) => [...current, { role: 'assistant', content: data.reply }])
      setProfile(data.profile || profile)
      setReadyForEmail(Boolean(data.readyForEmail))
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'Sorry, I hit a snag. Please try again in a moment.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const submitEmail = async (event) => {
    event.preventDefault()
    
    // Double-check email validity before sending
    if (!email || !emailValid || emailStatus === 'sending') {
      setError('Please enter a valid email address.')
      return
    }

    setError('')
    setEmailStatus('sending')
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, profile }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to deliver the guide.')
      }

      setEmailStatus('sent');
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'Your personalized guide is on the way. Check your inbox shortly, and stay safe.',
        },
      ])
    } catch (err) {
      setEmailStatus('idle')
      setError(err.message || 'Email delivery failed. Please try again.')
    }
  }

  // FAQ toggle state
  const [faqOpen, setFaqOpen] = useState([false, false, false]);
  const faqData = [
    {
      question: 'What do I receive after chatting?',
      answer: `A personalized PDF survival guide and emergency checklist tailored to ${selectedRegion.name} and your household.`,
    },
    {
      question: 'Why do you need my email address?',
      answer: 'We use your email only to deliver the guide you requested.',
    },
    {
      question: `Is the guidance local to ${selectedRegion.name}?`,
      answer: `Yes. We tailor the plan to the regional risks common in ${selectedRegion.name}.`,
    },
  ];

  const handleFaqToggle = idx => {
    setFaqOpen(open => open.map((v, i) => i === idx ? !v : v));
  };
  return (
    <SiteLayout ctaLabel="Start" onCta={activateChat}>
      <main>
       <main>
  <section
    className="hero"
    style={{
      backgroundImage: "url(/sunrays-bg.jpg)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      position: "relative",
      padding: "40px 20px",
    }}
  >

    {/* DARK OVERLAY */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(0,0,0,0.85))",
      }}
    />

    <div
      className="hero-copy"
      style={{
        position: "relative",
        zIndex: 2,
        maxWidth: "850px",
        color: "#fff",
      }}
    >

      {/* BADGE */}
      <div
        style={{
          display: "inline-block",
          padding: "8px 18px",
          borderRadius: "20px",
          background: "rgba(0,255,157,0.1)",
          border: "1px solid rgba(0,255,157,0.35)",
          color: "#00ff9d",
          fontSize: "0.9rem",
          marginBottom: "20px",
        }}
      >
        AI-Powered Preparedness
      </div>

      {/* HEADLINE */}
      <h1
        style={{
          fontSize: "3rem",
          fontWeight: "700",
          marginBottom: "16px",
          lineHeight: "1.2",
        }}
      >
        Your Personalized <br />
        <span
          style={{
            background:
              "linear-gradient(90deg,#6DBE45,#E3B341)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Survival Guide
        </span>
      </h1>

      {/* SUBTEXT */}
      <p
        style={{
          fontSize: "1.2rem",
          color: "#d1d5db",
          maxWidth: "640px",
          margin: "0 auto 30px",
        }}
      >
        Answer a few questions and our AI will create a custom survival guide
        tailored to your situation, location, and experience level.
      </p>

      {/* CTA BUTTON */}
      <button
        style={{
          fontSize: "1.15rem",
          padding: "16px 36px",
          borderRadius: "10px",
          color: "#fff",
          background: "#2E7D5B",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow =
            "0 10px 22px rgba(0,0,0,0.45)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow =
            "0 6px 18px rgba(0,0,0,0.4)";
        }}
        onClick={() => {
          activateChat();
          chatSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }}
      >
        Get Your Free Guide →
      </button>

      {/* SMALL TEXT */}
      <p
        style={{
          marginTop: "14px",
          fontSize: "0.9rem",
          color: "#9ca3af",
        }}
      >
        Free • No account required • Delivered to your inbox
      </p>

    </div>
  </section>
</main>


        {/* WHO IS THIS FOR SECTION */}
        <section
          className="who-section"
          style={{
            background: 'rgb(0, 0, 0)',
            padding: '64px 0 40px',
            color: '#fff',
            borderBottom: '1px solid #000000',
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
            <h2 style={{ fontSize: '2.3rem', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>
              Who Is This For?
            </h2>
            <p style={{ color: '#bfc9d4', fontSize: '1.15rem', marginBottom: '38px', maxWidth: '700px' }}>
              Our AI survival expert helps anyone who wants practical, personalized emergency preparedness advice — no experience required.
            </p>
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {/* Card 1 */}
              <div style={{
                background: '#151b2c',
                borderRadius: '16px',
                border: '1px solid #23283a',
                padding: '36px 28px 28px',
                minWidth: '290px',
                maxWidth: '340px',
                flex: '1 1 290px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                marginBottom: '18px',
              }}>
                <div style={{ marginBottom: '18px' }}>
                  {/* Family Icon */}
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#19c37d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>Families Wanting Peace of Mind</h3>
                <p style={{ color: '#bfc9d4', fontSize: '1rem', lineHeight: 1.6 }}>
                  Parents who want to protect their loved ones but don't know where to start with emergency preparedness.
                </p>
              </div>
              {/* Card 2 */}
              <div style={{
                background: '#151b2c',
                borderRadius: '16px',
                border: '1px solid #23283a',
                padding: '36px 28px 28px',
                minWidth: '290px',
                maxWidth: '340px',
                flex: '1 1 290px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                marginBottom: '18px',
              }}>
                <div style={{ marginBottom: '18px' }}>
                  {/* Home Icon */}
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#19c37d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7" />
                    <path d="M9 22V12h6v10" />
                    <path d="M21 22H3" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>First-Time Preppers</h3>
                <p style={{ color: '#bfc9d4', fontSize: '1rem', lineHeight: 1.6 }}>
                  People new to survival planning who need clear, beginner-friendly guidance without the overwhelming jargon.
                </p>
              </div>
              {/* Card 3 */}
              <div style={{
                background: '#151b2c',
                borderRadius: '16px',
                border: '1px solid #23283a',
                padding: '36px 28px 28px',
                minWidth: '290px',
                maxWidth: '340px',
                flex: '1 1 290px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                marginBottom: '18px',
              }}>
                <div style={{ marginBottom: '18px' }}>
                  {/* Alert Icon */}
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#19c37d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <path d="M21 18a2 2 0 0 0 1-1.73V7.73A2 2 0 0 0 21 6.27l-8-4.62a2 2 0 0 0-2 0l-8 4.62A2 2 0 0 0 1 7.73v8.54A2 2 0 0 0 2 18l8 4.62a2 2 0 0 0 2 0l8-4.62z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>Anyone Concerned About Emergencies</h3>
                <p style={{ color: '#bfc9d4', fontSize: '1rem', lineHeight: 1.6 }}>
                  Whether it's hurricanes, earthquakes, blackouts, or economic uncertainty — get a plan that fits your reality.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="divider" aria-hidden="true" />

        <section id="chat" ref={chatSectionRef} className="chat-section" data-animate>
        <div className="chat-header hero-chat">

            {!isChatActive && (
              <>
              <h2 className="hero-title">
                  Talk with Your Survival Expert
                </h2>

                <p className="hero-subtitle">
                  Answer a few quick questions and get a personalized survival guide delivered to your inbox — free.
                </p>
              </>
            )}

       {!isChatActive && (
  <div className="start-card">

    <div
      className="flex items-center justify-center mx-auto mb-6"
      style={{
        width: '90px',
        height: '90px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #19c37d 60%, #10b981 100%)',
        boxShadow: '0 4px 16px rgba(25,195,125,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fff"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block' }}
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
    </div>

    <h3>Ready to Get Started?</h3>

    <p className="start-desc">
      Takes about 2 minutes. No account required.
    </p>

    <button
      type="button"
      onClick={() => activateChat()}
      style={{
        background: '#19c37d',
        color: '#23283a',
        border: 'none',
        borderRadius: '25px',
        fontSize: '1.15rem',
        fontWeight: 600,
        padding: '14px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#10b981';
        e.currentTarget.style.color = '#1C352D';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = '#19c37d';
        e.currentTarget.style.color = '#23283a';
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#23283a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginRight: '8px' }}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </svg>
      Start Conversation
    </button>
  </div>
)}     </div>
          {isChatActive && (
          <div className="chat-layout">
            <div className="chat-card">
              <div className="geo-selector">
                <label htmlFor="geo">Your region</label>
                <select
                  id="geo"
                  value={selectedRegion.id}
                  onChange={(event) => {
                    const nextRegion = geoRegions.find((item) => item.id === event.target.value)
                    setSelectedRegion(nextRegion || geoRegions[0])
                  }}
                >
                  {geoRegions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="chat-meta">
                <div className="status">
                  <span className="status-dot" />
                  Survival expert is ready
                </div>
                <span className="status-note">Session stays private</span>
              </div>
              <div className="chat-feed" aria-live="polite">
                {!isChatActive ? (
                  <div className="chat-empty">
                    <p>
                      The AI expert is standing by. Share what you want to prepare for, and we will
                      build a tailored plan together.
                    </p>
                  </div>
                ) : (
                  <div className="openai-chat-feed">
                    {messages.map((message, index) => {
                      if (Array.isArray(message.content)) {
                        return (
                          <div
                            key={`${message.role}-${index}`}
                            className={`openai-chat-bubble ${message.role === 'user' ? 'user' : 'assistant'}`}
                          >
                            <ol style={{ margin: 0, paddingLeft: '1.5em', listStyle: 'none' }}>
                              {message.content.map((item, i) => (
                                <li key={i} style={{ position: 'relative', paddingBottom: '16px', marginBottom: '16px' }}>
                                  <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{i + 1}.</span>
                                  <span>{String(item).replace(/^\d+\.\s*/, '')}</span>
                                  <hr style={{ border: 'none', borderBottom: '1px solid #e0e0e0', margin: '12px 0 0 0' }} />
                                </li>
                              ))}
                            </ol>
                          </div>
                        );
                      } else {
                        return (
                          <div
                            key={`${message.role}-${index}`}
                            className={`openai-chat-bubble ${message.role === 'user' ? 'user' : 'assistant'}`}
                          >
                            {message.content}
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
                {isLoading && isChatActive && (
                  <div className="chat-bubble assistant">Thinking through your situation...</div>
                )}
                <div ref={chatEndRef} />
              </div>

              {isChatActive && !readyForEmail && (
                <form className="openai-chat-input" onSubmit={sendMessage}>
                  <input
                    type="text"
                    placeholder="Type your response..."
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    style={{ borderRadius: '24px', padding: '12px 18px', fontSize: '1.1rem', border: '1px solid #e0e0e0', marginRight: '8px', width: '85%' }}
                  />
                  <button className="primary" type="submit" disabled={isLoading} style={{ borderRadius: '24px', padding: '12px 28px', fontSize: '1.1rem' }}>
                    Send
                  </button>
                </form>
              )}
              {error && <p className="form-error">{error}</p>}

              {readyForEmail && (
                <form className="email-capture" onSubmit={submitEmail}>
                  <div>
                    <label htmlFor="email">Email</label>
                    <div className="email-input-wrapper">
                      <input
                        id="email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={handleEmailChange}
                        disabled={emailStatus === 'sent'}
                        required
                        className={email.length > 0 ? (emailValid ? 'valid' : 'invalid') : ''}
                      />
                      {email.length > 0 && (
                        <span className={`email-indicator ${emailValid ? 'valid' : 'invalid'}`}>
                          {emailValid ? '✓' : '✗'}
                        </span>
                      )}
                    </div>
                    {email.length > 0 && !emailValid && (
                      <p className="email-hint">
                        Please enter a valid email address to receive your PDF guide.
                      </p>
                    )}
                    {email.length > 0 && emailValid && (
                      <p className="email-hint valid">Email format looks good</p>
                    )}
                  </div>
                  <button
                    className="primary"
                    type="submit"
                    disabled={!emailValid || emailStatus === 'sending' || emailStatus === 'sent'}
                  >
                    {emailStatus === 'sending' ? 'Sending...' : 'Send my guide'}
                  </button>
                  {emailStatus === 'sent' && (
                    <p className="form-success">Guide sent. Check your inbox in a few minutes.</p>
                  )}
                </form>
              )}
            </div>

            <aside className="profile-card">
              <div className="profile-meta">
                <h3>What the expert has learned</h3>
                <span className="progress-label">{completionPercent}% complete</span>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width: `${completionPercent}%` }} />
              </div>
              <ul>
                {profileSummary.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
              <p className="profile-note">
                Your details stay in this session until your guide is generated.
              </p>
            </aside>
          </div>
)}
        </section>

       <section className="geo-section">
          <div className="geo-container">

            <div className="geo-header">
              <h2>Local Readiness for {selectedRegion.name}</h2>

              <p>
                Your preparedness plan adapts to real risks in your area — including storms,
                outages, and supply disruptions across {selectedRegion.name}.
                We focus on practical steps for {selectedRegion.hazards.join(", ")}.
              </p>
            </div>

            <div className="geo-grid">

              <div className="geo-card">
                <h3>Your Local Emergency Checklist</h3>
                <p>
                  A locally tailored checklist to help your household prepare for the
                  most common emergencies in your region.
                </p>
              </div>

              <div className="geo-card">
                <h3>Neighborhood Communication & Supply Plan</h3>
                <p>
                  Practical steps to coordinate with neighbors and establish plans
                  for water, power, and communication during disruptions.
                </p>
              </div>

              <div className="geo-card">
                <h3>Fast-Start Action Plan</h3>
                <p>
                  Simple prioritized actions you can complete in one weekend to
                  quickly improve your household resilience.
                </p>
              </div>

            </div>
          </div>
        </section>

        <section className="faq-section" data-animate>
              <div className="faq-container">

                <h2 className="faq-title">Frequently Asked Questions</h2>

                <div className="faq-list">
                  {faqData.map((item, idx) => (
                    <div key={item.question} className={`faq-item ${faqOpen[idx] ? "open" : ""}`}>

                      <button
                        className="faq-question"
                        onClick={() => handleFaqToggle(idx)}
                      >
                        <span>{item.question}</span>

                        <svg
                          className={`faq-icon ${faqOpen[idx] ? "rotate" : ""}`}
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#19c37d"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {faqOpen[idx] && (
                        <div className="faq-answer">
                          {item.answer}
                        </div>
                      )}

                    </div>
                  ))}
                </div>

              </div>
            </section>
      </main>
    </SiteLayout>
  )
}
