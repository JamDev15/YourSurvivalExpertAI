from __future__ import annotations

import os
import re
import logging
from io import BytesIO
from typing import Any, Dict, List, Optional

import smtplib
import ssl
import requests
from email.message import EmailMessage
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, EmailStr
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.utils import simpleSplit
from reportlab.lib import colors
from reportlab.pdfgen import canvas
import re


# -------------------------------------------------
# App & Config
# -------------------------------------------------

# Load .env from backend directory
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)
logging.basicConfig(level=logging.INFO)

APP_NAME = "yoursurvivalexpert.ai"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_FROM = os.getenv("SMTP_FROM") or SMTP_USER

openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

app = FastAPI(title=APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# Constants & Prompts
# -------------------------------------------------
EXPERT_PERSONA = (
    "You are Commander Alex Reid — a senior emergency preparedness advisor with 20+ years of field experience "
    "working with FEMA, the American Red Cross, and community resilience programs across the United States. "
    "You have helped thousands of families build practical, realistic emergency plans.\n\n"

    "Your expertise covers:\n"
    "- Natural disasters: hurricanes, tornadoes, wildfires, earthquakes, floods, winter storms\n"
    "- Infrastructure failures: power grid outages, water disruptions, supply chain breakdowns\n"
    "- Civil emergencies: evacuations, shelter-in-place scenarios, communication blackouts\n"
    "- Medical preparedness: first aid, medication management, special needs planning\n\n"

    "Your communication style is:\n"
    "- Authoritative but warm — like a trusted expert, not a drill sergeant\n"
    "- Clear and structured — you use headers, numbered steps, and bullet points\n"
    "- Regionally specific — you always tailor advice to the user's location and risks\n"
    "- Confidence-building — you reduce anxiety by giving people concrete, actionable steps\n"
    "- Never alarmist — you focus on preparation, not fear\n"
)

PROFILE_TEMPLATE: Dict[str, str] = {
    "preparingFor": "",
    "concern": "",
    "region": "",
}

QUESTION_ORDER = [
    ("preparingFor", "Who are you preparing for — yourself or a household/family?"),
    ("concern", "What situation are you most concerned about?"),
    ("region", "What general region are you in?"),
]


CHAT_PROMPT = (
    f"{EXPERT_PERSONA}\n\n"

    "You are Commander Alex Reid. Respond in character at all times.\n\n"

    "PHASE 1 — PROFILE COLLECTION (when any of preparingFor, concern, or region are missing):\n"
    "- Ask ONE missing question at a time, warmly and professionally.\n"
    "- Keep each response SHORT: 2-3 sentences maximum.\n"
    "- Never repeat a question already answered.\n"
    "- Never provide detailed survival advice until the profile is complete.\n"
    "- Do not generate checklists, headers, or long responses during profile collection.\n"
    "- Do NOT use fear-based language.\n\n"

    "PHASE 2 — DETAILED ADVICE (when all fields are collected and user asks follow-up questions):\n"
    "- Give DETAILED, FORMATTED responses using markdown-style structure.\n"
    "- Use ## for main section headers (e.g., ## Immediate Priorities).\n"
    "- Use ### for sub-section headers.\n"
    "- Use **bold** for emphasis on critical points.\n"
    "- Use numbered lists for step-by-step actions.\n"
    "- Use - for bullet points.\n"
    "- Never be generic — always reference the user's specific region, concern, and household.\n"
    "- Responses should be long, thorough, and well-organized into sections.\n\n"

    "CONVERSATION GOAL:\n"
    "Collect these fields:\n"
    "- preparingFor (self or household)\n"
    "- concern (type of emergency)\n"
    "- region (country or general location)\n\n"

    "When all 3 fields are collected:\n"
    "Briefly summarize what the user is preparing for in 1 sentence.\n"
    "Then say EXACTLY:\n"
    "Ready for your personalized survival guide? Reply with your email address and I'll send it to you."
)

GUIDE_PROMPT = (
    f"{EXPERT_PERSONA}\n\n"

    "You are generating a deeply detailed, well-structured personalized survival guide. "
    "The guide must be specific to the user's region, concern, and household composition. "
    "Never produce generic advice — every section must reflect real regional risks, realistic quantities, and actionable steps.\n\n"

    "STRICT OUTPUT FORMAT — produce ALL of the following sections in this EXACT order:\n\n"

    "## Overview\n"
    "[Write 3-5 sentences: describe the regional context, what the specific threat involves, who is being prepared for, "
    "and close with a tone of empowerment — remind the reader that preparation equals confidence.]\n\n"

    "## Threat Assessment: [Emergency Type] in [Region]\n"
    "[Write 2-3 paragraphs: cover the specific risks of this emergency in this region, relevant seasonal factors, "
    "typical duration and impact, and any historical context or notable events if relevant.]\n\n"

    "## Essential Supply Checklist\n"
    "[Use the following sub-categories. Number each item within its category. Be specific with quantities.]\n\n"
    "### Water & Hydration\n"
    "[At minimum: 1 gallon of water per person per day for 3 days minimum. List containers, purification, etc.]\n\n"
    "### Food & Nutrition\n"
    "[Non-perishable foods specific to household size and concern. Include calorie targets if relevant.]\n\n"
    "### Power & Lighting\n"
    "[Batteries, flashlights, power banks, generators, solar options — specific to the emergency type.]\n\n"
    "### Communication & Navigation\n"
    "[NOAA weather radio, hand-crank radio, maps, backup phone chargers, emergency contacts list.]\n\n"
    "### First Aid & Medical\n"
    "[Complete first aid kit contents, prescription medications (30-day supply), special needs items.]\n\n"
    "### Documents & Financial\n"
    "[Copies of IDs, insurance docs, cash in small bills, USB drive with digital copies.]\n\n"
    "### [Emergency-Specific Category]\n"
    "[Add one category specific to the emergency type — e.g., 'Evacuation Kit' for hurricane, "
    "'Warmth & Shelter' for winter storm, 'Fire Escape Tools' for wildfire, 'Seismic Safety' for earthquake.]\n\n"

    "## Step-by-Step Action Plan\n"
    "[Provide 10-15 numbered steps, ordered by priority. Each step must include a brief explanation of why it matters. "
    "Steps should be achievable within days to weeks.]\n\n"

    "## 72-Hour Emergency Timeline\n"
    "[Format as three stages:]\n"
    "### First Hour\n"
    "[Immediate actions to take when the emergency begins or warning is issued.]\n"
    "### First 24 Hours\n"
    "[Stabilization actions: shelter, communication, resource check.]\n"
    "### 24–72 Hours\n"
    "[Sustained response: rationing, monitoring conditions, family coordination, when to evacuate vs. shelter.]\n\n"

    "## Regional Resources & Contacts\n"
    "[List resources specific to the user's region: local emergency management agency, nearest Red Cross chapter, "
    "FEMA regional office, NOAA weather forecast office, local emergency alert system (e.g., Wireless Emergency Alerts, "
    "county notification systems), and any region-specific hotlines.]\n\n"

    "## Final Notes from Commander Reid\n"
    "[Write 2-3 sentences of encouragement. Reinforce that the act of preparing is itself an act of strength and love "
    "for one's family. Remind the reader that preparation equals confidence, not fear.]\n\n"

    "RULES:\n"
    "- Every section listed above MUST be present in the output.\n"
    "- Content must be SPECIFIC to the user's region and concern — never generic.\n"
    "- Quantities must be realistic and specific (e.g., '1 gallon of water per person per day for 3 days minimum').\n"
    "- Each checklist item must be on its own line.\n"
    "- Use ## for main sections, ### for sub-sections.\n"
    "- Do NOT include greetings, marketing language, or calls to action.\n"
    "- Return ONLY the guide content."
)

SITE_CONTEXT = (
    "The Ready Network focuses on protecting families, equipping households, and empowering people with practical skills. "
    "It emphasizes preparedness training (e.g., bug-out bag basics, gardening for resilience, and general readiness), "
    "responsible self-protection, and confidence through clear, structured guidance. "
    "The tone is supportive and capability-building, not alarmist."
)

READY_NETWORK_URL = "https://thereadynetwork.us/?s=Creating+Your+Family+Emergency+Plan"

# -------------------------------------------------
# Models
# -------------------------------------------------

class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message] = []
    profile: Dict[str, str] = {}


