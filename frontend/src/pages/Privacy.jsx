import SiteLayout from '../components/SiteLayout.jsx'
import useSeo from '../hooks/useSeo.js'

const HIGHLIGHTS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: 'We never sell your data',
    desc: 'Your personal information is never sold, rented, or shared with third parties for marketing.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    title: 'Minimal data collection',
    desc: 'We only collect what is strictly necessary to deliver your personalized guide.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Limited retention',
    desc: 'Data is kept only as long as needed to deliver your guide and maintain service quality.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: 'No account required',
    desc: 'You can get a full personalized guide without creating an account or profile.',
  },
]

const SECTIONS = [
  {
    id: 'collect',
    title: 'Information We Collect',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    items: [
      { label: 'Conversation data', detail: 'Details you share with the AI expert during your session, used solely to generate your guide.' },
      { label: 'Email address', detail: 'Collected only when you request your PDF guide, used exclusively to deliver it to your inbox.' },
      { label: 'Basic analytics', detail: 'Anonymized usage data (page views, session length) to help us improve performance and quality.' },
    ],
  },
  {
    id: 'use',
    title: 'How We Use It',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
    items: [
      { label: 'Guide generation', detail: 'Your conversation context is used to build a personalized survival guide and emergency checklist.' },
      { label: 'Email delivery', detail: 'Your email address is used once — to send your guide. We do not use it for marketing without consent.' },
      { label: 'Service improvement', detail: 'Aggregated, anonymized analytics help us improve the quality and relevance of our AI responses.' },
    ],
  },
  {
    id: 'retention',
    title: 'Data Retention',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    items: [
      { label: 'Session data', detail: 'Conversation details are retained only for the duration needed to generate and deliver your guide.' },
      { label: 'Email records', detail: 'Email addresses are stored only as long as required for delivery and are not used afterward.' },
      { label: 'Deletion requests', detail: 'You may request deletion of your data at any time by contacting us at techteam@patriotbrandspr.com.' },
    ],
  },
  {
    id: 'rights',
    title: 'Your Rights',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    items: [
      { label: 'Access', detail: 'You have the right to request a copy of any personal data we hold about you.' },
      { label: 'Correction', detail: 'You may ask us to correct inaccurate or incomplete personal information.' },
      { label: 'Deletion', detail: 'You may request that we delete your personal data, subject to any legal obligations we must fulfill.' },
    ],
  },
]

export default function Privacy() {
  useSeo({
    title: 'Privacy Policy | yoursurvivalexpert.ai',
    description:
      'Read the privacy policy for yoursurvivalexpert.ai, including how we handle chat data and email delivery for survival guides.',
  })

  return (
    <SiteLayout>
      <main>

        {/* ── HERO ── */}
        <section className="legal-hero" data-animate>
          <div className="legal-hero-inner">
            <span className="about-label">Legal</span>
            <h1 className="about-hero-title">
              Privacy <span className="hero-gradient-text">Policy</span>
            </h1>
            <p className="about-hero-sub">
              We built yoursurvivalexpert.ai with privacy in mind. Here's exactly what we collect,
              why we collect it, and how we protect it.
            </p>
            <p className="legal-effective">Effective date: January 1, 2025</p>
          </div>
        </section>

        {/* ── HIGHLIGHTS ── */}
        <section className="legal-highlights" data-animate>
          <div className="about-section-inner">
            <div className="legal-highlights-header">
              <span className="about-label">Our Commitment</span>
              <h2 className="about-section-title">Privacy by design</h2>
              <p className="legal-highlights-sub">
                We built data minimization into the product from day one — not as an afterthought.
              </p>
            </div>
            <div className="legal-highlights-grid">
              {HIGHLIGHTS.map((h) => (
                <div key={h.title} className="legal-highlight-card">
                  <div className="legal-highlight-icon">{h.icon}</div>
                  <h3 className="legal-highlight-title">{h.title}</h3>
                  <p className="legal-highlight-desc">{h.desc}</p>
                </div>
              ))}
            </div>
            <div className="legal-highlights-stats">
              <div className="legal-stat-item">
                <span className="legal-stat-value">0</span>
                <span className="legal-stat-label">Third parties we sell data to</span>
              </div>
              <div className="legal-stat-divider" />
              <div className="legal-stat-item">
                <span className="legal-stat-value">2</span>
                <span className="legal-stat-label">Data points we ever collect</span>
              </div>
              <div className="legal-stat-divider" />
              <div className="legal-stat-item">
                <span className="legal-stat-value">0</span>
                <span className="legal-stat-label">Accounts required to use the app</span>
              </div>
              <div className="legal-stat-divider" />
              <div className="legal-stat-item">
                <span className="legal-stat-value">24h</span>
                <span className="legal-stat-label">Response time for data requests</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── POLICY SECTIONS ── */}
        <section className="legal-body" data-animate>
          <div className="legal-body-inner">
            <nav className="legal-toc">
              <p className="legal-toc-label">Contents</p>
              {SECTIONS.map((s, i) => (
                <a key={s.id} href={`#${s.id}`} className="legal-toc-link">
                  <span className="legal-toc-num">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </a>
              ))}
            </nav>

            <div className="legal-sections">
              {SECTIONS.map((s) => (
                <div key={s.id} id={s.id} className="legal-section">
                  <div className="legal-section-heading">
                    <span className="legal-section-icon">{s.icon}</span>
                    <h2 className="legal-section-title">{s.title}</h2>
                  </div>
                  <div className="legal-items">
                    {s.items.map((item) => (
                      <div key={item.label} className="legal-item">
                        <span className="legal-item-label">{item.label}</span>
                        <p className="legal-item-detail">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="legal-contact-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Questions about this policy? Email us at{' '}
                <a href="mailto:techteam@patriotbrandspr.com" className="contact-inline-link">
                  techteam@patriotbrandspr.com
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>
    </SiteLayout>
  )
}
