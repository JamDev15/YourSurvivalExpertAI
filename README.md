# yoursurvivalexpert.ai — Technical Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Frontend](#4-frontend)
5. [Backend](#5-backend)
6. [AI & Prompt System](#6-ai--prompt-system)
7. [Email & CRM Integration](#7-email--crm-integration)
8. [Rate Limiting & Security](#8-rate-limiting--security)
9. [Environment Variables](#9-environment-variables)
10. [Deployment](#10-deployment)

---

## 1. Project Overview

**yoursurvivalexpert.ai** is an AI-powered emergency preparedness platform. Users chat with a virtual expert (Commander Alex Reid) who collects their profile (household type, top concern, region) and then generates and emails them a fully personalized survival guide as a PDF.

**Core user flow:**
1. User lands on the home page and starts a chat
2. AI asks 3 profile questions (who, what emergency, where)
3. Once profile is complete, AI asks for the user's email
4. Backend generates a personalized PDF guide and emails it via Resend
5. User is also subscribed to the Maropost CRM list

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite), React Router v6 |
| Styling | Plain CSS (custom design system, CSS variables) |
| Backend | Python 3 / FastAPI |
| AI Model | OpenAI `gpt-4o-mini` |
| PDF Generation | ReportLab |
| Email Delivery | Resend API |
| CRM / Email List | Maropost |
| Web Server | Nginx (reverse proxy) |
| Process Manager | systemd (uvicorn) |
| Hosting | DigitalOcean Droplet |
| SSL | Let's Encrypt (Certbot) |

---

## 3. Architecture

```
Browser
  │
  ├── HTTPS → Nginx (port 443)
  │              │
  │              ├── /           → serves React dist/ (static files)
  │              └── /api/       → proxy → FastAPI (127.0.0.1:5050)
  │
  └── FastAPI (uvicorn)
         │
         ├── POST /api/chat      → OpenAI gpt-4o-mini
         └── POST /api/guide     → OpenAI gpt-4o-mini → ReportLab PDF → Resend email
                                                                       → Maropost CRM
```

**File layout:**
```
PB/
├── backend/
│   ├── main.py          # FastAPI app (all logic)
│   ├── requirements.txt
│   └── .env             # API keys (not in git)
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Router + ErrorBoundary
│   │   ├── App.css               # Full design system (~3400 lines)
│   │   ├── components/
│   │   │   ├── SiteLayout.jsx    # Header, footer, scroll-to-top button
│   │   │   └── ChatPreview.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── About.jsx
│   │   │   ├── Contact.jsx
│   │   │   ├── Privacy.jsx
│   │   │   ├── Terms.jsx
│   │   │   ├── BestGuide.jsx
│   │   │   └── CityGuide.jsx    # Dynamic: /guide/:citySlug
│   │   └── hooks/
│   │       └── useSeo.js
│   ├── public/
│   │   ├── sitemap.xml
│   │   ├── robots.txt
│   │   ├── og-image.svg
│   │   └── favicon.svg
│   └── dist/            # Built output (what gets deployed)
└── deploy.py            # One-command deploy script
```

---

## 4. Frontend

### Pages & Routes

| Route | Component | Description |
|---|---|---|
| `/` | `Home.jsx` | Hero, chat widget, FAQ, trust sections |
| `/about` | `About.jsx` | Mission, values, team |
| `/contact` | `Contact.jsx` | Contact cards and email |
| `/privacy` | `Privacy.jsx` | Privacy policy |
| `/terms` | `Terms.jsx` | Terms of service |
| `/best-emergency-preparedness-guide` | `BestGuide.jsx` | SEO landing page |
| `/guide/:citySlug` | `CityGuide.jsx` | City-specific guide pages |

### SiteLayout

`SiteLayout.jsx` wraps every page and provides:
- **Header** — brand logo, desktop nav links, mobile hamburger menu with dropdown
- **Footer** — CTA strip, navigation columns, legal links, contact email
- **Scroll-to-top button** — fixed bottom-right, with animated SVG progress ring

### Scroll-to-Top Button

The button uses an SVG `stroke-dashoffset` technique to show scroll progress:

```
radius        = 22px
circumference = 2 * π * 22  →  ~138.2px
dashOffset    = circumference - (scrollProgress / 100) * circumference
```

As the user scrolls from top (0%) to bottom (100%), `dashOffset` goes from `138.2` → `0`, drawing the green arc around the button. The button appears after 100px of scroll and is rendered **outside** the `.page` div (as a Fragment sibling) to avoid being clipped by `overflow-x: hidden`.

### CSS Design System (`App.css`)

All styles use CSS custom properties defined on `:root`:

```css
--bg:            #060e1a   /* dark navy background */
--accent:        #19c37d   /* brand green */
--text-primary:  #e8edf5
--text-muted:    #8b9cb3
--card-bg:       rgba(255,255,255,0.04)
--radius:        12px
--shadow:        0 4px 24px rgba(0,0,0,0.4)
```

Sections in order: Design Tokens → Base Reset → Animated Orbs → Header → Hero → Trust Bar → Shared Utilities → Who Section → How It Works → Chat → Geo → FAQ → Footer → About → Legal → Contact → Scroll Reveal → Keyframes → Responsive (tablet/mobile) → Reduced Motion.

### SEO

`useSeo.js` hook sets `<title>`, `<meta description>`, `<meta og:*>` tags per page. `sitemap.xml` covers all static routes + city guide pages.

---

## 5. Backend

**Entry point:** `backend/main.py`
**Server:** `uvicorn main:app --host 127.0.0.1 --port 5050`

### API Endpoints

#### `GET /`
Health check.
```json
{ "status": "ok", "app": "yoursurvivalexpert.ai" }
```

---

#### `POST /api/chat`
Powers the chat widget. Maintains the conversation and progressively fills the user profile.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "I live in Florida" }
  ],
  "profile": {
    "preparingFor": "Family or household",
    "concern": "Hurricane",
    "region": ""
  }
}
```

**Logic:**
1. IP rate limit check (20 req / 60s)
2. Off-topic message check on the last user message
3. `extract_profile_from_message()` parses the message to auto-fill missing profile fields
4. System prompt built with current profile state
5. `gpt-4o-mini` called via OpenAI SDK
6. Returns AI reply + updated profile

**Response:**
```json
{
  "reply": "...",
  "profile": { "preparingFor": "...", "concern": "...", "region": "..." }
}
```

---

#### `POST /api/guide`
Generates and emails the personalized PDF survival guide.

**Request:**
```json
{
  "email": "user@example.com",
  "profile": {
    "preparingFor": "Family or household",
    "concern": "Hurricane",
    "region": "Florida"
  }
}
```

**Logic:**
1. IP rate limit check (3 req / 60s)
2. Per-email cooldown check (1 send per email per 5 minutes)
3. `gpt-4o-mini` generates the full guide using `GUIDE_PROMPT`
4. ReportLab converts the markdown output into a styled PDF
5. Resend API emails the PDF as an attachment
6. Maropost API adds the contact to the CRM list

**Response:**
```json
{ "success": true, "message": "Guide sent to user@example.com" }
```

---

### Profile Auto-Extraction

`extract_profile_from_message()` runs regex against every user message to silently fill profile fields:

| Field | How it's detected |
|---|---|
| `preparingFor` | Household words (`family`, `kids`, `household`) or self words (`myself`, `just me`, `solo`) |
| `concern` | Emergency keywords (`hurricane`, `wildfire`, `earthquake`, `flood`, `power outage`, etc.) |
| `region` | `in/from/near <place>` patterns, US state names, country names |

---

## 6. AI & Prompt System

### Model
`gpt-4o-mini` — fast and cost-efficient, used for both chat and PDF guide generation.

### Persona: Commander Alex Reid
All responses are in-character as a senior emergency preparedness advisor with 20+ years of FEMA/Red Cross experience. Key traits:
- Warm but authoritative (not a drill sergeant)
- Always region and concern specific — never generic
- Structured markdown output (headers, numbered steps, bullets)
- Never alarmist — focuses on preparation, not fear

### Two-Phase Chat

**Phase 1 — Profile Collection**
While any of the 3 profile fields are empty, the AI asks one focused question at a time. Responses are kept to 2-3 sentences. No checklists or detailed advice until the profile is complete.

**Phase 2 — Detailed Advice**
Once all 3 fields are filled, the AI switches to full structured responses with `##` headers, numbered steps, and tailored content. It ends every complete-profile response by asking for the user's email.

### Guide Output Structure
`GUIDE_PROMPT` mandates these exact sections in the generated PDF:

1. **Overview** (3-5 sentences, regional context)
2. **Threat Assessment** (2-3 paragraphs, region-specific risks)
3. **Essential Supply Checklist** (7 sub-categories with specific quantities)
4. **Step-by-Step Action Plan** (10-15 numbered steps)
5. **72-Hour Emergency Timeline** (First Hour / First 24 Hours / 24-72 Hours)
6. **Regional Resources & Contacts** (local agencies, Red Cross, FEMA, NOAA)
7. **Final Notes from Commander Reid** (2-3 sentences of encouragement)

### Off-Topic Guard
A compiled regex (`OFF_TOPIC_SIGNALS`) blocks messages about studying, cooking, finance, relationships, coding, travel, sports, etc. If a message matches AND has no survival-related keywords, the AI refuses and redirects.

---

## 7. Email & CRM Integration

### Resend (Email Delivery)
Sends the PDF guide as an email attachment.

- **From:** `noreply@yoursurvivalexpert.ai`
- **Attachment:** Base64-encoded PDF
- **API endpoint:** `POST https://api.resend.com/emails`

### Maropost (CRM)
After guide delivery, the user is added to the email marketing list.

- **Account ID:** `1044`
- **List ID:** `306`
- **Tag ID:** `3078`

### PDF Generation (ReportLab)
The GPT-generated markdown is parsed and rendered as a styled PDF:
- Brand header with site name
- Section headers in brand green (`#19c37d`)
- Numbered and bulleted lists
- Page numbers in footer
- Delivered as `survival-guide.pdf`

---

## 8. Rate Limiting & Security

All rate limits are **in-memory** and reset on server restart:

| Target | Limit | Window |
|---|---|---|
| `/api/chat` per IP | 20 requests | 60 seconds |
| `/api/guide` per IP | 3 requests | 60 seconds |
| `/api/guide` per email | 1 delivery | 5 minutes |

**CORS** is restricted to:
- `https://yoursurvivalexpert.ai`
- `https://www.yoursurvivalexpert.ai`
- `http://localhost:5173`
- `http://localhost:3000`

**Input validation:**
- Pydantic validates all request bodies
- Profile fields max 120 characters
- Message history capped at 20 messages
- Email validated with RFC 5322 pattern + Pydantic `EmailStr`
- Off-topic signal detection before any AI call

---

## 9. Environment Variables

Create `backend/.env`:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yoursurvivalexpert.ai

MAROPOST_API_KEY=...
MAROPOST_ACCOUNT_ID=1044
MAROPOST_LIST_ID=306
MAROPOST_TAG_ID=3078
```

---

## 10. Deployment

### One-command deploy
```bash
# Step 1: build the React source into dist/
cd frontend && npm run build

# Step 2: upload and configure everything on the server
cd .. && python deploy.py
```

> The server only serves `frontend/dist/`. Changes to `.jsx` or `.css` files have no effect on the live site until you run `npm run build`.

### What `deploy.py` does

| Step | Action |
|---|---|
| 1 | SSH connect to DigitalOcean droplet (`167.71.250.96`) |
| 2 | Install system packages (nginx, python3, certbot) |
| 3 | Create `/var/www/yoursurvivalexpert/` directories |
| 4 | Upload `main.py`, `requirements.txt`, `.env` |
| 5 | Create Python venv, install pip dependencies |
| 6 | Upload `frontend/dist/` (10 files) |
| 7 | Write and start a systemd service (uvicorn) |
| 8 | Write and enable nginx config |
| 9 | Obtain/renew Let's Encrypt SSL via Certbot |
| 10 | Set up cron job for auto SSL renewal |

### Server directory layout
```
/var/www/yoursurvivalexpert/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env
│   └── venv/
└── frontend/
    ├── index.html
    ├── assets/
    │   ├── index-[hash].js
    │   └── index-[hash].css
    └── ...
```

### systemd service
File: `/etc/systemd/system/yoursurvivalexpert.service`
Command: `uvicorn main:app --host 127.0.0.1 --port 5050`
Restarts automatically on crash (`Restart=always`, `RestartSec=3`).

### Nginx config summary
- Port 80 → 301 redirect to HTTPS
- Port 443 → serves `frontend/` static files
- `/api/` → proxied to `127.0.0.1:5050`
- Static assets (`js`, `css`, `svg`, etc.) cached for 30 days

### Local development
```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 5050

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                  # http://localhost:5173
```