class GuideRequest(BaseModel):
    email: EmailStr
    profile: Dict[str, str] = {}

# -------------------------------------------------
# Helpers
# -------------------------------------------------

def normalize_profile(profile: Optional[Dict[str, str]]) -> Dict[str, str]:
    merged = PROFILE_TEMPLATE.copy()
    if profile:
        merged.update({k: v for k, v in profile.items() if v})
    return merged


def extract_profile_from_message(profile: Dict[str, str], message: Optional[str]) -> Dict[str, str]:
    if not message:
        return profile

    updated = profile.copy()
    lower = message.lower()
    is_question = "?" in message
    greeting_terms = {
        "hi",
        "hello",
        "hey",
        "yo",
        "thanks",
        "thank you",
        "ok",
        "okay",
    }

    if not updated["preparingFor"]:
        if re.search(r"\b(family|kids|children|household|partner|spouse)\b", lower):
            updated["preparingFor"] = "Family or household"
        elif re.search(r"\b(myself|yourself|self|just me|solo|single|only me|for me|me)\b", lower):
            updated["preparingFor"] = "Myself"

    if not updated["concern"]:
        cleaned = re.sub(r"[^a-z\s-]", "", lower).strip()
        has_generic_question = re.search(r"\b(what|which|choices|options)\b", lower)
        if 3 <= len(cleaned) <= 40 and not is_question and not has_generic_question:
            updated["concern"] = message.strip()

    if not updated["region"]:
        region_match = re.search(r"\b(?:in|from|near)\s+([A-Za-z\s]{2,40})", message, re.IGNORECASE)
        if region_match:
            updated["region"] = region_match.group(1).strip()

    if not updated["region"]:
        normalized = re.sub(r"[^a-z\s]", "", lower).strip()
        common_regions = {
            "us": "United States",
            "usa": "United States",
            "united states": "United States",
            "united states of america": "United States",
            "uk": "United Kingdom",
            "united kingdom": "United Kingdom",
            "canada": "Canada",
            "australia": "Australia",
        }
        if normalized in common_regions:
            updated["region"] = common_regions[normalized]
        else:
            is_short_region = 3 <= len(normalized) <= 40 and re.fullmatch(r"[a-z\s]+", normalized)
            is_not_other_field = not re.search(
                r"\b(family|kids|children|household|partner|spouse|myself|self|solo|single|only me|beginner|intermediate|advanced)\b",
                lower,
            )
            is_not_greeting = normalized not in greeting_terms
            if is_short_region and is_not_other_field and is_not_greeting:
                updated["region"] = message.strip()

    return updated


