import { Link } from 'react-router-dom'
import ChatPreview from '../components/ChatPreview.jsx'
import SiteLayout from '../components/SiteLayout.jsx'
import useSeo from '../hooks/useSeo.js'
import '../App.css'

const CANONICAL = 'https://yoursurvivalexpert.ai/best-emergency-preparedness-guide'

const COMPARISON = [
  {
    aspect: 'Tailored to your region',
    generic: false,
    ours: true,
  },
  {
    aspect: 'Tailored to your household size',
    generic: false,
    ours: true,
  },
  {
    aspect: 'Tailored to your specific emergency concern',
    generic: false,
    ours: true,
  },
  {
    aspect: 'Free to access',
    generic: true,
    ours: true,
  },
  {
    aspect: 'Delivered as a PDF to your inbox',
    generic: false,
    ours: true,
  },
  {
    aspect: 'Covers local resources & emergency contacts',
    generic: false,
    ours: true,
  },
  {
    aspect: 'Includes a 72-hour action timeline',
    generic: true,
    ours: true,
  },
  {
    aspect: 'Updated guidance based on current threats',
    generic: false,
    ours: true,
  },
]

const WHAT_INSIDE = [
  {
    title: 'Threat Assessment for Your Region',
    desc: 'A detailed breakdown of the specific emergency risks in your area — hurricanes, wildfires, earthquakes, winter storms — with historical context and realistic impact estimates.',
    icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  },
  {
    title: 'Essential Supply Checklist',
    desc: 'A categorized, quantity-specific list of everything your household needs — water, food, power, communication, first aid, documents — sized for your family.',
    icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  },
  {
    title: 'Step-by-Step Action Plan',
    desc: '10–15 prioritized actions you can complete over days or weeks to go from unprepared to ready. Each step explains why it matters.',
    icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  },
  {
    title: '72-Hour Emergency Timeline',
    desc: 'Exactly what to do in the first hour, first 24 hours, and 24–72 hours of an emergency. No guessing under pressure.',
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  },
  {
    title: 'Local Resources & Contacts',
    desc: 'Your regional emergency management agency, nearest Red Cross chapter, FEMA office, NOAA weather office, and local emergency alert systems.',
    icon: 'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z',
  },
  {
    title: 'Final Notes from Commander Reid',
    desc: "Closing guidance from our AI survival expert — built on 20+ years of emergency preparedness experience — to give you confidence, not anxiety.",
    icon: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
  },
]

