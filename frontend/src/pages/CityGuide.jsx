import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ChatPreview from '../components/ChatPreview.jsx'
import SiteLayout from '../components/SiteLayout.jsx'
import useSeo from '../hooks/useSeo.js'
import '../App.css'

const CITY_DATA = {
  'houston-tx': {
    city: 'Houston',
    state: 'TX',
    stateLabel: 'Texas',
    slug: 'houston-tx',
    primaryHazard: 'Hurricane & Flood',
    hazards: ['hurricanes', 'flooding', 'extreme heat', 'winter storms'],
    heroHeadline: 'Houston Emergency Preparedness Guide',
    heroSub:
      'Houston faces hurricane season, severe flooding, and winter freezes. Get a personalized survival plan tailored to the Gulf Coast.',
    chatPreview: [
      { role: 'assistant', text: "What situation are you preparing for — hurricane, flooding, or another emergency?" },
      { role: 'user', text: "We're in Houston and worried about hurricane season." },
      { role: 'assistant', text: "Got it. I'll build a personalized Gulf Coast hurricane plan for your household. How many people are you preparing for?" },
    ],
    riskTitle: 'Top Risks Facing Houston Residents',
    risks: [
      {
        name: 'Hurricane Season',
        desc: 'The Gulf Coast is a direct path for Atlantic hurricanes. Category 4+ storms can bring 130+ mph winds, storm surge, and days-long power outages across Harris County.',
        icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
      },
      {
        name: 'Flash Flooding',
        desc: 'Houston sits on flat clay-heavy terrain with limited drainage. Even a 4-inch rainfall event can cause severe street flooding. Bayou overflow can impact thousands of homes.',
        icon: 'M17 7l-1.41-1.41L9 12.17V3H7v9.17L0.41 5.59 -1 7l8 8 8-8z',
      },
      {
        name: 'Extreme Heat',
        desc: "Summer temperatures regularly exceed 100°F with high humidity. Heat-related illness is a serious risk, especially for seniors, children, and those without reliable AC.",
        icon: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 6a6 6 0 1 0 0 12A6 6 0 0 0 12 6z',
      },
      {
        name: 'Winter Freezes',
        desc: "The 2021 Winter Storm Uri left millions without power for days. Pipes burst, water systems failed, and many residents were unprepared for sub-freezing temperatures in a warm-weather city.",
        icon: 'M2 12h20M12 2v20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
      },
    ],
    faqItems: [
      {
        q: 'When is Houston hurricane season?',
        a: 'The Atlantic hurricane season runs June 1 through November 30. Peak activity is typically August through October. Residents should have supplies ready by June 1 each year.',
      },
      {
        q: 'How much water should a Houston household store?',
        a: 'FEMA recommends 1 gallon per person per day for at least 3 days. Houston flooding and hurricane damage can disrupt water service for a week or more — aim for 14 days of supply.',
      },
      {
        q: 'What should a Houston emergency kit include?',
        a: 'Your kit should include 14 days of water, non-perishable food, a battery-powered radio, flashlights, first aid supplies, medications, important documents, cash, and a portable generator. Your personalized guide will include a complete checklist.',
      },
      {
        q: 'Should I evacuate or shelter in place for a Houston hurricane?',
        a: 'Follow official evacuation orders. For Category 3+ storms, especially if you live in flood zones A, B, or near the ship channel, evacuate early. Traffic out of Houston can take 12+ hours. Your guide will include evacuation routes and timing.',
      },
    ],
    metaDescription:
      'Get a free personalized emergency preparedness guide for Houston, TX. Covers hurricane season, flooding, extreme heat, and winter storms with a 72-hour action plan.',
    canonical: 'https://yoursurvivalexpert.ai/guide/houston-tx',
  },
  'miami-fl': {
    city: 'Miami',
    state: 'FL',
    stateLabel: 'Florida',
    slug: 'miami-fl',
    primaryHazard: 'Hurricane & Storm Surge',
    hazards: ['hurricanes', 'storm surge', 'flooding', 'power loss'],
    heroHeadline: 'Miami Hurricane Preparedness Guide',
    heroSub:
      'Miami is one of the most hurricane-vulnerable cities in America. Get a personalized survival plan built for South Florida risks.',
    chatPreview: [
      { role: 'assistant', text: "What situation are you preparing for — hurricane, flooding, or another emergency?" },
      { role: 'user', text: "I'm in Miami and need to prepare for hurricane season." },
      { role: 'assistant', text: "Understood. Miami faces serious storm surge risk. I'll build a personalized plan. Are you preparing for yourself or your household?" },
    ],
    riskTitle: 'Top Risks Facing Miami Residents',
    risks: [
      {
        name: 'Direct Hurricane Hits',
        desc: 'Miami sits at the bottom of the Florida Peninsula — a direct target for Atlantic and Caribbean storms. Major hurricanes like Andrew (1992) and Irma (2017) have demonstrated catastrophic damage potential.',
        icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
      },
      {
        name: 'Storm Surge & Sea Level',
        desc: "Miami's low elevation (average 6 feet above sea level) makes it exceptionally vulnerable to storm surge — the wall of water pushed ashore by hurricane winds. A Category 4 storm could inundate large parts of the city.",
        icon: 'M3 18v-6a9 9 0 0 1 18 0v6',
      },
      {
        name: 'Extended Power Outages',
        desc: 'South Florida power grids are regularly stressed by hurricanes. Outages lasting days to weeks are common after major storms, making generators, ice, and food storage planning critical.',
        icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
      },
      {
        name: 'Flooding & Drainage',
        desc: "Miami's urban density combined with heavy rainfall and inadequate drainage infrastructure means street flooding occurs even during moderate rain events, let alone during a hurricane.",
        icon: 'M17 7l-1.41-1.41L9 12.17V3H7v9.17L0.41 5.59 -1 7l8 8 8-8z',
      },
    ],
    faqItems: [
      {
        q: 'How early should I prepare before a Miami hurricane?',
        a: "Start preparing now, before any storm threatens. Once a hurricane watch is issued, stores empty out quickly. Have your kit built before June 1 each year — don't wait for a storm to form.",
      },
      {
        q: 'Which Miami neighborhoods are at highest risk?',
        a: 'Low-lying areas including Miami Beach, Little Havana, Brickell, and coastal zones face the highest storm surge and flooding risk. Check Miami-Dade County flood maps and evacuation zone maps.',
      },
      {
        q: 'Should I leave Miami before a hurricane?',
        a: 'If you are in evacuation zones A, B, or C, follow mandatory evacuation orders. Do not wait. I-75, I-95, and the Turnpike have contraflow options. Early evacuation (48+ hours out) is always safer.',
      },
      {
        q: 'What documents should I take if I evacuate?',
        a: 'Take IDs, insurance documents, birth certificates, medical records, prescriptions, and financial records. Store digital copies in a secure cloud service. Your guide will include a full document checklist.',
      },
    ],
    metaDescription:
      'Get a free personalized hurricane preparedness guide for Miami, FL. Covers storm surge, evacuation zones, power outages, and a 72-hour emergency action plan.',
    canonical: 'https://yoursurvivalexpert.ai/guide/miami-fl',
  },
  'los-angeles-ca': {
    city: 'Los Angeles',
    state: 'CA',
    stateLabel: 'California',
    slug: 'los-angeles-ca',
    primaryHazard: 'Earthquake & Wildfire',
    hazards: ['earthquakes', 'wildfires', 'heat waves', 'landslides'],
    heroHeadline: 'Los Angeles Earthquake & Wildfire Guide',
    heroSub:
      'Los Angeles sits on major fault lines and faces escalating wildfire threats. Get a personalized emergency plan built for Southern California.',
    chatPreview: [
      { role: 'assistant', text: "What situation are you preparing for — earthquake, wildfire, or another emergency?" },
      { role: 'user', text: "I'm in Los Angeles and worried about a major earthquake." },
      { role: 'assistant', text: "Smart move. LA sits on active fault lines. I'll build a personalized seismic preparedness plan. Are you preparing alone or with a household?" },
    ],
    riskTitle: 'Top Risks Facing Los Angeles Residents',
    risks: [
      {
        name: 'Major Earthquakes',
        desc: 'LA sits directly on the San Andreas, Puente Hills, and Newport-Inglewood fault systems. A magnitude 7.8+ "Big One" could kill thousands and cut water, gas, and power for weeks across the region.',
        icon: 'M3 18l9-14 9 14M9 12h6',
      },
      {
        name: 'Wildfires',
        desc: 'LA County sees regular fire conditions — hot dry winds, drought, and dense hillside development create extreme fire risk year-round. The 2025 Palisades and Eaton fires showed how quickly entire neighborhoods can be destroyed.',
        icon: 'M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0c0-5-5-10-5-10z',
      },
      {
        name: 'Extreme Heat',
        desc: "LA heat waves have reached 115°F in the valleys. Heat-related deaths spike in communities without AC, especially among the elderly. Power grid stress during heat waves can cause rolling blackouts.",
        icon: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 6a6 6 0 1 0 0 12A6 6 0 0 0 12 6z',
      },
      {
        name: 'Post-Earthquake Infrastructure Failure',
        desc: "After a major quake, water mains break, gas lines rupture, roads crack, and bridges close. LA's sprawl makes it highly dependent on cars and freeways that may be impassable after a major seismic event.",
        icon: 'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z',
      },
    ],
    faqItems: [
      {
        q: 'What should I do immediately after an earthquake in LA?',
        a: 'Drop, Cover, and Hold On during the shaking. After it stops: check for injuries, smell for gas (leave if present), check utilities, and stay away from damaged structures. Expect aftershocks.',
      },
      {
        q: 'How much water should LA residents store for an earthquake?',
        a: 'LA DWP recommends 2 weeks of stored water given the risk of extended water main breaks after a major quake. Store 1 gallon per person per day minimum — more if you have pets or specific health needs.',
      },
      {
        q: 'How do I know if my area is at risk for wildfires?',
        a: 'Check the CAL FIRE Fire Hazard Severity Zone map. High Fire Hazard Severity Zone (HFHSZ) designations cover large parts of LA County. Your personalized guide will include risk specific to your neighborhood.',
      },
      {
        q: 'Should I leave for a wildfire evacuation warning vs. order?',
        a: "A Warning means be ready to go immediately — pack your go-bag and be prepared to leave instantly. An Order means leave NOW. Don't delay for a fire evacuation order. Roads can become dangerously impassable within minutes.",
      },
    ],
    metaDescription:
      'Get a free personalized emergency guide for Los Angeles, CA. Covers earthquake preparation, wildfire evacuation, heat waves, and a 72-hour survival plan.',
    canonical: 'https://yoursurvivalexpert.ai/guide/los-angeles-ca',
  },
  'chicago-il': {
    city: 'Chicago',
    state: 'IL',
    stateLabel: 'Illinois',
    slug: 'chicago-il',
    primaryHazard: 'Winter Storms & Extreme Cold',
    hazards: ['winter storms', 'extreme cold', 'power outages', 'severe weather'],
    heroHeadline: 'Chicago Winter Storm Preparedness Guide',
    heroSub:
      'Chicago winters bring blizzards, whiteouts, and dangerous cold snaps. Get a personalized emergency plan for surviving extreme Midwest weather.',
    chatPreview: [
      { role: 'assistant', text: "What situation are you preparing for — winter storm, power outage, or another emergency?" },
      { role: 'user', text: "We're in Chicago and want to be ready for a bad winter storm." },
      { role: 'assistant', text: "Good thinking — polar vortex events can be dangerous. I'll build a winter preparedness plan for your household. How many people are you preparing for?" },
    ],
    riskTitle: 'Top Risks Facing Chicago Residents',
    risks: [
      {
        name: 'Blizzards & Whiteouts',
        desc: "Chicago's position on Lake Michigan creates lake-effect snow and intense blizzards. The 2011 blizzard stranded hundreds on Lake Shore Drive. A single storm can dump 2+ feet of snow and close the city for days.",
        icon: 'M2 12h20M12 2v20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
      },
      {
        name: 'Polar Vortex Events',
        desc: 'In 2019, Chicago hit -23°F (-31°C) with wind chills of -52°F. Exposed skin can freeze in minutes. Burst pipes, hypothermia, and carbon monoxide from improper indoor heating are major risks.',
        icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      },
      {
        name: 'Extended Power Outages',
        desc: 'Ice storms can down power lines across ComEd service territory. Winter power outages are far more dangerous than summer ones — homes can drop to unsafe temperatures within hours without heat.',
        icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
      },
      {
        name: 'Severe Thunderstorms',
        desc: 'Chicago also faces summer tornado and severe storm threats. The flat Midwest terrain provides little protection from fast-moving supercell thunderstorms that can bring damaging winds and hail.',
        icon: 'M19 16.9A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25M16 16l-4 4-4-4M12 12v8',
      },
    ],
    faqItems: [
      {
        q: 'How do I heat my home if the power goes out in a Chicago winter?',
        a: 'Use a generator safely outside, never indoors. Battery-powered or propane space heaters can work temporarily. Layer clothing and use sleeping bags. Never burn charcoal or gas appliances indoors — carbon monoxide is deadly.',
      },
      {
        q: 'What are the signs of hypothermia?',
        a: 'Early signs include intense shivering, confusion, slurred speech, and drowsiness. Move the person to warmth, replace wet clothing, and seek medical attention immediately. Hypothermia can set in quickly in Chicago winters.',
      },
      {
        q: 'Should I keep my car emergency kit stocked year-round in Chicago?',
        a: 'Yes. Always keep blankets, jumper cables, an ice scraper, water, non-perishable snacks, flares, and a first aid kit in your car. Getting stranded in a Chicago winter is a life-threatening situation.',
      },
      {
        q: 'How much food and water should Chicago residents store?',
        a: 'FEMA recommends at least 72 hours; given Chicago winter storm potential, aim for 2 weeks. Focus on shelf-stable meals that require minimal cooking — power and gas supply can both be disrupted.',
      },
    ],
    metaDescription:
      'Get a free personalized emergency guide for Chicago, IL. Covers winter storms, polar vortex events, power outages, and a 72-hour cold-weather survival plan.',
    canonical: 'https://yoursurvivalexpert.ai/guide/chicago-il',
  },
  'denver-co': {
    city: 'Denver',
    state: 'CO',
    stateLabel: 'Colorado',
    slug: 'denver-co',
    primaryHazard: 'Wildfire & Winter Storms',
    hazards: ['wildfires', 'winter storms', 'flooding', 'hailstorms'],
    heroHeadline: 'Denver Wildfire & Winter Storm Guide',
    heroSub:
      "Denver sits at the edge of wildfire-prone foothills and faces intense seasonal weather swings. Get a personalized emergency plan built for Colorado's front range.",
    chatPreview: [
      { role: 'assistant', text: "What situation are you preparing for — wildfire, winter storm, or another emergency?" },
      { role: 'user', text: "I'm near Denver and worried about wildfire season." },
      { role: 'assistant', text: "Understood. Colorado's Front Range faces serious fire risk. I'll build a wildfire evacuation plan. Are you preparing for yourself or a household?" },
    ],
    riskTitle: 'Top Risks Facing Denver Residents',
    risks: [
      {
        name: 'Wildfire Threat',
        desc: "Denver's proximity to the Rocky Mountain foothills places many communities in high wildfire risk zones. The 2021 Marshall Fire destroyed nearly 1,100 homes in Boulder County with 100+ mph winds driving the blaze.",
        icon: 'M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0c0-5-5-10-5-10z',
      },
      {
        name: 'Severe Blizzards',
        desc: "Denver can see rapid and intense winter storms year-round — even in October and April. The 2003 blizzard dropped nearly 32 inches. Interstate closures and road accidents spike significantly during these events.",
        icon: 'M2 12h20M12 2v20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
      },
      {
        name: 'Flash Flooding',
        desc: 'Summer monsoon moisture combined with wildfire-scarred terrain creates dangerous flash flood conditions across the Front Range. Burn areas are particularly vulnerable — soil loses its ability to absorb water after fire.',
        icon: 'M3 18v-6a9 9 0 0 1 18 0v6',
      },
      {
        name: 'Severe Hailstorms',
        desc: "Colorado is the nation's hail capital. Denver regularly sees quarter-sized and golf ball-sized hail that damages roofs, vehicles, and crops. Large hail events can be dangerous and cause widespread property damage.",
        icon: 'M19 16.9A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25',
      },
    ],
    faqItems: [
      {
        q: 'Which Denver-area communities are at highest wildfire risk?',
        a: 'Communities in the WUI (Wildland-Urban Interface) including Evergreen, Conifer, Morrison, Lakewood foothills, and Boulder County face elevated risk. Check the Colorado Division of Fire Prevention and Control risk maps.',
      },
      {
        q: 'How should I prepare for a Denver area wildfire evacuation?',
        a: 'Maintain a go-bag ready at all times. Harden your home: clear 30 feet of defensible space, use fire-resistant landscaping, and install ember-resistant vents. Register for Jefferson/Arapahoe/Boulder county emergency alerts.',
      },
      {
        q: 'How do I prepare for sudden Denver snowstorms?',
        a: "Denver's weather can swing from 70°F to blizzard conditions in hours. Keep your car stocked with emergency supplies, maintain a 72-hour home supply kit, and have a backup heating plan in case of power loss.",
      },
      {
        q: 'Does wildfire smoke in Denver require special preparedness?',
        a: 'Yes. During regional wildfire events, air quality can hit hazardous levels (AQI 300+). Keep N95 masks on hand, stock HEPA air purifiers, and have a plan to shelter indoors or relocate if air quality becomes dangerous.',
      },
    ],
    metaDescription:
      'Get a free personalized emergency guide for Denver, CO. Covers wildfires, blizzards, flash flooding, and a 72-hour preparedness plan for the Front Range.',
    canonical: 'https://yoursurvivalexpert.ai/guide/denver-co',
  },
}