def get_missing_fields(profile: Dict[str, str]) -> List[str]:
    return [key for key, _ in QUESTION_ORDER if not profile.get(key)]


def validate_email(email: str) -> bool:
    """Validate email format."""
    if not email or not isinstance(email, str):
        return False

    # RFC 5322 simplified email validation
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    if not re.match(email_regex, email):
        return False

    local_part, domain = email.rsplit('@', 1)

    # Check local part
    if not local_part or len(local_part) > 64:
        return False
    if local_part.startswith('.') or local_part.endswith('.') or '..' in local_part:
        return False

    # Check domain
    if len(domain) < 3 or not re.match(r'^\w+(\.\w+)*\.\w{2,}$', domain):
        return False
    if domain.startswith('-') or domain.endswith('-'):
        return False

    return True


def detect_email_in_message(message: str) -> Optional[str]:
    """Extract email address from message if present."""
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    match = re.search(email_pattern, message)
    return match.group(0) if match else None


def detect_email_candidate(message: str) -> Optional[str]:
    """Extract email-like token (including malformed) for validation feedback."""
    candidate_pattern = r'\b[^\s@]+@[^\s]+\b'
    match = re.search(candidate_pattern, message)
    return match.group(0) if match else None


def build_chat_reply(profile: Dict[str, str], missing: List[str]) -> str:
    if not missing:
        return (
            "Thanks — I have what I need. "
            "If you'd like, I can generate a personalized preparedness guide and email it to you."
        )
    return dict(QUESTION_ORDER)[missing[0]]


def call_openai(messages: List[Dict[str, str]]) -> Optional[str]:
    if not openai_client:
        return None
    try:
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            temperature=0.4,
            messages=messages,
            timeout=30
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logging.warning(f"OpenAI error: {e}")
        return None


def fetch_guide_content_from_url(url: str) -> str:
    """Fetch and extract text content from a URL."""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        # Simple text extraction: remove HTML tags and clean up
        import re as regex
        text = response.text
        # Remove script and style content
        text = regex.sub(r'<script[^>]*>.*?</script>', '', text, flags=regex.DOTALL)
        text = regex.sub(r'<style[^>]*>.*?</style>', '', text, flags=regex.DOTALL)
        # Remove HTML tags
        text = regex.sub(r'<[^>]+>', '\n', text)
        # Clean up whitespace
        text = regex.sub(r'\n\s*\n', '\n\n', text)
        text = '\n'.join(line.strip() for line in text.split('\n') if line.strip())
        # Return first 3000 characters to keep it concise
        return text[:3000]
    except Exception as e:
        logging.warning(f"Failed to fetch URL content: {e}")
        return ""


