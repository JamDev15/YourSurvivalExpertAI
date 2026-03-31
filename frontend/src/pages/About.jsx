import SiteLayout from '../components/SiteLayout.jsx'
import useSeo from '../hooks/useSeo.js'

const VALUES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: 'Calm Over Fear',
    desc: 'Preparedness should reduce anxiety, not amplify it. Every word we write is designed to be steady, clear, and actionable.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
    title: 'Local & Relevant',
    desc: 'A hurricane plan for Miami looks nothing like a wildfire plan for LA. We tailor every guide to your real regional risks.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Built for Everyone',
    desc: 'Whether you\'re a first-time prepper or a seasoned planner, our AI meets you where you are — no jargon, no overwhelm.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: 'Private by Design',
    desc: 'Your conversation stays in your session. We never sell your data or require an account to get your guide.',
  },
]

const STEPS = [
  {
    step: '01',
    title: 'Chat with the AI Expert',
    desc: 'Answer a few quick questions about your household, location, and top concerns in a calm, guided conversation.',
  },
  {
    step: '02',
    title: 'Get Your Custom Plan',
    desc: 'Our AI builds a personalized survival guide tailored to your exact situation, region, and household size.',
  },
  {
    step: '03',
    title: 'Receive Your PDF Guide',
    desc: 'Your full guide and checklist is delivered directly to your inbox — completely free, no account required.',
  },
]

export default function About() {
  useSeo({
    title: 'About | yoursurvivalexpert.ai',
    description:
      'Learn how yoursurvivalexpert.ai helps families build practical emergency plans with free AI-generated survival guides tailored to your region.',
    canonical: 'https://yoursurvivalexpert.ai/about',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About yoursurvivalexpert.ai',
      url: 'https://yoursurvivalexpert.ai/about',
      description: 'yoursurvivalexpert.ai is a free AI-powered emergency preparedness platform that builds personalized survival guides for households across the United States.',
      publisher: {
        '@type': 'Organization',
        name: 'yoursurvivalexpert.ai',
        url: 'https://yoursurvivalexpert.ai',
      },
    },
  })

  return (
    <SiteLayout>
      <main>

        {/* ── ABOUT HERO ── */}
        <section className="about-hero" data-animate>
          <div className="about-hero-inner">
            <span className="hero-badge">Our Story</span>
            <h1 className="about-hero-title">
              Preparedness Should Feel<br />
              <span className="hero-gradient-text">Steady, Not Scary</span>
            </h1>
            <p className="about-hero-sub">
              yoursurvivalexpert.ai was built for the millions of people who know they should have
              an emergency plan — but don't know where to start. We combine calm guidance with
              AI to turn that uncertainty into a real, actionable plan.
            </p>
          </div>
        </section>

        {/* ── MISSION ── */}
        <section className="about-mission" data-animate>
          <div className="about-section-inner">
            <div className="about-mission-grid">
              <div className="about-mission-left">
                <span className="about-label">Our Mission</span>
                <h2 className="about-section-title">Make emergency readiness approachable for every household</h2>
                <p className="about-section-body">
                  Most people delay preparing because the information out there is overwhelming,
                  fear-driven, or irrelevant to where they actually live. We fix that by building
                  a personalized plan around your situation — not a generic checklist someone
                  wrote for everyone.
                </p>
                <p className="about-section-body">
                  Our AI asks the right questions, listens to your answers, and produces a guide
                  that reflects your household, your region, and your real concerns.
                </p>
              </div>
              <div className="about-mission-right">
                <div className="about-stat-card">
                  <div className="about-stat">
                    <span className="about-stat-number">2 min</span>
                    <span className="about-stat-label">Average setup time</span>
                  </div>
                  <div className="about-stat-divider" />
                  <div className="about-stat">
                    <span className="about-stat-number">100%</span>
                    <span className="about-stat-label">Free, always</span>
                  </div>
                  <div className="about-stat-divider" />
                  <div className="about-stat">
                    <span className="about-stat-number">50+</span>
                    <span className="about-stat-label">Regional risk profiles</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── VALUES ── */}
        <section className="about-values" data-animate>
          <div className="about-section-inner">
            <div className="about-section-header">
              <span className="about-label">What We Stand For</span>
              <h2 className="about-section-title">Our principles</h2>
            </div>
            <div className="about-values-grid">
              {VALUES.map((v) => (
                <div key={v.title} className="about-value-card">
                  <div className="about-value-icon">{v.icon}</div>
                  <h3 className="about-value-title">{v.title}</h3>
                  <p className="about-value-desc">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="about-how" data-animate>
          <div className="about-section-inner">
            <div className="about-section-header">
              <span className="about-label">The Process</span>
              <h2 className="about-section-title">How it works</h2>
              <p className="about-section-sub">Three steps from conversation to your inbox.</p>
            </div>
            <div className="about-steps">
              {STEPS.map((s, idx) => (
                <div key={s.step} className="about-step">
                  <div className="about-step-left">
                    <span className="about-step-number">{s.step}</span>
                    {idx < STEPS.length - 1 && <span className="about-step-line" />}
                  </div>
                  <div className="about-step-body">
                    <h3 className="about-step-title">{s.title}</h3>
                    <p className="about-step-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


      </main>
    </SiteLayout>
  )
}
