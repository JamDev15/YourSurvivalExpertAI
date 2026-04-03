import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ChatMessage from '../components/ChatMessage.jsx'
import ChatPreview from '../components/ChatPreview.jsx'
import SiteLayout from '../components/SiteLayout.jsx'
import useSeo from '../hooks/useSeo.js'
import '../App.css'

const starterMessage =
  "Let's build your personalized survival plan. First, what situation are you preparing for — hurricane, power outage, wildfire, or something else?"

const emptyProfile = {
  preparingFor: '',
  concern: '',
  region: '',
}

const VALID_CONCERNS = /hurricane|tornado|wildfire|wild fire|earthquake|flood|power outage|blackout|grid failure|winter storm|snowstorm|blizzard|ice storm|heat wave|drought|tsunami|landslide|mudslide|volcano|nuclear|pandemic|disease|civil unrest|evacuation|shelter|water shortage|supply chain|fire|storm|outage|emergency|disaster/i
const VALID_PREPARING = /myself|self|just me|solo|family|household|kids|children|partner|spouse|wife|husband|relatives|loved ones|everyone|couple|parents|seniors|elderly|pet/i
const VALID_REGION = /alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|united states|usa|canada|australia|uk|mexico|new zealand|germany|france|spain|italy|japan|brazil|india|philippines|puerto rico|district of columbia|miami|houston|chicago|dallas|phoenix|seattle|denver|boston|atlanta|portland|angeles|south|north|east|west|coast|midwest/i

function sanitizeProfile(raw) {
  if (!raw || typeof raw !== 'object') return emptyProfile
  return {
    preparingFor: VALID_PREPARING.test(raw.preparingFor || '') ? raw.preparingFor : '',
    concern:      VALID_CONCERNS.test(raw.concern || '')      ? raw.concern      : '',
    region:       VALID_REGION.test(raw.region || '')         ? raw.region       : '',
  }
}

const starterPrompts = [
  'Power outage',
  'Hurricane preparation',
  'Water storage',
  'Wildfire',
  'General preparedness',
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

const WHO_CARDS = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Families Wanting Peace of Mind',
    desc: 'Parents who want to protect their loved ones but don\'t know where to start with emergency preparedness.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    title: 'First-Time Preppers',
    desc: 'People new to survival planning who need clear, beginner-friendly guidance without the overwhelming jargon.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    title: 'Anyone Facing Local Risks',
    desc: 'Whether it\'s hurricanes, earthquakes, blackouts, or economic uncertainty — get a plan that fits your reality.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Chat with the AI Expert',
    desc: 'Answer a few quick questions about your household, location, and top concerns.',
  },
  {
    step: '02',
    title: 'Get Your Custom Plan',
    desc: 'Our AI builds a personalized survival guide tailored to your exact situation.',
  },
  {
    step: '03',
    title: 'Receive Your PDF Guide',
    desc: 'Your full guide and checklist is delivered directly to your inbox — free.',
  },
]

const GEO_CARDS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    title: 'Your Local Emergency Checklist',
    desc: 'A locally tailored checklist to help your household prepare for the most common emergencies in your region.',
  },
  {
    icon: ( 
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="23" y1="11" x2="17" y2="11" />
        <line x1="20" y1="8" x2="20" y2="14" />
      </svg>
    ),
    title: 'Neighborhood Communication & Supply Plan',
    desc: 'Practical steps to coordinate with neighbors and establish plans for water, power, and communication during disruptions.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: 'Fast-Start Action Plan',
    desc: 'Simple prioritized actions you can complete in one weekend to quickly improve your household resilience.',
  },
]