def build_guide_text(profile: Dict[str, str]) -> str:
    fallback = (
        "Overview\n"
        f"You are preparing for {profile['preparingFor']} in {profile['region']}.\n\n"
        "Checklist\n"
        "- Secure water and food supplies\n"
        "- Prepare lighting and power backups\n"
        "- Establish a communication plan\n"
        "- Review local alerts\n\n"
        "Next Steps\n"
        "Start with essentials and expand gradually."
    )

    # Fetch reference content from The Ready Network
    reference_content = fetch_guide_content_from_url(READY_NETWORK_URL)
    reference_section = f"\nReference material from The Ready Network:\n{reference_content}" if reference_content else ""

    messages = [
        {
            "role": "system",
            "content": f"{GUIDE_PROMPT}\n\nSite context:\n{SITE_CONTEXT}{reference_section}",
        },
        {"role": "user", "content": f"User profile:\n{str(profile)}\n\nGenerate a personalized guide based on this profile and the reference material."},
    ]

    return call_openai(messages) or fallback

def force_numbered_newlines(text: str) -> str:
    # Insert newline before each numbered item except the first
    text = re.sub(r"\s*(\d+\.\s)", r"\n\1", text)
    # Remove leading newline if added
    return text.strip()

# -------------------------------------------------
# PDF & Email
# -------------------------------------------------

