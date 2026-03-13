import { Link } from 'react-router-dom'
import SiteLayout from '../components/SiteLayout.jsx'
import useSeo from '../hooks/useSeo.js'

const TERM_HIGHLIGHTS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    title: 'Informational only',
    desc: 'Our guides support general preparedness planning — not a substitute for professional or emergency services.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: 'Free to use',
    desc: 'The service is provided free of charge. No hidden fees, subscriptions, or premium tiers.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: 'Your responsibility',
    desc: 'You are responsible for decisions and actions based on any guidance provided by the service.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: 'We can update terms',
    desc: 'Terms may be updated periodically. Continued use of the service constitutes acceptance.',
  },
]

const SECTIONS = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    items: [
      { label: 'Agreement', detail: 'By accessing or using yoursurvivalexpert.ai, you agree to be bound by these Terms of Service and all applicable laws and regulations.' },
      { label: 'Eligibility', detail: 'You must be at least 13 years of age to use this service. By using the service, you represent that you meet this requirement.' },
      { label: 'Updates', detail: 'We may revise these terms at any time. The most current version will always be posted on this page. Continued use constitutes acceptance of any changes.' },
    ],
  },
  {
    id: 'service',
    title: 'Use of the Service',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    items: [
      { label: 'Purpose', detail: 'The AI guide is designed for informational and general preparedness planning purposes only. Always follow local laws, official guidance, and emergency service alerts.' },
      { label: 'Permitted use', detail: 'You may use the service for personal, non-commercial preparedness planning. You may not reproduce, redistribute, or sell any generated content without permission.' },
      { label: 'Prohibited conduct', detail: 'You agree not to misuse the service, attempt to reverse-engineer it, submit harmful content, or use it in any way that violates applicable laws.' },
    ],
  },
  {
    id: 'accuracy',
    title: 'Accuracy & Disclaimers',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    items: [
      { label: 'No guarantee', detail: 'We aim to provide clear and practical guidance but cannot guarantee the accuracy, completeness, or suitability of any information for your specific situation.' },
      { label: 'Not emergency services', detail: 'This service is not a substitute for professional emergency services, medical advice, or official government guidance. Always call emergency services in a life-threatening situation.' },
      { label: 'Your decisions', detail: 'You are solely responsible for any decisions or actions you take based on information provided by this service.' },
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    items: [
      { label: 'Limitation', detail: 'To the maximum extent permitted by law, yoursurvivalexpert.ai and its operators shall not be liable for any indirect, incidental, or consequential damages arising from use of the service.' },
      { label: 'As-is basis', detail: 'The service is provided "as is" and "as available" without warranties of any kind, express or implied, including fitness for a particular purpose.' },
      { label: 'Third-party links', detail: 'We are not responsible for the content, accuracy, or practices of any third-party websites or services that may be referenced in your guide.' },
    ],
  },
  {
    id: 'ip',
    title: 'Intellectual Property',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94" />
      </svg>
    ),
    items: [
      { label: 'Ownership', detail: 'All content, branding, and technology on this site are the property of yoursurvivalexpert.ai and its operators, protected by applicable intellectual property laws.' },
      { label: 'Your content', detail: 'You retain ownership of any information you provide during your session. By submitting it, you grant us a limited license to process it for guide generation.' },
      { label: 'Guide usage', detail: 'Generated guides are for your personal use only. You may not republish, sell, or claim authorship of AI-generated content from this service.' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact & Governing Law',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    items: [
      { label: 'Governing law', detail: 'These terms are governed by the laws of the United States. Any disputes shall be resolved in the applicable courts of jurisdiction.' },
      { label: 'Questions', detail: 'For questions about these terms, contact us at techteam@patriotbrandspr.com. We aim to respond within 24 business hours.' },
      { label: 'Entire agreement', detail: 'These Terms of Service, together with our Privacy Policy, constitute the entire agreement between you and yoursurvivalexpert.ai.' },
    ],
  },
]

export default function Terms() {
  useSeo({
    title: 'Terms of Service | yoursurvivalexpert.ai',
    description:
      'Terms of service for yoursurvivalexpert.ai, outlining usage guidelines for the AI survival guide and checklist.',
  })

  return (
    <SiteLayout>
      <main>

        {/* ── HERO ── */}
        <section className="legal-hero" data-animate>
          <div className="legal-hero-inner">
            <span className="about-label">Legal</span>
            <h1 className="about-hero-title">
              Terms of <span className="hero-gradient-text">Service</span>
            </h1>
            <p className="about-hero-sub">
              Plain-language terms that explain how you can use yoursurvivalexpert.ai,
              what we provide, and what we don't.
            </p>
            <p className="legal-effective">Effective date: January 1, 2025</p>
          </div>
        </section>

        {/* ── HIGHLIGHTS ── */}
        <section className="legal-highlights" data-animate>
          <div className="about-section-inner">
            <div className="legal-highlights-header">
              <span className="about-label">Key Points</span>
              <h2 className="about-section-title">Terms at a glance</h2>
              <p className="legal-highlights-sub">
                The most important things to know before reading the full terms below.
              </p>
            </div>
            <div className="legal-highlights-grid">
              {TERM_HIGHLIGHTS.map((h) => (
                <div key={h.title} className="legal-highlight-card">
                  <div className="legal-highlight-icon">{h.icon}</div>
                  <h3 className="legal-highlight-title">{h.title}</h3>
                  <p className="legal-highlight-desc">{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BODY ── */}
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
                Questions about these terms? Email us at{' '}
                <a href="mailto:techteam@patriotbrandspr.com" className="contact-inline-link">
                  techteam@patriotbrandspr.com
                </a>
                {' '}or visit our{' '}
                <Link to="/contact" className="contact-inline-link">Contact page</Link>.
              </div>
            </div>
          </div>
        </section>

      </main>
    </SiteLayout>
  )
}