const FAQS = [
  {
    q: 'What is the best emergency preparedness guide?',
    a: 'The best emergency preparedness guide is one that is specific to your household, your region, and the threats you actually face. Generic checklists cover the basics but miss the details that matter most — like how many days of water to store for a Florida hurricane versus a Colorado blizzard, or what documents to take when evacuating from wildfire territory. yoursurvivalexpert.ai generates a personalized PDF guide tailored to your exact situation, delivered free to your inbox.',
  },
  {
    q: 'Is yoursurvivalexpert.ai really free?',
    a: 'Yes. The entire service is completely free. You chat with the AI survival expert, it builds your personalized guide, and delivers the PDF to your email at no cost. No subscription, no account, no credit card required.',
  },
  {
    q: 'How is this different from FEMA or Red Cross guides?',
    a: "FEMA and Red Cross guides are excellent general references, but they are intentionally broad — written for everyone, which means they are fully tailored to no one. yoursurvivalexpert.ai uses those same foundational principles and applies them to your specific household size, primary emergency concern, and geographic region. The result is a guide you can act on immediately, not a 50-page manual to study.",
  },
  {
    q: 'What emergencies does the guide cover?',
    a: 'The guide covers any emergency you specify — including hurricanes, tornadoes, wildfires, earthquakes, floods, winter storms, power outages, water shortages, supply chain disruptions, pandemics, civil unrest, and more. The AI expert tailors the content to the specific threats most relevant to your region.',
  },
  {
    q: 'How long does it take to get my guide?',
    a: 'The chat takes about 2 minutes. Once you provide your email, your personalized PDF is generated and delivered to your inbox within minutes.',
  },
  {
    q: 'Is my information kept private?',
    a: 'Yes. The chat session is private and details are never stored on our servers. Your email is used only to deliver your guide. We do not sell or share your data.',
  },
  {
    q: 'Who built this tool?',
    a: 'yoursurvivalexpert.ai was built to make emergency preparedness accessible to every household. The AI expert persona — Commander Alex Reid — is based on emergency management expertise from FEMA guidelines, American Red Cross standards, and decades of community resilience research.',
  },
]

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#19c37d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export default function BestGuide() {
  useSeo({
    title: 'Best Emergency Preparedness Guide — Free & Personalized | yoursurvivalexpert.ai',
    description:
      'The best emergency preparedness guide is a personalized one. Get a free AI-generated PDF survival guide tailored to your household, region, and top emergency concern. No account required.',
    canonical: CANONICAL,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'The Best Emergency Preparedness Guide Is a Personalized One',
        description:
          'Generic survival checklists leave critical gaps. A personalized emergency guide — tailored to your region, household, and specific threats — is the most effective way to prepare.',
        author: { '@type': 'Organization', name: 'yoursurvivalexpert.ai' },
        publisher: { '@type': 'Organization', name: 'yoursurvivalexpert.ai', url: 'https://yoursurvivalexpert.ai' },
        mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL },
        keywords: 'best emergency preparedness guide, free survival guide, personalized emergency checklist, emergency preparedness PDF',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'How to Get the Best Personalized Emergency Preparedness Guide',
        description: 'Chat with an AI survival expert and receive a free, personalized PDF emergency guide tailored to your household and region in under 2 minutes.',
        totalTime: 'PT2M',
        step: [
          { '@type': 'HowToStep', position: 1, name: 'Start the chat', text: 'Click "Get Your Free Guide" and answer a few quick questions about your household and location.' },
          { '@type': 'HowToStep', position: 2, name: 'Receive your custom plan', text: 'The AI builds a personalized survival guide tailored to your exact situation and regional risks.' },
          { '@type': 'HowToStep', position: 3, name: 'Get your PDF guide', text: 'Provide your email and your full guide and checklist is delivered to your inbox — free.' },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  })

  return (
    <SiteLayout>
      <main>

        {/* ── HERO ── */}
        <section className="hero-section">
          <div className="hero-overlay" />
          <div className="hero-inner">
            <div className="hero-left">
              <span className="hero-badge">GEO · SEO · Emergency Preparedness</span>
              <h1 className="hero-headline" style={{ fontSize: 'clamp(1.9rem, 4.5vw, 3rem)' }}>
                The Best Emergency<br />
                <span className="hero-gradient-text">Preparedness Guide</span><br />
                Is a Personalized One
              </h1>
              <p className="hero-sub">
                Generic checklists treat everyone the same. A household of 5 in hurricane-prone Florida
                has completely different needs than a solo renter in earthquake-prone Los Angeles.
                The best guide is the one built for <em>you</em> — free, in 2 minutes.
              </p>
              <Link to="/?startChat=1#chat" className="hero-cta-btn">
                Get My Free Personalized Guide
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <p className="hero-footnote">Free &nbsp;·&nbsp; No account &nbsp;·&nbsp; PDF delivered to inbox &nbsp;·&nbsp; 2 minutes</p>
            </div>
            <div className="hero-right">
              <ChatPreview
                messages={[
                  { role: 'assistant', text: "What situation are you preparing for — hurricane, wildfire, power outage, or something else?" },
                  { role: 'user', text: "I want the best emergency guide for my family." },
                  { role: 'assistant', text: "I'll build one tailored specifically for your household, location, and risks. What region are you in?" },
                ]}
                onActivate={() => window.location.href = '/?startChat=1#chat'}
              />
            </div>
          </div>
        </section>

        {/* ── TRUST BAR ── */}
        <div className="trust-bar">
          {[
            { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', text: 'AI-powered expert guidance' },
            { icon: 'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z', text: 'Tailored to your region' },
            { icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', text: 'PDF guide to your inbox' },
            { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4', text: 'Completely free' },
          ].map((item) => (
            <div key={item.text} className="trust-item">
              <span className="trust-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
              </span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* ── WHY GENERIC FAILS ── */}
        <section className="who-section" data-animate>
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">Why Generic Guides Fall Short</h2>
              <p className="section-sub">
                Most emergency guides are written for everyone — which means they are optimized for no one.
                Here's what gets lost when advice isn't tailored to your situation.
              </p>
            </div>
            <div className="who-grid">
              {[
                {
                  title: 'Wrong quantities for your household',
                  desc: 'A "3-day water supply" means 3 gallons for one person and 15 gallons for a family of 5. Generic guides rarely spell this out. Yours will.',
                  icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
                },
                {
                  title: 'Wrong threats for your region',
                  desc: "A guide written for a Midwest tornado warning is useless in a California wildfire evacuation. Local threats require local solutions.",
                  icon: 'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z',
                },
                {
                  title: 'No actionable timeline',
                  desc: '"Be prepared" is not a plan. You need to know exactly what to do in the first hour, the first 24 hours, and hours 24–72 of an emergency.',
                  icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
                },
              ].map((card) => (
                <div key={card.title} className="who-card">
                  <div className="who-card-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={card.icon} />
                    </svg>
                  </div>
                  <h3 className="who-card-title">{card.title}</h3>
                  <p className="who-card-desc">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARISON TABLE ── */}
        <section className="geo-section" data-animate>
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">Generic Guide vs. yoursurvivalexpert.ai</h2>
              <p className="section-sub">
                See how a personalized guide compares to a standard FEMA-style checklist.
              </p>
            </div>
            <div style={{ overflowX: 'auto', marginTop: '12px' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                overflow: 'hidden', fontSize: '0.95rem',
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600' }}>Feature</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '600' }}>Generic Guide</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center', color: 'var(--accent)', fontWeight: '700' }}>yoursurvivalexpert.ai</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={row.aspect} style={{
                      borderBottom: i < COMPARISON.length - 1 ? '1px solid var(--border)' : 'none',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    }}>
                      <td style={{ padding: '14px 20px', color: 'var(--text-primary)' }}>{row.aspect}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        {row.generic ? <CheckIcon /> : <XIcon />}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <CheckIcon />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── WHAT'S INSIDE ── */}
        <section className="who-section" data-animate>
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">What's Inside Your Guide</h2>
              <p className="section-sub">
                Every guide includes these six sections — each written specifically for your household,
                region, and primary emergency concern.
              </p>
            </div>
            <div className="who-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
              {WHAT_INSIDE.map((item) => (
                <div key={item.title} className="who-card">
                  <div className="who-card-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.icon} />
                    </svg>
                  </div>
                  <h3 className="who-card-title">{item.title}</h3>
                  <p className="who-card-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="how-section" data-animate>
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">How to Get Your Free Guide</h2>
              <p className="section-sub">Three steps. About 2 minutes. No account required.</p>
            </div>
            <div className="how-grid">
              {[
                { step: '01', title: 'Start the Chat', desc: 'Click the button below and answer 3 quick questions about who you are preparing for, your top concern, and your general region.' },
                { step: '02', title: 'AI Builds Your Plan', desc: 'Commander Alex Reid AI analyzes your profile and generates a detailed, region-specific survival guide — no generic advice.' },
                { step: '03', title: 'Receive Your PDF', desc: 'Enter your email and your complete guide lands in your inbox within minutes. Print it and keep it with your emergency supplies.' },
              ].map((s, idx) => (
                <div key={s.step} className="how-card">
                  <div className="how-step-number">{s.step}</div>
                  {idx < 2 && <div className="how-connector" aria-hidden="true" />}
                  <h3 className="how-card-title">{s.title}</h3>
                  <p className="how-card-desc">{s.desc}</p>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <Link to="/?startChat=1#chat" className="hero-cta-btn" style={{ display: 'inline-flex' }}>
                Start My Free Guide Now
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ── CITY GUIDES CTA ── */}
        <section className="geo-section" data-animate>
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">Guides by City</h2>
              <p className="section-sub">
                Already know your city's risk profile? Browse our city-specific emergency preparedness guides.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
              {[
                { slug: 'houston-tx', label: 'Houston, TX — Hurricane & Flood' },
                { slug: 'miami-fl', label: 'Miami, FL — Hurricane & Storm Surge' },
                { slug: 'los-angeles-ca', label: 'Los Angeles, CA — Earthquake & Wildfire' },
                { slug: 'chicago-il', label: 'Chicago, IL — Winter Storms' },
                { slug: 'denver-co', label: 'Denver, CO — Wildfire & Blizzard' },
              ].map((c) => (
                <Link
                  key={c.slug}
                  to={`/guide/${c.slug}`}
                  style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: '10px', padding: '12px 20px',
                    color: 'var(--text-primary)', textDecoration: 'none',
                    fontSize: '0.9rem', fontWeight: '500', transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {c.label}
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
              <p className="section-sub" style={{ marginTop: '8px' }}>
                Everything you need to know about getting the best emergency preparedness guide.
              </p>
            </div>
            <div className="faq-list" style={{ marginTop: '32px' }}>
              {FAQS.map((item) => (
                <div key={item.q} className="faq-item">
                  <details style={{ width: '100%' }}>
                    <summary className="faq-question" style={{ listStyle: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.5' }}>{item.q}</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#19c37d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: '16px' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </summary>
                    <div className="faq-answer" style={{ display: 'block' }}>{item.a}</div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="how-section" data-animate style={{ paddingBottom: '80px' }}>
          <div className="section-container" style={{ textAlign: 'center' }}>
            <h2 className="section-title">Ready to Build Your Plan?</h2>
            <p className="section-sub" style={{ maxWidth: '520px', margin: '0 auto 32px' }}>
              Join thousands of households who now have a real, personalized emergency plan.
              Takes 2 minutes. Completely free. No account required.
            </p>
            <Link to="/?startChat=1#chat" className="hero-cta-btn" style={{ display: 'inline-flex' }}>
              Get My Best Emergency Guide — Free
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <p className="hero-footnote" style={{ marginTop: '16px' }}>
              Trusted by households across the United States &nbsp;·&nbsp; Free forever
            </p>
          </div>
        </section>

      </main>
    </SiteLayout>
  )
}