export default function Home() {
  const [searchParams] = useSearchParams()
  const [selectedRegion, setSelectedRegion] = useState(geoRegions[0])

  // Persistent session ID — ties all chat messages and the guide to one MongoDB document
  const sessionId = useState(() => {
    try {
      let id = sessionStorage.getItem('yse_session_id')
      if (!id) {
        id = crypto.randomUUID()
        sessionStorage.setItem('yse_session_id', id)
      }
      return id
    } catch { return '' }
  })[0]

  // Restore chat from sessionStorage on mount
  const [isChatActive, setIsChatActive] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('yse_chatActive') || 'false') } catch { return false }
  })
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('yse_messages') || '[]') } catch { return [] }
  })
  const [profile, setProfile] = useState(() => {
    try { return sanitizeProfile(JSON.parse(sessionStorage.getItem('yse_profile') || 'null')) } catch { return emptyProfile }
  })
  const [readyForEmail, setReadyForEmail] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('yse_readyForEmail') || 'false') } catch { return false }
  })

  // confirmedProfile is only populated after the AI finishes analyzing and delivers the summary.
  // It drives the Expert's Notes panel — stays blank during Q&A.
  const [confirmedProfile, setConfirmedProfile] = useState(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('yse_readyForEmail') || 'false')
      if (!stored) return emptyProfile
      const p = sanitizeProfile(JSON.parse(sessionStorage.getItem('yse_profile') || 'null'))
      // Only restore if all 3 fields are present — reject partial profiles
      return (p.preparingFor && p.concern && p.region) ? p : emptyProfile
    } catch { return emptyProfile }
  })

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState('idle')
  const [emailValid, setEmailValid] = useState(false)
  const chatEndRef = useRef(null)
  const chatSectionRef = useRef(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // Persist chat state to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem('yse_chatActive', JSON.stringify(isChatActive)) } catch {}
  }, [isChatActive])
  useEffect(() => {
    try { sessionStorage.setItem('yse_messages', JSON.stringify(messages)) } catch {}
  }, [messages])
  useEffect(() => {
    try { sessionStorage.setItem('yse_profile', JSON.stringify(profile)) } catch {}
  }, [profile])
  useEffect(() => {
    try { sessionStorage.setItem('yse_readyForEmail', JSON.stringify(readyForEmail)) } catch {}
  }, [readyForEmail])

  // Expert's Notes uses confirmedProfile — only filled after AI analysis is complete
  const profileSummary = useMemo(() => {
    return [
      { label: 'Preparing for', value: confirmedProfile.preparingFor || 'Not shared yet' },
      { label: 'Primary concern', value: confirmedProfile.concern || 'Not shared yet' },
      { label: 'Region', value: confirmedProfile.region || 'Not shared yet' },
    ]
  }, [confirmedProfile])

  const completionCount = useMemo(() => {
    return Object.values(confirmedProfile).filter((value) => String(value).trim()).length
  }, [confirmedProfile])

  const completionPercent = Math.round((completionCount / 3) * 100)

  const validateEmail = (emailInput) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailInput)) return false
    const [localPart, domain] = emailInput.split('@')
    if (!localPart || localPart.length === 0 || localPart.length > 64) return false
    if (/^\.|\.$|\.\./.test(localPart)) return false
    if (!domain || domain.length < 3) return false
    if (!/^\w+(\.\w+)*\.\w{2,}$/.test(domain)) return false
    if (/^-|-$/.test(domain)) return false
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
    canonical: 'https://yoursurvivalexpert.ai/',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'yoursurvivalexpert.ai',
        url: 'https://yoursurvivalexpert.ai',
        description: 'Calm, practical emergency readiness guidance with personalized survival guides and checklists.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'yoursurvivalexpert.ai',
        url: 'https://yoursurvivalexpert.ai',
        description: 'AI survival expert and emergency checklist generator for households and individuals.',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://yoursurvivalexpert.ai/?startChat=1',
          },
          'query-input': 'required name=search_term_string',
        },
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
        '@type': 'HowTo',
        name: 'How to Get Your Personalized Emergency Survival Guide',
        description: 'Chat with an AI survival expert to receive a free, personalized PDF emergency preparedness guide tailored to your household and region.',
        totalTime: 'PT2M',
        supply: [
          { '@type': 'HowToSupply', name: 'Your location or region' },
          { '@type': 'HowToSupply', name: 'Your primary emergency concern (hurricane, wildfire, etc.)' },
          { '@type': 'HowToSupply', name: 'Number of people in your household' },
        ],
        step: HOW_IT_WORKS.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.title,
          text: s.desc,
          url: `https://yoursurvivalexpert.ai/#chat`,
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `Emergency Preparedness Guide for ${selectedRegion.name}`,
        description: seoDescription,
        author: { '@type': 'Organization', name: 'yoursurvivalexpert.ai' },
        publisher: {
          '@type': 'Organization',
          name: 'yoursurvivalexpert.ai',
          url: 'https://yoursurvivalexpert.ai',
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://yoursurvivalexpert.ai/' },
        about: selectedRegion.hazards.map((h) => ({ '@type': 'Thing', name: h })),
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
          {
            '@type': 'Question',
            name: 'Is the survival guide really free?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. The personalized PDF emergency guide is completely free. No account or payment required.',
            },
          },
          {
            '@type': 'Question',
            name: 'How long does it take to get my guide?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The chat takes about 2 minutes. Your personalized PDF guide is delivered to your inbox shortly after you provide your email.',
            },
          },
        ],
      },
    ],
  })

  useEffect(() => {
    if (!isChatActive || !chatEndRef.current) return
    const chatFeed = chatEndRef.current.closest('.chat-feed')
    if (!chatFeed) return
    setTimeout(() => {
      chatFeed.scrollTop = chatFeed.scrollHeight
    }, 0)
  }, [messages, isLoading, isChatActive])

  useEffect(() => {
    if (searchParams.get('startChat') !== '1') return

    setIsChatActive(true)
    setMessages((current) =>
      current.length === 0 ? [{ role: 'assistant', content: starterMessage }] : current
    )

    setTimeout(() => {
      chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
  }, [searchParams])

  const activateChat = () => {
    setIsChatActive(true)

    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: starterMessage }])
    }

    setTimeout(() => {
      chatSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
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

    // Add a blank streaming placeholder so the user sees the bubble appear immediately
    setMessages((current) => [...current, { role: 'assistant', content: '', _streaming: true }])

    try {
      const response = await fetch(`/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, profile, session_id: sessionId }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData?.error || errData?.detail || 'Unable to reach the survival expert.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const raw = decoder.decode(value, { stream: true })
        // SSE lines: "data: {...}\n\n"
        for (const line of raw.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'chunk') {
              accumulated += event.text
              setMessages((current) => {
                const prev = [...current]
                prev[prev.length - 1] = { role: 'assistant', content: accumulated, _streaming: true }
                return prev
              })
            } else if (event.type === 'done') {
              const sanitized = sanitizeProfile(event.profile || profile)
              setProfile(sanitized)
              if (event.readyForEmail) {
                setConfirmedProfile(sanitized)
              }
              setReadyForEmail(Boolean(event.readyForEmail))
              // Remove the _streaming flag from the final message
              setMessages((current) => {
                const prev = [...current]
                prev[prev.length - 1] = { role: 'assistant', content: accumulated }
                return prev
              })
            }
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setMessages((current) => {
        const prev = [...current]
        // Replace the streaming placeholder with an error message
        if (prev[prev.length - 1]?._streaming) {
          prev[prev.length - 1] = { role: 'assistant', content: 'Sorry, I hit a snag. Please try again in a moment.' }
        } else {
          prev.push({ role: 'assistant', content: 'Sorry, I hit a snag. Please try again in a moment.' })
        }
        return prev
      })
    } finally {
      setIsLoading(false)
    }
  }

  const submitEmail = async (event) => {
    event.preventDefault()
    if (!email || !emailValid || emailStatus === 'sending') {
      setError('Please enter a valid email address.')
      return
    }

    setError('')
    setEmailStatus('sending')
    try {
      const response = await fetch(`/api/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, profile, session_id: sessionId }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to deliver the guide.')
      }

      setEmailStatus('sent')
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'Your personalized guide is on the way. Check your inbox shortly, and stay safe.',
        },
      ])
    } catch (err) {
      setEmailStatus('idle')
      setError(err.message || 'Email delivery failed. Please try again.')
    }
  }

  const resetChat = () => {
    setMessages([])
    setProfile(emptyProfile)
    setConfirmedProfile(emptyProfile)
    setIsChatActive(false)
    setReadyForEmail(false)
    setEmail('')
    setEmailStatus('idle')
    setEmailValid(false)
    setError('')
    try {
      sessionStorage.removeItem('yse_messages')
      sessionStorage.removeItem('yse_profile')
      sessionStorage.removeItem('yse_chatActive')
      sessionStorage.removeItem('yse_readyForEmail')
      sessionStorage.removeItem('yse_session_id')
    } catch {}
  }

  const [faqOpen, setFaqOpen] = useState([false, false, false])
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
  ]

  const handleFaqToggle = (idx) => {
    setFaqOpen((open) => open.map((v, i) => (i === idx ? !v : v)))
  }

  return (
    <SiteLayout ctaLabel="Start" onCta={activateChat}>
      <main>

        {/* ── HERO ── */}
        <section className="hero-section">
          <div className="hero-overlay" />
          <div className="hero-inner">

            {/* Left column */}
            <div className="hero-left">
              <span className="hero-badge">AI-Powered Preparedness</span>
              <h1 className="hero-headline">
                Your Personalized<br />
                <span className="hero-gradient-text">Survival Guide</span>
              </h1>
              <p className="hero-sub">
                Answer a few questions and our AI will create a custom survival guide
                tailored to your situation, location, and experience level.
              </p>
              <button
                className="hero-cta-btn"
                onClick={() => {
                  activateChat()
                  chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                Get Your Free Guide
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <p className="hero-footnote">Free &nbsp;·&nbsp; No account required &nbsp;·&nbsp; Delivered to your inbox</p>
            </div>

            {/* Right column — chatbot preview */}
            <div className="hero-right">
              <ChatPreview
                messages={[
                  { role: 'assistant', text: 'Hi! What situation are you preparing for — hurricane, wildfire, power outage, or something else?' },
                  { role: 'user', text: "We're in Florida and worried about hurricane season." },
                  { role: 'assistant', text: "Got it. I'll build a personalized hurricane plan for your household. How many people are you preparing for?" },
                ]}
                onActivate={activateChat}
              />
            </div>

          </div>
        </section>

        {/* ── TRUST BAR ── */}
        <div className="trust-bar">
          <div className="trust-item">
            <span className="trust-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <span>2-minute setup</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <span>Personalized to your region</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
            <span>PDF delivered to inbox</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </span>
            <span>Completely free</span>
          </div>
        </div>

        {/* ── WHO IS THIS FOR ── */}
        <section className="who-section" data-animate>
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">Who Is This For?</h2>
              <p className="section-sub">
                Our AI survival expert helps anyone who wants practical, personalized emergency
                preparedness advice — no experience required.
              </p>
            </div>
            <div className="who-grid">
              {WHO_CARDS.map((card) => (
                <div key={card.title} className="who-card">
                  <div className="who-card-icon">{card.icon}</div>
                  <h3 className="who-card-title">{card.title}</h3>
                  <p className="who-card-desc">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="how-section" data-animate>
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">How It Works</h2>
              <p className="section-sub">Three simple steps to your personalized survival plan.</p>
            </div>
            <div className="how-grid">
              {HOW_IT_WORKS.map((step, idx) => (
                <div key={step.step} className="how-card">
                  <div className="how-step-number">{step.step}</div>
                  {idx < HOW_IT_WORKS.length - 1 && <div className="how-connector" aria-hidden="true" />}
                  <h3 className="how-card-title">{step.title}</h3>
                  <p className="how-card-desc">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CHAT SECTION ── */}
        <section id="chat" ref={chatSectionRef} className="chat-section" data-animate>

          {!isChatActive && (
            <div className="chat-pre-active">
              <h2 className="section-title">Talk with Your Survival Expert</h2>
              <p className="section-sub">
                Answer a few quick questions and get a personalized survival guide delivered to your inbox — free.
              </p>

              <div className="prompt-row">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    className="prompt-pill"
                    onClick={() => handlePromptClick(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="start-card">
                <div className="start-card-icon-wrap">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                  </svg>
                </div>
                <h3 className="start-card-title">Ready to Get Started?</h3>
                <p className="start-card-desc">Takes about 2 minutes. No account required.</p>
                <button className="start-chat-btn" type="button" onClick={activateChat}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Start Conversation
                </button>
              </div>
            </div>
          )}

          {isChatActive && (
            <div className={`chat-layout${isExpanded ? ' chat-layout-expanded' : ''}`}>
              <div className="chat-card">

                <div className="chat-card-header">
                  <div className="chat-region-selector">
                    <label htmlFor="geo" className="geo-label">Region</label>
                    <select
                      id="geo"
                      className="geo-select"
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
                  <div className="chat-status">
                    <span className="status-dot" />
                    <div className="chat-status-info">
                      <span className="chat-status-site">yoursurvivalexpert.ai</span>
                      
                    </div>
                  </div>
                  <div className="chat-header-actions">
                    <button
                      className="chat-expand-btn"
                      type="button"
                      title={isExpanded ? 'Collapse chat' : 'Expand chat'}
                      onClick={() => setIsExpanded((v) => !v)}
                    >
                      {isExpanded ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="4 14 10 14 10 20" />
                          <polyline points="20 10 14 10 14 4" />
                          <line x1="10" y1="14" x2="3" y2="21" />
                          <line x1="21" y1="3" x2="14" y2="10" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 3 21 3 21 9" />
                          <polyline points="9 21 3 21 3 15" />
                          <line x1="21" y1="3" x2="14" y2="10" />
                          <line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                      )}
                    </button>
                    <button
                      className="chat-restart-btn"
                      type="button"
                      title="Start a new chat"
                      onClick={resetChat}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
                      </svg>
                      New chat
                    </button>
                  </div>
                </div>

                <div className="chat-feed" aria-live="polite">
                  <div className="openai-chat-feed">
                    {messages.map((message, index) => {
                      const isAssistant = message.role === 'assistant'
                      const text = Array.isArray(message.content)
                        ? message.content.join('\n')
                        : String(message.content)
                      return (
                        <div
                          key={`${message.role}-${index}`}
                          className={`openai-chat-bubble ${isAssistant ? 'assistant' : 'user'}`}
                        >
                          <div className="bubble-avatar">
                            {isAssistant ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            )}
                          </div>
                          <div className="bubble-content">
                            {isAssistant ? <ChatMessage content={text} /> : text}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {isLoading && (
                    <div className="chat-bubble assistant typing-indicator">
                      <span /><span /><span />
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {!readyForEmail && (
                  <form className="openai-chat-input" onSubmit={sendMessage}>
                    <input
                      type="text"
                      placeholder="Type your response..."
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                    />
                    <button className="chat-send-btn" type="submit" disabled={isLoading} aria-label="Send">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </form>
                )}

                {error && <p className="form-error">{error}</p>}

                {readyForEmail && (
                  <form className="email-capture" onSubmit={submitEmail}>
                    <div>
                      <label htmlFor="email" className="email-label">Send my guide to:</label>
                      <div className="email-input-wrapper">
                        <input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={handleEmailChange}
                          disabled={emailStatus === 'sending' || emailStatus === 'sent'}
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
                        <p className="email-hint">Please enter a valid email address to receive your PDF guide.</p>
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
                      <div className="form-sent-row">
                        <p className="form-success">Guide sent! Check your inbox in a few minutes.</p>
                        <button type="button" className="reset-chat-btn" onClick={resetChat}>
                          Start a new plan
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </div>

              <aside className="profile-card">

                {/* Header */}
                <div className="profile-card-header">
                  <div className="profile-card-title-row">
                    <span className="profile-card-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </span>
                    <h3 className="profile-card-title">Expert's Notes</h3>
                  </div>
                  <span className={`progress-badge ${completionPercent === 100 ? 'complete' : ''}`}>
                    {completionPercent === 100 ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Ready
                      </>
                    ) : `${completionPercent}%`}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${completionPercent}%` }} />
                </div>
                <p className="progress-hint">
                  {completionPercent === 100
                    ? 'Profile complete — your guide is ready to generate.'
                    : `${3 - Math.round(completionPercent / 100 * 3)} detail${3 - Math.round(completionPercent / 100 * 3) !== 1 ? 's' : ''} remaining`}
                </p>

                {/* Profile fields */}
                <ul className="profile-list">
                  {[
                    {
                      label: 'Preparing for',
                      value: profile.preparingFor,
                      icon: (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      ),
                    },
                    {
                      label: 'Primary concern',
                      value: profile.concern,
                      icon: (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      ),
                    },
                    {
                      label: 'Region',
                      value: profile.region,
                      icon: (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      ),
                    },
                  ].map((item) => (
                    <li key={item.label} className="profile-list-item">
                      <div className="profile-item-left">
                        <span className="profile-item-icon">{item.icon}</span>
                        <span className="profile-item-label">{item.label}</span>
                      </div>
                      {item.value ? (
                        <span className="profile-item-value filled">{item.value}</span>
                      ) : (
                        <span className="profile-item-value empty">Not yet shared</span>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Footer note */}
                <div className="profile-note">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Session only — details are never stored
                </div>

              </aside>
            </div>
          )}
        </section>

        {/* ── GEO SECTION ── */}
        <section className="geo-section" data-animate>
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">Local Readiness for {selectedRegion.name}</h2>
              <p className="section-sub">
                Your preparedness plan adapts to real risks in your area — including{' '}
                {selectedRegion.hazards.join(', ')} across {selectedRegion.name}.
              </p>
            </div>
            <div className="geo-grid">
              {GEO_CARDS.map((card) => (
                <div key={card.title} className="geo-card">
                  <div className="geo-card-icon">{card.icon}</div>
                  <h3 className="geo-card-title">{card.title}</h3>
                  <p className="geo-card-desc">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CITY GUIDES ── */}
        <section className="who-section" data-animate>
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">City-Specific Emergency Guides</h2>
              <p className="section-sub">
                Every region faces different threats. Browse our local preparedness guides for major U.S. cities.
              </p>
            </div>
            <div className="city-guides-grid">
              {[
                { slug: 'houston-tx', city: 'Houston, TX', hazard: 'Hurricane & Flood' },
                { slug: 'miami-fl', city: 'Miami, FL', hazard: 'Hurricane & Storm Surge' },
                { slug: 'los-angeles-ca', city: 'Los Angeles, CA', hazard: 'Earthquake & Wildfire' },
                { slug: 'chicago-il', city: 'Chicago, IL', hazard: 'Winter Storms & Extreme Cold' },
                { slug: 'denver-co', city: 'Denver, CO', hazard: 'Wildfire & Winter Storms' },
              ].map((g) => (
                <Link
                  key={g.slug}
                  to={`/guide/${g.slug}`}
                  className="who-card city-guide-card"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="who-card-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <h3 className="who-card-title" style={{ fontSize: '1rem' }}>{g.city}</h3>
                  <p className="who-card-desc" style={{ fontSize: '0.85rem' }}>{g.hazard}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="faq-section" data-animate>
          <div className="faq-container">
            <div className="section-header">
              <h2 className="section-title">Frequently Asked Questions</h2>
            </div>
            <div className="faq-list">
              {faqData.map((item, idx) => (
                <div key={item.question} className={`faq-item ${faqOpen[idx] ? 'open' : ''}`}>
                  <button
                    className="faq-question"
                    onClick={() => handleFaqToggle(idx)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFaqToggle(idx) } }}
                    aria-expanded={faqOpen[idx]}
                  >
                    <span>{item.question}</span>
                    <svg
                      className={`faq-icon ${faqOpen[idx] ? 'rotate' : ''}`}
                      width="20"
                      height="20"
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
                    <div className="faq-answer">{item.answer}</div>
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
