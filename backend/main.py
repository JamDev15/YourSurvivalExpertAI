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
    "You are a survival preparedness advisor with 15+ years of experience "
    "helping families prepare for real-world emergencies such as storms, "
    "power outages, supply disruptions, and evacuations.\n\n"

    "Your approach focuses on practical household preparedness, not extreme survivalism.\n"
    "Your recommendations follow common preparedness principles used by FEMA, "
    "Red Cross guidance, and community resilience training.\n\n"

    "You help normal families prepare calmly and confidently using realistic steps."
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

    "Tone guidelines:\n"
    "- Calm\n"
    "- Practical\n"
    "- Clear\n"
    "- Confidence-building\n\n"


    "Advice rules:\n"
    "Avoid generic survival advice that applies to all emergencies.\n"
    "Advice must adapt to the user's concern and region.\n\n"
    "Your job is to help users build a personalized preparedness plan.\n"
    "You must guide the conversation step-by-step and collect information before giving detailed advice.\n\n"

    "STRICT RULES:\n"
    "1. Ask one question at a time.\n"
    "2. Only ask for missing fields: preparingFor, concern, region.\n"
    "3. Never repeat a question if the information is already provided.\n"
    "4. Do NOT generate a full survival checklist yet.\n"
    "5. Keep responses short, calm, and supportive.\n"
    "6. Do NOT use fear-based language.\n"
    "7. Never provide a full preparedness checklist until all required profile fields are collected.\n\n"

    "Conversation Goal:\n"
    "Collect these fields:\n"
    "- preparingFor (self or household)\n"
    "- concern (type of emergency)\n"
    "- region (country or general location)\n\n"

    "When information is missing:\n"
    "Ask the next question from the list.\n\n"

    "When all 3 fields are collected:\n"
    "Briefly summarize what the user is preparing for in 1 sentence.\n"
    "Then say exactly:\n"
    "Ready for your personalized survival guide? Reply with your email address and I'll send it to you."
)