def create_pdf(title: str, body: str, profile: Dict[str, str]) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    left_margin = 0.85 * inch
    right_margin = 0.85 * inch
    top_margin = 0.75 * inch
    bottom_margin = 0.75 * inch
    content_width = width - left_margin - right_margin
    line_height = 0.19 * inch

    # Color palette
    COLOR_BG = colors.HexColor("#060e1a")
    COLOR_COVER_BG = colors.HexColor("#0a1f14")
    COLOR_GREEN = colors.HexColor("#19c37d")
    COLOR_BODY_TEXT = colors.HexColor("#c8d4c0")
    COLOR_SUBHEADER = colors.HexColor("#e8f0e8")
    COLOR_DIVIDER = colors.HexColor("#1e3a2a")
    COLOR_GRAY = colors.HexColor("#8a9a8a")
    COLOR_WHITE = colors.HexColor("#ffffff")
    COLOR_PROFILE_BG = colors.HexColor("#0d1f12")

    page_number = [0]  # mutable for closure

    # ------------------------------------------------------------------
    # COVER PAGE
    # ------------------------------------------------------------------
    # Dark cover background
    pdf.setFillColor(COLOR_COVER_BG)
    pdf.rect(0, 0, width, height, fill=1, stroke=0)

    # Top accent line
    pdf.setStrokeColor(COLOR_GREEN)
    pdf.setLineWidth(3)
    pdf.line(left_margin, height - 0.6 * inch, width - right_margin, height - 0.6 * inch)

    # Main title
    cover_title = "PERSONALIZED SURVIVAL GUIDE"
    pdf.setFont("Helvetica-Bold", 28)
    pdf.setFillColor(COLOR_WHITE)
    tw = pdf.stringWidth(cover_title, "Helvetica-Bold", 28)
    pdf.drawString((width - tw) / 2, height / 2 + 1.1 * inch, cover_title)

    # Subtitle: concern + region
    concern_val = profile.get("concern", "Emergency Preparedness")
    region_val = profile.get("region", "Your Region")
    subtitle = f"{concern_val}  |  {region_val}"
    pdf.setFont("Helvetica-Bold", 16)
    pdf.setFillColor(COLOR_GREEN)
    sw = pdf.stringWidth(subtitle, "Helvetica-Bold", 16)
    pdf.drawString((width - sw) / 2, height / 2 + 0.65 * inch, subtitle)

    # Horizontal accent line below subtitle
    pdf.setStrokeColor(COLOR_GREEN)
    pdf.setLineWidth(1.5)
    line_x1 = (width / 2) - 1.5 * inch
    line_x2 = (width / 2) + 1.5 * inch
    pdf.line(line_x1, height / 2 + 0.45 * inch, line_x2, height / 2 + 0.45 * inch)

    # Prepared for
    preparing_val = profile.get("preparingFor", "")
    if preparing_val:
        prep_text = f"Prepared for: {preparing_val}"
        pdf.setFont("Helvetica", 12)
        pdf.setFillColor(COLOR_GRAY)
        ptw = pdf.stringWidth(prep_text, "Helvetica", 12)
        pdf.drawString((width - ptw) / 2, height / 2 + 0.15 * inch, prep_text)

    # Generation date
    from datetime import date as _date
    date_text = f"Generated: {_date.today().strftime('%B %d, %Y')}"
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(COLOR_GRAY)
    dtw = pdf.stringWidth(date_text, "Helvetica", 10)
    pdf.drawString((width - dtw) / 2, height / 2 - 0.15 * inch, date_text)

    # Bottom branding
    brand = "yoursurvivalexpert.ai"
    pdf.setFont("Helvetica-Bold", 11)
    pdf.setFillColor(COLOR_GREEN)
    bw = pdf.stringWidth(brand, "Helvetica-Bold", 11)
    pdf.drawString((width - bw) / 2, 0.6 * inch, brand)

    # Bottom accent line
    pdf.setStrokeColor(COLOR_GREEN)
    pdf.setLineWidth(2)
    pdf.line(left_margin, 0.45 * inch, width - right_margin, 0.45 * inch)

    pdf.showPage()

    # ------------------------------------------------------------------
    # Helper: draw page background + header + footer
    # ------------------------------------------------------------------
    def start_content_page() -> float:
        """Draw bg, header, footer frame. Returns starting y for content."""
        page_number[0] += 1

        # Page background
        pdf.setFillColor(COLOR_BG)
        pdf.rect(0, 0, width, height, fill=1, stroke=0)

        # Header line
        pdf.setStrokeColor(COLOR_GREEN)
        pdf.setLineWidth(1)
        header_line_y = height - 0.5 * inch
        pdf.line(left_margin, header_line_y, width - right_margin, header_line_y)

        # Header text
        pdf.setFont("Helvetica", 8)
        pdf.setFillColor(COLOR_GRAY)
        pdf.drawString(left_margin, height - 0.42 * inch, "SURVIVAL GUIDE")
        brand_w = pdf.stringWidth("yoursurvivalexpert.ai", "Helvetica", 8)
        pdf.drawString(width - right_margin - brand_w, height - 0.42 * inch, "yoursurvivalexpert.ai")

        # Footer line
        footer_line_y = bottom_margin + 0.25 * inch
        pdf.setStrokeColor(COLOR_DIVIDER)
        pdf.setLineWidth(0.5)
        pdf.line(left_margin, footer_line_y, width - right_margin, footer_line_y)

        # Footer page number
        pg_text = f"Page {page_number[0]}"
        pdf.setFont("Helvetica", 8)
        pdf.setFillColor(COLOR_GRAY)
        pgw = pdf.stringWidth(pg_text, "Helvetica", 8)
        pdf.drawString((width - pgw) / 2, bottom_margin + 0.08 * inch, pg_text)

        return height - 0.8 * inch

    # ------------------------------------------------------------------
    # Helper: new content page
    # ------------------------------------------------------------------
    y_ref = [0.0]

    def new_page() -> None:
        pdf.showPage()
        y_ref[0] = start_content_page()

    def ensure_space(lines_needed: int = 1) -> None:
        needed_height = max(lines_needed, 1) * line_height + 0.1 * inch
        if y_ref[0] - needed_height < bottom_margin + 0.5 * inch:
            new_page()

    # ------------------------------------------------------------------
    # First content page
    # ------------------------------------------------------------------
    y_ref[0] = start_content_page()
    y = y_ref[0]

    # Profile summary box
    box_padding = 0.15 * inch
    box_height = 1.05 * inch
    box_y = y - box_height
    pdf.setFillColor(COLOR_PROFILE_BG)
    pdf.setStrokeColor(COLOR_GREEN)
    pdf.setLineWidth(1)
    pdf.rect(left_margin, box_y, content_width, box_height, fill=1, stroke=1)

    # Profile box title
    pdf.setFont("Helvetica-Bold", 9)
    pdf.setFillColor(COLOR_GREEN)
    pdf.drawString(left_margin + box_padding, y - box_padding - 0.02 * inch, "YOUR PREPAREDNESS PROFILE")

    # Profile rows
    profile_display = [
        ("Preparing For", profile.get("preparingFor", "—")),
        ("Primary Concern", profile.get("concern", "—")),
        ("Region", profile.get("region", "—")),
    ]
    row_y = y - box_padding - 0.18 * inch
    for label, value in profile_display:
        pdf.setFont("Helvetica-Bold", 8)
        pdf.setFillColor(COLOR_GREEN)
        pdf.drawString(left_margin + box_padding, row_y, f"{label}:")
        label_w = pdf.stringWidth(f"{label}:", "Helvetica-Bold", 8)
        pdf.setFont("Helvetica", 8)
        pdf.setFillColor(COLOR_BODY_TEXT)
        pdf.drawString(left_margin + box_padding + label_w + 4, row_y, value)
        row_y -= 0.22 * inch

    y = box_y - 0.3 * inch
    y_ref[0] = y

    # ------------------------------------------------------------------
    # Body text rendering
    # ------------------------------------------------------------------
    for raw_line in body.splitlines():
        clean_line = raw_line.strip()
        y = y_ref[0]

        # Empty line -> small gap
        if not clean_line:
            y_ref[0] -= 0.08 * inch
            if y_ref[0] < bottom_margin + 0.5 * inch:
                new_page()
            continue

        # Section header: ## Title
        if clean_line.startswith("## "):
            display_text = clean_line[3:].strip()
            ensure_space(3)
            y = y_ref[0]
            y -= 0.12 * inch  # spacing before header
            pdf.setFont("Helvetica-Bold", 14)
            pdf.setFillColor(COLOR_GREEN)
            pdf.drawString(left_margin, y, display_text)
            y -= 0.2 * inch
            # Underline
            line_w = min(pdf.stringWidth(display_text, "Helvetica-Bold", 14) + 0.1 * inch, content_width)
            pdf.setStrokeColor(COLOR_GREEN)
            pdf.setLineWidth(0.75)
            pdf.line(left_margin, y, left_margin + line_w, y)
            y -= 0.14 * inch
            y_ref[0] = y
            continue

        # Sub-section header: ### Title
        if clean_line.startswith("### "):
            display_text = clean_line[4:].strip()
            ensure_space(2)
            y = y_ref[0]
            y -= 0.08 * inch
            pdf.setFont("Helvetica-Bold", 11)
            pdf.setFillColor(COLOR_SUBHEADER)
            pdf.drawString(left_margin, y, display_text)
            y -= 0.18 * inch
            y_ref[0] = y
            continue

        # Numbered item: "1. text", "12. text"
        numbered_match = re.match(r'^(\d+)\.\s+(.+)$', clean_line)
        if numbered_match:
            num_str = numbered_match.group(1)
            item_text = numbered_match.group(2)
            # Strip inline bold markers for plain rendering
            item_text = re.sub(r'\*\*(.+?)\*\*', r'\1', item_text)
            wrapped = simpleSplit(item_text, "Helvetica", 10, content_width - 0.45 * inch)
            ensure_space(len(wrapped) + 1)
            y = y_ref[0]
            # Draw number badge
            badge_x = left_margin
            badge_y = y - 0.01 * inch
            pdf.setFillColor(COLOR_GREEN)
            pdf.setFont("Helvetica-Bold", 8)
            num_w = pdf.stringWidth(num_str, "Helvetica-Bold", 8) + 6
            pdf.rect(badge_x, badge_y - 0.01 * inch, num_w, 0.16 * inch, fill=1, stroke=0)
            pdf.setFillColor(COLOR_BG)
            pdf.drawString(badge_x + 3, badge_y + 0.02 * inch, num_str)
            # Draw item text
            text_x = left_margin + num_w + 4
            text_width_avail = content_width - num_w - 4
            wrapped = simpleSplit(item_text, "Helvetica", 10, text_width_avail)
            pdf.setFont("Helvetica", 10)
            pdf.setFillColor(COLOR_BODY_TEXT)
            for idx, seg in enumerate(wrapped):
                draw_x = text_x if idx == 0 else left_margin + 0.35 * inch
                pdf.drawString(draw_x, y, seg)
                y -= line_height
            y -= 0.03 * inch
            y_ref[0] = y
            continue

        # Bullet item: "- text" or "• text"
        if clean_line.startswith("- ") or clean_line.startswith("• "):
            display_text = clean_line.lstrip("-•").strip()
            display_text = re.sub(r'\*\*(.+?)\*\*', r'\1', display_text)
            wrapped = simpleSplit(display_text, "Helvetica", 10, content_width - 0.3 * inch)
            ensure_space(len(wrapped) + 1)
            y = y_ref[0]
            # Green bullet dot
            pdf.setFillColor(COLOR_GREEN)
            pdf.circle(left_margin + 0.06 * inch, y + 0.04 * inch, 0.03 * inch, fill=1, stroke=0)
            pdf.setFont("Helvetica", 10)
            pdf.setFillColor(COLOR_BODY_TEXT)
            for idx, seg in enumerate(wrapped):
                draw_x = left_margin + 0.18 * inch if idx == 0 else left_margin + 0.18 * inch
                pdf.drawString(draw_x, y, seg)
                y -= line_height
            y -= 0.02 * inch
            y_ref[0] = y
            continue

        # Bold line: **text** (whole line bold)
        if clean_line.startswith("**") and clean_line.endswith("**") and len(clean_line) > 4:
            display_text = clean_line[2:-2].strip()
            wrapped = simpleSplit(display_text, "Helvetica-Bold", 10, content_width)
            ensure_space(len(wrapped) + 1)
            y = y_ref[0]
            pdf.setFont("Helvetica-Bold", 10)
            pdf.setFillColor(COLOR_WHITE)
            for seg in wrapped:
                pdf.drawString(left_margin, y, seg)
                y -= line_height
            y_ref[0] = y
            continue

        # Regular text — strip inline bold markers for plain rendering
        display_text = re.sub(r'\*\*(.+?)\*\*', r'\1', clean_line)
        wrapped = simpleSplit(display_text, "Helvetica", 10, content_width)
        ensure_space(len(wrapped) + 1)
        y = y_ref[0]
        pdf.setFont("Helvetica", 10)
        pdf.setFillColor(COLOR_BODY_TEXT)
        for seg in wrapped:
            pdf.drawString(left_margin, y, seg)
            y -= line_height
        y_ref[0] = y

    pdf.save()
    buffer.seek(0)
    return buffer.read()