const HOW_STEPS = [
  {
    step: '01',
    title: 'Chat with the AI Expert',
    desc: 'Answer a few quick questions about your household, location, and top concerns.',
  },
  {
    step: '02',
    title: 'Get Your Custom Plan',
    desc: 'The AI builds a personalized survival guide tailored to your exact situation.',
  },
  {
    step: '03',
    title: 'Receive Your PDF Guide',
    desc: 'Your full guide and checklist is delivered directly to your inbox — free.',
  },
]

function RiskIcon({ path }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

export default function CityGuide() {
  const { citySlug } = useParams()
  const data = CITY_DATA[citySlug]

  const [faqOpen, setFaqOpen] = useState([false, false, false, false])

  useSeo({
    title: data
      ? `${data.city}, ${data.state} Emergency Preparedness Guide | yoursurvivalexpert.ai`
      : 'Emergency Guide | yoursurvivalexpert.ai',
    description: data?.metaDescription || 'Personalized emergency preparedness guides for your region.',
    canonical: data?.canonical,
    jsonLd: data
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: data.heroHeadline,
            description: data.metaDescription,
            author: { '@type': 'Organization', name: 'yoursurvivalexpert.ai' },
            publisher: { '@type': 'Organization', name: 'yoursurvivalexpert.ai', url: 'https://yoursurvivalexpert.ai' },
            mainEntityOfPage: { '@type': 'WebPage', '@id': data.canonical },
            about: data.hazards.map((h) => ({ '@type': 'Thing', name: h })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: `yoursurvivalexpert.ai — ${data.city}, ${data.state}`,
            areaServed: `${data.city}, ${data.state}`,
            description: `Free personalized emergency preparedness guides for ${data.city}, ${data.stateLabel}.`,
            url: data.canonical,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: `How to Get a Free Emergency Preparedness Guide for ${data.city}, ${data.state}`,
            description: `Chat with an AI survival expert and receive a free PDF emergency guide tailored to ${data.city}.`,
            totalTime: 'PT2M',
            step: HOW_STEPS.map((s, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: s.title,
              text: s.desc,
              url: `https://yoursurvivalexpert.ai/?startChat=1#chat`,
            })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: data.faqItems.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          },
        ]
      : [],
  })

  if (!data) {
    return (
      <SiteLayout>
        <main style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Guide Not Found</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>We don't have a specific guide for that city yet.</p>
          <Link to="/?startChat=1#chat" className="hero-cta-btn">Get a Personalized Guide</Link>
        </main>
      </SiteLayout>
    )
  }

  return (
    <SiteLayout>
      <main>

        {/* ── CITY HERO ── */}
        <section className="hero-section">
          <div className="hero-overlay" />
          <div className="hero-inner">
            <div className="hero-left">
              <span className="hero-badge">{data.primaryHazard} Preparedness · {data.city}, {data.state}</span>
              <h1 className="hero-headline" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
                {data.heroHeadline}
              </h1>
              <p className="hero-sub">{data.heroSub}</p>
              <Link to="/?startChat=1#chat" className="hero-cta-btn">
                Get Your Free {data.city} Guide
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <p className="hero-footnote">Free &nbsp;·&nbsp; No account required &nbsp;·&nbsp; Delivered to your inbox</p>
            </div>
            <div className="hero-right">
              <ChatPreview messages={data.chatPreview} onActivate={() => window.location.href = '/?startChat=1#chat'} />
            </div>
          </div>
        </section>

        {/* ── TRUST BAR ── */}
        <div className="trust-bar">
          <div className="trust-item">
            <span className="trust-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <span>2-minute setup</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <span>Specific to {data.city}</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            <span>PDF delivered to inbox</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
              </svg>
            </span>
            <span>Completely free</span>
          </div>
        </div>

        {/* ── LOCAL RISKS ── */}
        <section className="who-section" data-animate>
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">{data.riskTitle}</h2>
              <p className="section-sub">
                Understanding your local threats is the first step to building a real plan. Here's what {data.city} residents need to prepare for.
              </p>
            </div>
            <div className="who-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {data.risks.map((risk) => (
                <div key={risk.name} className="who-card">
                  <div className="who-card-icon">
                    <RiskIcon path={risk.icon} />
                  </div>
                  <h3 className="who-card-title">{risk.name}</h3>
                  <p className="who-card-desc">{risk.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHAT'S IN THE GUIDE ── */}
        <section className="geo-section" data-animate>
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">What Your {data.city} Guide Includes</h2>
              <p className="section-sub">
                Your personalized PDF is built around the specific risks in {data.city}, {data.state} — not a generic checklist.
              </p>
            </div>
            <div className="geo-grid">
              {[
                {
                  title: `${data.city}-Specific Threat Assessment`,
                  desc: `An honest breakdown of the risks in ${data.city} — from ${data.hazards[0]} to ${data.hazards[1]} — and what they mean for your household.`,
                  icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
                },
                {
                  title: 'Essential Supply Checklist',
                  desc: 'Water, food, power, communication, and first aid supplies — tailored to the duration and type of emergencies most likely in your region.',
                  icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
                },
                {
                  title: '72-Hour Action Timeline',
                  desc: `Step-by-step instructions for the first 72 hours of a ${data.hazards[0]} emergency — the most critical window for protecting your household.`,
                  icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
                },
              ].map((card) => (
                <div key={card.title} className="geo-card">
                  <div className="geo-card-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={card.icon} />
                    </svg>
                  </div>
                  <h3 className="geo-card-title">{card.title}</h3>
                  <p className="geo-card-desc">{card.desc}</p>
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
              <p className="section-sub">Three steps to your personalized {data.city} emergency plan.</p>
            </div>
            <div className="how-grid">
              {HOW_STEPS.map((step, idx) => (
                <div key={step.step} className="how-card">
                  <div className="how-step-number">{step.step}</div>
                  {idx < HOW_STEPS.length - 1 && <div className="how-connector" aria-hidden="true" />}
                  <h3 className="how-card-title">{step.title}</h3>
                  <p className="how-card-desc">{step.desc}</p>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <Link to="/?startChat=1#chat" className="hero-cta-btn" style={{ display: 'inline-flex' }}>
                Start My {data.city} Plan — Free
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="faq-section" data-animate>
          <div className="faq-container">
            <div className="section-header">
              <h2 className="section-title">Frequently Asked Questions — {data.city}</h2>
            </div>
            <div className="faq-list">
              {data.faqItems.map((item, idx) => (
                <div key={item.q} className={`faq-item ${faqOpen[idx] ? 'open' : ''}`}>
                  <button
                    className="faq-question"
                    onClick={() => setFaqOpen((open) => open.map((v, i) => (i === idx ? !v : v)))}
                    aria-expanded={faqOpen[idx]}
                  >
                    <span>{item.q}</span>
                    <svg
                      className={`faq-icon ${faqOpen[idx] ? 'rotate' : ''}`}
                      width="20" height="20" viewBox="0 0 24 24"
                      fill="none" stroke="#19c37d" strokeWidth="2.2"
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {faqOpen[idx] && <div className="faq-answer">{item.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── OTHER CITIES ── */}
        <section className="who-section" data-animate style={{ paddingBottom: '80px' }}>
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">Guides for Other Cities</h2>
              <p className="section-sub">Emergency preparedness is different in every region. Find a guide for your area.</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
              {Object.values(CITY_DATA)
                .filter((c) => c.slug !== citySlug)
                .map((c) => (
                  <Link
                    key={c.slug}
                    to={`/guide/${c.slug}`}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
                  >
                    {c.city}, {c.state} — {c.primaryHazard}
                  </Link>
                ))}
            </div>
          </div>
        </section>

      </main>
    </SiteLayout>
  )
}
