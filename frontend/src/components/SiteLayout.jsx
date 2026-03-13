import { useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'

export default function SiteLayout({ children, ctaLabel = 'Start', onCta }) {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll('[data-animate]'))
    if (targets.length === 0) return undefined

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      targets.forEach((el) => el.classList.add('reveal', 'is-visible'))
      return undefined
    }

    targets.forEach((el) => el.classList.add('reveal'))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -10% 0px' }
    )

    targets.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="page">

      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <div className="brand-text">
            <strong>yoursurvivalexpert<span className="brand-tld">.ai</span></strong>
            <p>Calm emergency preparedness</p>
          </div>
        </Link>

        <nav className="site-nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          <NavLink to="/privacy">Privacy</NavLink>
          <NavLink to="/terms">Terms</NavLink>
        </nav>

        {onCta ? (
          <button className="header-cta" type="button" onClick={onCta}>
            Get Free Guide
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        ) : (
          <Link className="header-cta" to="/?startChat=1#chat">
            Get Free Guide
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        )}
      </header>

      {children}

      <footer className="site-footer">
        <div className="footer-cta-strip">
          <span className="cta-shimmer" aria-hidden="true" />
          <div className="footer-cta-inner">
            <span className="footer-cta-eyebrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Free Emergency Preparedness Guide
            </span>
            <div>
              <h3 className="footer-cta-title">Ready to build your survival plan?</h3>
              <p className="footer-cta-sub">Takes 2 minutes. Free. Delivered to your inbox.</p>
            </div>
            <Link className="footer-cta-btn" to="/?startChat=1#chat">
              Get My Free Guide
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="footer-main">
          <div className="footer-content">
            <div className="footer-col footer-col--brand">
              <div className="footer-brand">
                <span className="brand-mark">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                <strong>yoursurvivalexpert<span className="brand-tld">.ai</span></strong>
              </div>
              <p className="footer-tagline">Preparedness should feel steady — not scary. We help families and individuals build real plans for real emergencies.</p>
              <div className="footer-badges">
                <span className="footer-badge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
                  </svg>
                  100% Free
                </span>
                <span className="footer-badge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Private &amp; Secure
                </span>
              </div>
            </div>

            <div className="footer-col">
              <h4>Navigation</h4>
              <nav className="footer-nav">
                <Link to="/">Home</Link>
                <Link to="/about">About Us</Link>
                <Link to="/contact">Contact</Link>
              </nav>
            </div>

            <div className="footer-col">
              <h4>Legal</h4>
              <nav className="footer-nav">
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/terms">Terms of Service</Link>
              </nav>
            </div>

            <div className="footer-col">
              <h4>Contact</h4>
              <div className="footer-contact-block">
                <a href="mailto:techteam@patriotbrandspr.com" className="footer-email-link">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  techteam@patriotbrandspr.com
                </a>
                <p className="footer-response-note">We typically respond within 24 hours.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} yoursurvivalexpert.ai. All rights reserved.</p>
          <p className="footer-bottom-links">
            <Link to="/privacy">Privacy</Link>
            <span>·</span>
            <Link to="/terms">Terms</Link>
          </p>
        </div>
      </footer>

    </div>
  )
}