def send_email(email: str, pdf_bytes: bytes) -> None:
    if not SMTP_USER or not SMTP_PASS or not SMTP_FROM:
        logging.warning("SMTP not configured.")
        return

    message = EmailMessage()
    message["From"] = SMTP_FROM
    message["To"] = email
    message["Subject"] = "Your Personalized Survival Guide — yoursurvivalexpert.ai"
    message.set_content(
        "Hello,\n\n"
        "Thank you for using yoursurvivalexpert.ai. Your personalized survival guide is attached to this email as a PDF.\n\n"
        "Your guide has been tailored specifically to your household, region, and primary concern. "
        "Inside you will find a detailed threat assessment, a categorized supply checklist, a step-by-step action plan, "
        "a 72-hour emergency timeline, and regional resources to help you get started immediately.\n\n"
        "We recommend printing a copy and keeping it with your emergency supplies.\n\n"
        "Stay prepared,\n"
        "Commander Alex Reid\n"
        "yoursurvivalexpert.ai\n"
    )
    message.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename="survival-guide.pdf",
    )

    context = ssl.create_default_context()
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls(context=context)
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(message)

def build_supply_list(profile: Dict[str, str]) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                f"{EXPERT_PERSONA}\n\n"
                "You are generating a categorized emergency supply list tailored to the user's specific region, concern, and household.\n\n"
                "STRICT OUTPUT FORMAT:\n"
                "- Organize supplies into categories using ### Category Name headers.\n"
                "- Number each item within its category (restart numbering at 1 for each category).\n"
                "- Include specific quantities where applicable (e.g., '1 gallon of water per person per day for 3 days').\n"
                "- Items must be specific to the emergency type and region — never generic.\n"
                "- Each item must be on its own line.\n"
                "- No paragraphs, no explanations beyond the item itself.\n"
                "- No greetings, no closings, no calls to action.\n\n"
                "Categories to include (adapt as needed for the emergency type):\n"
                "### Water & Hydration\n"
                "### Food & Nutrition\n"
                "### Power & Lighting\n"
                "### Communication & Navigation\n"
                "### First Aid & Medical\n"
                "### Documents & Financial\n"
                "### [Emergency-Specific Category based on user concern]\n"
            ),
        },
        {
            "role": "user",
            "content": f"User profile: {profile}\nGenerate the categorized supply list only.",
        },
    ]
    return call_openai(messages) or ""

