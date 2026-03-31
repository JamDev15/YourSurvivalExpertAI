import { Component } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
import About from './pages/About.jsx'
import BestGuide from './pages/BestGuide.jsx'
import CityGuide from './pages/CityGuide.jsx'
import Contact from './pages/Contact.jsx'
import Home from './pages/Home.jsx'
import Privacy from './pages/Privacy.jsx'
import Terms from './pages/Terms.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#060e1a', color: '#fff', gap: '16px', padding: '24px', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#19c37d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Something went wrong</h2>
          <p style={{ color: '#8b9cb3', margin: 0 }}>Please refresh the page to continue.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#19c37d', color: '#060e1a', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' }}
          >
            Refresh page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/guide/:citySlug" element={<CityGuide />} />
          <Route path="/best-emergency-preparedness-guide" element={<BestGuide />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
