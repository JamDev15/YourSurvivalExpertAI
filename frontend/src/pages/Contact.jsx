import { useState } from 'react'
import { Link } from 'react-router-dom'
import SiteLayout from '../components/SiteLayout.jsx'
import useSeo from '../hooks/useSeo.js'

const CONTACT_CARDS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    label: 'General Inquiries',
    title: 'Questions & Support',
    desc: 'Have a question about your guide, the AI, or how the platform works? We\'re happy to help.',
    action: 'techteam@patriotbrandspr.com',
    href: 'mailto:techteam@patriotbrandspr.com',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: 'Partnerships',
    title: 'Work With Us',
    desc: 'We collaborate with preparedness educators, community leaders, and local organizations.',
    action: 'techteam@patriotbrandspr.com',
    href: 'mailto:techteam@patriotbrandspr.com',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    label: 'Press & Media',
    title: 'Media Requests',
    desc: 'Covering emergency preparedness or AI? We\'d love to connect for editorial or press inquiries.',
    action: 'techteam@patriotbrandspr.com',
    href: 'mailto:techteam@patriotbrandspr.com',
  },
]

export default function Contact() {
  const [copied, setCopied] = useState(false)

  useSeo({
    title: 'Contact | yoursurvivalexpert.ai',
    description:
      'Contact yoursurvivalexpert.ai for support or questions about your free personalized emergency survival guide and checklist.',
    canonical: 'https://yoursurvivalexpert.ai/contact',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact yoursurvivalexpert.ai',
      url: 'https://yoursurvivalexpert.ai/contact',
      description: 'Get in touch with the yoursurvivalexpert.ai team for support or partnerships.',
    },
  })

  const copyEmail = () => {
    navigator.clipboard.writeText('techteam@patriotbrandspr.com')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <SiteLayout>
      <main>

        {/* ── HERO ── */}
        <section className="contact-hero" data-animate>
          <div className="contact-hero-inner">
            <span className="about-label">Get In Touch</span>
            <h1 className="about-hero-title">
              We'd love to<br />
              <span className="hero-gradient-text">hear from you</span>
            </h1>
            <p className="about-hero-sub">
              Whether it's a question, a partnership idea, or a media request — we respond
              quickly and keep things simple.
            </p>
            <button className="contact-copy-btn" onClick={copyEmail} type="button">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              {copied ? 'Copied!' : 'techteam@patriotbrandspr.com'}
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
        </section>

        {/* ── CONTACT CARDS ── */}
        <section className="contact-cards-section" data-animate>
          <div className="about-section-inner">
            <div className="contact-cards-grid">
              {CONTACT_CARDS.map((card) => (
                <div key={card.label} className="contact-pro-card">
                  <div className="contact-pro-card-top">
                    <div className="contact-pro-icon">{card.icon}</div>
                    <span className="about-label">{card.label}</span>
                  </div>
                  <h3 className="contact-pro-title">{card.title}</h3>
                  <p className="contact-pro-desc">{card.desc}</p>
                  <a href={card.href} className="contact-pro-link">
                    {card.action}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── RESPONSE INFO ── */}
        <section className="contact-info-section" data-animate>
          <div className="about-section-inner">
            <div className="contact-info-card">
              <div className="contact-info-left">
                <div className="contact-info-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <h3 className="contact-info-title">Response time</h3>
                  <p className="contact-info-desc">We typically respond within 24 hours on business days.</p>
                </div>
              </div>
              <div className="contact-info-divider" />
              <div className="contact-info-left">
                <div className="contact-info-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                </div>
                <div>
                  <h3 className="contact-info-title">Need a guide now?</h3>
                  <p className="contact-info-desc">
                    Skip the wait —{' '}
                    <Link to="/?startChat=1#chat" className="contact-inline-link">
                      start the AI chat
                    </Link>{' '}
                    and get your personalized guide in minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </SiteLayout>
  )
}