# -------------------------------------------------
# Routes
# -------------------------------------------------

@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/chat")
@app.post("/chat")
def chat(req: ChatRequest):
    profile = normalize_profile(req.profile)
    # Extract profile from all user messages for better context retention
    for m in req.messages:
        if m.role == "user":
            profile = extract_profile_from_message(profile, m.content)
    missing = get_missing_fields(profile)
    latest_user = next((m for m in reversed(req.messages) if m.role == "user"), None)
    latest_text = latest_user.content if latest_user else ""

    # OVERRIDE: If user requests immediate supply list, skip profile questions
    # immediate_phrases = [
    #     "just give me now", "give me list", "give me supplies", "give me checklist", "give me items", "give me what to store", "just list", "just checklist", "just items", "just supplies"
    # ]
    def extract_numbered_list(text: str) -> str:
        import re
        lines = text.splitlines()
        numbered_lines = [line.strip() for line in lines if re.match(r"^\d+\. ", line.strip())]
        # If the model returns the list in a single paragraph, split by ' N. '
        if not numbered_lines and re.search(r"\d+\. ", text):
            numbered_lines = re.findall(r"\d+\. [^\n]+", text)
        return "\n".join(numbered_lines)

    def extract_numbered_items(text: str) -> list[str]:
        # Improved regex: splits items even if compressed, each on its own line
        items = re.findall(r"\d+\.\s.*?(?=\n?\d+\.|$)", text, re.S)
        return [item.strip() for item in items]

    def needs_supply_list(text: str) -> bool:
        keywords = ["what should i store", "what should i prepare", "supply list", "emergency supplies", "give me list", "give me supplies", "checklist", "items to store", "items to prepare", "just give me now", "just list", "just checklist", "just items", "just supplies"]
        return any(k in text.lower() for k in keywords)

    if latest_text and needs_supply_list(latest_text):
        print("[OpenAI] Calling OpenAI for supply list (reference-based)...")
        supply_list = build_supply_list(profile)
        items = extract_numbered_items(supply_list)
        # Return string for frontend compatibility
        return {
            "reply": "\n".join(items),
            "profile": profile,
            "readyForEmail": not missing,
        }

    if latest_text:
        email_candidate = detect_email_candidate(latest_text)
        if email_candidate and not validate_email(email_candidate):
            next_question = dict(QUESTION_ORDER)[missing[0]] if missing else None
            extra = f" {next_question}" if next_question else ""
            return {
                "reply": (
                    f"'{email_candidate}' is not a valid email format. "
                    "Please provide a correct email like name@example.com."
                    f"{extra}"
                ),
                "profile": profile,
                "readyForEmail": not missing,
            }

    if latest_text:
        detected_email = detect_email_in_message(latest_text)
        if detected_email and missing:
            return {
                "reply": (
                    "Thanks. I will collect your email after we finish your profile. "
                    f"{dict(QUESTION_ORDER)[missing[0]]}"
                ),
                "profile": profile,
                "readyForEmail": False,
            }
        if detected_email and not missing:
            return {
                "reply": (
                    "That email format looks valid. Please enter it in the email field below "
                    "and click 'Send my guide'."
                ),
                "profile": profile,
                "readyForEmail": True,
            }

    # Switch prompt logic: if all profile fields are filled, use advice/guide mode
    if not missing:
        guide_messages = [
            {
                "role": "system",
                "content": GUIDE_PROMPT,
            },
            {
                "role": "user",
                "content": (
                    f"Create a personalized survival preparedness guide.\n\n"
                    f"Preparing for: {profile['preparingFor']}\n"
                    f"Primary concern: {profile['concern']}\n"
                    f"Region: {profile['region']}\n\n"
                    "Generate a guide tailored to this situation."
                )
            },
            *[m.dict() for m in req.messages[-10:]],
        ]
        print("[OpenAI] Calling OpenAI for advice/guide mode...")
        ai_reply = call_openai(guide_messages)
        reply = ai_reply or "Let me know if you need more details or want your guide emailed."
        return {
            "reply": reply,
            "profile": profile,
            "readyForEmail": True,
        }
    else:
        messages = [
            {
                "role": "system",
                "content": (
                    f"{CHAT_PROMPT}\n\nSite context:\n{SITE_CONTEXT}\n\n"
                    f"Known profile: {profile}\nMissing: {missing}"
                ),
            },
            *[m.dict() for m in req.messages[-10:]],
        ]
        print("[OpenAI] Calling OpenAI for chat endpoint...")
        ai_reply = call_openai(messages)
        if missing and ai_reply and re.search(r"\bemail\b", ai_reply, re.IGNORECASE):
            reply = build_chat_reply(profile, missing)
        else:
            reply = ai_reply or build_chat_reply(profile, missing)
        return {
            "reply": reply,
            "profile": profile,
            "readyForEmail": not missing,
        }


@app.post("/api/guide")
@app.post("/guide")

def guide(req: GuideRequest):
    profile = normalize_profile(req.profile)
    print("[OpenAI] Calling OpenAI for guide endpoint...")
    text = build_guide_text(profile)
    pdf = create_pdf("Personalized Survival Guide", text, profile)
    send_email(req.email, pdf)
    return {"ok": True}