GUIDE_PROMPT = (
    f"{EXPERT_PERSONA}\n\n"

    "Tone guidelines:\n"
    "- Calm\n"
    "- Practical\n"
    "- Clear\n"
    "- Confidence-building\n\n"
    "STRICT OUTPUT FORMAT:\n"
    "Your response must contain ONLY these three sections in this exact order:\n"
    "1) Short Overview\n"
    "2) Numbered Preparedness Checklist\n"
    "3) Practical Next Steps\n\n"

    "OVERVIEW RULES:\n"
    "- Write 2–4 sentences.\n"
    "- Reference the user's region.\n"
    "- Reference the user's concern or emergency type.\n"
    "- Reference who they are preparing for.\n"
    "- Tone must be calm, practical, and empowering.\n"
    "- Avoid fear-based language.\n\n"

    "CHECKLIST RULES:\n"
    "- Use a numbered list.\n"
    "- Each item must be on its own line.\n"
    "- Do not combine items.\n"
    "- Quantities must be realistic.\n"
    "- Adapt the list to the user's emergency type and region.\n\n"

    "Examples:\n"
    "If the concern is gas shortage: include fuel planning, transportation alternatives, supply chain disruption preparation.\n"
    "If the concern is hurricane: include evacuation planning and waterproofing supplies.\n"
    "If winter storm: include cold weather preparation.\n\n"

    "NEXT STEPS RULES:\n"
    "- Use dash bullet points.\n"
    "- Each step must be on its own line.\n"
    "- Focus on simple actions the user can take within a few days.\n\n"

    "Do NOT include greetings, marketing language, or calls to action.\n"
    "Return ONLY the three sections."
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

    left_margin = inch
    right_margin = inch
    top_margin = 0.75 * inch
    bottom_margin = 0.75 * inch
    content_width = width - left_margin - right_margin
    line_height = 0.2 * inch
    y = height - top_margin

    def new_page() -> None:
        nonlocal y
        pdf.showPage()
        pdf.setFont("Helvetica", 11)
        y = height - top_margin

    def ensure_space(lines_needed: int = 1) -> None:
        nonlocal y
        needed_height = max(lines_needed, 1) * line_height
        if y - needed_height < bottom_margin:
            new_page()

    pdf.setFont("Helvetica-Bold", 24)
    pdf.setFillColor(colors.HexColor("#2f4a3f"))
    title_lines = simpleSplit(title, "Helvetica-Bold", 24, content_width)
    ensure_space(len(title_lines) + 1)
    for title_line in title_lines:
        title_width = pdf.stringWidth(title_line, "Helvetica-Bold", 24)
        title_x = (width - title_width) / 2
        pdf.drawString(title_x, y, title_line)
        y -= 0.32 * inch

    y -= 0.2 * inch
    pdf.setStrokeColor(colors.HexColor("#b07a4c"))
    pdf.setLineWidth(1.5)
    pdf.line(left_margin, y, width - right_margin, y)
    y -= 0.25 * inch

    pdf.setFont("Helvetica-Bold", 12)
    pdf.setFillColor(colors.HexColor("#1f1c1a"))
    pdf.drawString(left_margin, y, "Your Profile")
    y -= 0.22 * inch

    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#4c4036"))
    for key, value in profile.items():
        display_key = key.replace("preparingFor", "Preparing For").replace("concern", "Primary Concern").replace("region", "Region")
        profile_line = f"• {display_key}: {value}"
        wrapped = simpleSplit(profile_line, "Helvetica", 10, content_width - 0.2 * inch)
        ensure_space(len(wrapped) + 1)
        for idx, segment in enumerate(wrapped):
            indent = left_margin if idx == 0 else left_margin + 0.15 * inch
            pdf.drawString(indent, y, segment)
            y -= line_height

    y -= 0.15 * inch
    pdf.setStrokeColor(colors.HexColor("#d9d2c3"))
    pdf.setLineWidth(0.5)
    pdf.line(left_margin, y, width - right_margin, y)
    y -= 0.25 * inch

    pdf.setFont("Helvetica-Bold", 12)
    pdf.setFillColor(colors.HexColor("#1f1c1a"))
    pdf.drawString(left_margin, y, "Your Guide")
    y -= 0.22 * inch

    pdf.setFont("Helvetica", 11)
    pdf.setFillColor(colors.HexColor("#1f1c1a"))
    for raw_line in body.splitlines():
        clean_line = raw_line.strip()
        if not clean_line:
            y -= 0.1 * inch
            if y < bottom_margin:
                new_page()
            continue

        is_section_header = clean_line.startswith("##") or (clean_line.isupper() and len(clean_line) < 40)
        is_bullet = clean_line.startswith("-") or clean_line.startswith("•")

        if is_section_header:
            pdf.setFont("Helvetica-Bold", 12)
            pdf.setFillColor(colors.HexColor("#2f4a3f"))
            display_text = clean_line.replace("##", "").strip()
            ensure_space(2)
            pdf.drawString(left_margin, y, display_text)
            y -= 0.28 * inch
        elif is_bullet:
            pdf.setFont("Helvetica", 11)
            pdf.setFillColor(colors.HexColor("#1f1c1a"))
            display_text = clean_line.lstrip("-•").strip()
            wrapped_lines = simpleSplit(display_text, "Helvetica", 11, content_width - 0.3 * inch)
            ensure_space(len(wrapped_lines) + 1)
            for idx, segment in enumerate(wrapped_lines):
                if idx == 0:
                    pdf.drawString(left_margin + 0.15 * inch, y, "• " + segment)
                else:
                    pdf.drawString(left_margin + 0.3 * inch, y, segment)
                y -= line_height
        else:
            pdf.setFont("Helvetica", 11)
            pdf.setFillColor(colors.HexColor("#1f1c1a"))
            wrapped_lines = simpleSplit(clean_line, "Helvetica", 11, content_width)
            ensure_space(len(wrapped_lines) + 1)
            for segment in wrapped_lines:
                pdf.drawString(left_margin, y, segment)
                y -= line_height

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
    message["Subject"] = "Your Personalized Survival Guide"
    message.set_content("Your personalized survival guide is attached.")
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
                "You are a preparedness expert creating a supply checklist.\n"
                "Generate a scenario-specific emergency supply list.\n"
                "The list must match the user's concern and region.\n\n"
                "STRICT RULES:\n"
                "- Output only a numbered checklist.\n"
                "- Each item must be on its own line.\n"
                "- No explanations.\n"
                "- No paragraphs.\n"
            ),
        },
        {
            "role": "user",
            "content": f"User profile: {profile}\nGive the supply list only.",
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
