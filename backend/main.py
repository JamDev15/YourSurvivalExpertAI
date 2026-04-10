from __future__ import annotations

import os
import re
import time
import logging
from io import BytesIO
from typing import Any, Dict, List, Optional

import json
import base64
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import OpenAI
from pydantic import BaseModel, EmailStr, Field, field_validator
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.utils import simpleSplit
from reportlab.lib import colors
from reportlab.pdfgen import canvas


# -------------------------------------------------
# App & Config
# -------------------------------------------------

# Load .env from backend directory
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)
logging.basicConfig(level=logging.INFO)

APP_NAME = "yoursurvivalexpert.ai"

# Rate limiting — in-memory store {ip: [timestamps]}
RATE_LIMIT_CHAT = 20       # max requests per window
RATE_LIMIT_GUIDE = 3       # max guide requests per window
RATE_WINDOW = 60           # seconds
GUIDE_EMAIL_COOLDOWN = 300 # seconds between same email receiving a guide

_rate_store: Dict[str, List[float]] = {}
_email_cooldown: Dict[str, float] = {}

def _check_rate_limit(key: str, limit: int) -> bool:
    """Returns True if allowed, False if rate limited."""
    now = time.time()
    timestamps = _rate_store.get(key, [])
    timestamps = [t for t in timestamps if now - t < RATE_WINDOW]
    if len(timestamps) >= limit:
        return False
    timestamps.append(now)
    _rate_store[key] = timestamps
    return True

def _check_email_cooldown(email: str) -> bool:
    """Returns True if email can receive a guide (not in cooldown)."""
    now = time.time()
    last_sent = _email_cooldown.get(email.lower(), 0)
    if now - last_sent < GUIDE_EMAIL_COOLDOWN:
        return False
    _email_cooldown[email.lower()] = now
    return True

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@yoursurvivalexpert.ai")
MAROPOST_API_KEY = os.getenv("MAROPOST_API_KEY")
MAROPOST_ACCOUNT_ID = os.getenv("MAROPOST_ACCOUNT_ID", "1044")
MAROPOST_LIST_ID = os.getenv("MAROPOST_LIST_ID", "306")
MAROPOST_TAG_ID = os.getenv("MAROPOST_TAG_ID", "3078")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
MONGODB_URI = os.getenv("MONGODB_URI", "")

# -------------------------------------------------
# MongoDB Setup
# -------------------------------------------------
try:
    from pymongo import MongoClient, ASCENDING
    from pymongo.errors import PyMongoError
    _pymongo_available = True
except ImportError:
    _pymongo_available = False

_mongo_client = None
_mongo_db = None
_sessions_col = None

def _init_mongo():
    global _mongo_client, _mongo_db, _sessions_col
    if not _pymongo_available or not MONGODB_URI:
        logging.warning("MongoDB not configured — session logging disabled.")
        return
    try:
        _mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        _mongo_client.admin.command("ping")
        _mongo_db = _mongo_client["yoursurvivalexpert"]
        _sessions_col = _mongo_db["sessions"]
        _sessions_col.create_index([("session_id", ASCENDING)], unique=True)
        _sessions_col.create_index([("email", ASCENDING)])
        logging.info("MongoDB connected successfully.")
    except Exception as e:
        logging.warning(f"MongoDB connection failed: {e}")
        _sessions_col = None

_init_mongo()


def db_upsert_session(session_id: str, update_fields: dict) -> None:
    if _sessions_col is None or not session_id:
        return
    try:
        now = datetime.now(timezone.utc)
        _sessions_col.update_one(
            {"session_id": session_id},
            {"$set": {**update_fields, "updated_at": now},
             "$setOnInsert": {"session_id": session_id, "created_at": now}},
            upsert=True,
        )
    except Exception as e:
        logging.warning(f"MongoDB upsert error: {e}")


def db_append_message(session_id: str, role: str, content: str) -> None:
    if _sessions_col is None or not session_id:
        return
    try:
        now = datetime.now(timezone.utc)
        _sessions_col.update_one(
            {"session_id": session_id},
            {"$push": {"conversation": {"role": role, "content": content, "ts": now}},
             "$set": {"updated_at": now},
             "$setOnInsert": {"session_id": session_id, "created_at": now}},
            upsert=True,
        )
    except Exception as e:
        logging.warning(f"MongoDB append error: {e}")


openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
# GOOGLE_CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS_FILE")
# GOOGLE_CREDENTIALS_JSON = os.getenv("GOOGLE_CREDENTIALS_JSON")

app = FastAPI(title=APP_NAME)

ALLOWED_ORIGINS = [
    "https://yoursurvivalexpert.ai",
    "https://www.yoursurvivalexpert.ai",
    "http://localhost:5173",   # Vite dev
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
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

    "STRICT SCOPE — MOST IMPORTANT RULE:\n"
    "You ONLY discuss emergency preparedness, survival planning, disaster readiness, and related topics "
    "(e.g., hurricanes, wildfires, power outages, earthquakes, floods, water storage, food storage, evacuation, first aid, shelter, etc.).\n"
    "If a user asks about ANYTHING unrelated to emergency preparedness or personal survival — such as studying, cooking, relationships, finance, technology, entertainment, or any other topic — "
    "you must politely but firmly decline and redirect them. "
    "Example refusal: 'I'm only able to help with emergency preparedness and survival planning. Is there a disaster scenario or safety concern I can help you prepare for?'\n"
    "Never answer off-topic questions under any circumstances, even if the user insists.\n\n"

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


MAX_FIELD_LEN = 120
MAX_MESSAGES = 20

class ProfileModel(BaseModel):
    preparingFor: Optional[str] = Field(default="", max_length=MAX_FIELD_LEN)
    concern: Optional[str] = Field(default="", max_length=MAX_FIELD_LEN)
    region: Optional[str] = Field(default="", max_length=MAX_FIELD_LEN)

    @field_validator("preparingFor", "concern", "region", mode="before")
    @classmethod
    def sanitize(cls, v):
        if not v:
            return ""
        # Strip leading/trailing whitespace, limit to plain text
        return str(v).strip()[:MAX_FIELD_LEN]


class ChatRequest(BaseModel):
    messages: List[Message] = []
    profile: ProfileModel = ProfileModel()
    session_id: Optional[str] = Field(default="", max_length=64)

    @field_validator("messages", mode="before")
    @classmethod
    def cap_messages(cls, v):
        # Only keep last MAX_MESSAGES to prevent unbounded payloads
        return v[-MAX_MESSAGES:] if len(v) > MAX_MESSAGES else v


class GuideRequest(BaseModel):
    email: EmailStr
    profile: ProfileModel = ProfileModel()
    session_id: Optional[str] = Field(default="", max_length=64)

# -------------------------------------------------
# Helpers
# -------------------------------------------------

def normalize_profile(profile) -> Dict[str, str]:
    merged = PROFILE_TEMPLATE.copy()
    if profile:
        data = profile.model_dump() if hasattr(profile, "model_dump") else dict(profile)
        merged.update({k: v for k, v in data.items() if v})
    return merged


OFF_TOPIC_SIGNALS = re.compile(
    r"\b(study|studying|studies|learn|learning|language|english|spanish|french|math|"
    r"cook|cooking|recipe|bake|baking|diet|nutrition advice|workout|exercise|fitness|"
    r"invest|investing|stock|crypto|bitcoin|finance|money management|budget|"
    r"relationship|dating|marriage|divorce|love|romance|"
    r"code|coding|programming|software|website|app development|"
    r"essay|homework|school|college|university|exam|test|"
    r"movie|music|game|gaming|sport|sports|travel|tourism|"
    r"business|marketing|sales|social media)\b",
    re.IGNORECASE,
)

# Keywords that confirm a message IS about emergency preparedness
SURVIVAL_SIGNALS = re.compile(
    r"\b(emergency|disaster|survival|survive|prepare|preparedness|hurricane|tornado|"
    r"wildfire|earthquake|flood|flooding|power outage|blackout|evacuation|shelter|"
    r"storm|drought|pandemic|water storage|food storage|first aid|kit|supply|supplies|"
    r"generator|bug out|bunker|ready|readiness|safety plan|fire safety|wildfire|"
    r"winter storm|heat wave|blizzard|tsunami|landslide|nuclear|civil unrest)\b",
    re.IGNORECASE,
)


def is_off_topic_message(message: str) -> bool:
    """Return True if message is clearly off-topic (not about emergency/survival)."""
    has_off_topic = bool(OFF_TOPIC_SIGNALS.search(message))
    has_survival = bool(SURVIVAL_SIGNALS.search(message))
    # Off-topic only if it has off-topic signals AND no survival signals
    return has_off_topic and not has_survival


def extract_profile_from_message(profile: Dict[str, str], message: Optional[str]) -> Dict[str, str]:
    if not message:
        return profile

    # Don't extract profile data from off-topic messages
    if is_off_topic_message(message):
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

    # Helper: detect if message is a "who are you preparing for" answer
    # Uses both exact words and fuzzy prefix matching for common typos
    def _looks_like_household(text: str) -> bool:
        if re.search(r"\b(family|kids|children|household|partner|spouse|relatives|loved ones|everyone)\b", text):
            return True
        # Fuzzy prefix: catches "householf", "familly", "childs", etc.
        if re.search(r"\b(househo|famil|childre|kid[sz]?)\w*", text):
            return True
        return False

    def _looks_like_self(text: str) -> bool:
        return bool(re.search(
            r"\b(myself|just me|solo|single|only me|for me|preparing for myself|it.?s just me|"
            r"my[s]elf|me only|just myself)\b",
            text,
        ))

    if not updated["preparingFor"]:
        if _looks_like_household(lower):
            updated["preparingFor"] = "Family or household"
        elif _looks_like_self(lower):
            updated["preparingFor"] = "Myself"

    if not updated["concern"]:
        # First: try to extract a specific emergency type keyword from the message
        concern_pattern = re.search(
            r"\b(hurri?cane|tornado|wildfire|fire|earthquake|flood|flooding|"
            r"power outage|power outages|blackout|blackouts|grid failure|"
            r"gas shortage|gas crisis|fuel shortage|fuel crisis|"
            r"water shortage|water crisis|water outage|"
            r"winter storm|snowstorm|blizzard|ice storm|"
            r"heat wave|extreme heat|drought|"
            r"supply chain|supply shortage|supply disruption|"
            r"pandemic|disease outbreak|civil unrest|evacuation|"
            r"tsunami|landslide|mudslide|volcano|volcanic eruption|nuclear)\b",
            lower,
        )
        if concern_pattern:
            # Normalize common misspellings
            matched = concern_pattern.group(1)
            matched = re.sub(r"^hurri?cane$", "Hurricane", matched, flags=re.IGNORECASE) or matched.title()
            updated["concern"] = matched if matched == "Hurricane" else concern_pattern.group(1).title()
        else:
            # Fallback: capture short non-question messages as free-text concern
            # Exclude words that describe who is preparing (preparingFor field)
            is_who_word = re.search(
                r"\b(family|kids|children|household|partner|spouse|myself|self|solo|single|only me|just me|for me)\b",
                lower,
            )
            # Exclude messages that look like place/location names (likely a region answer)
            looks_like_location = re.search(
                r"\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|"
                r"delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|"
                r"kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|"
                r"mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|"
                r"new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|"
                r"pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|"
                r"utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|"
                r"united states|usa|canada|australia|uk|mexico|new zealand|"
                r"angeles|miami|houston|chicago|dallas|phoenix|philadelphia|seattle|"
                r"denver|boston|atlanta|portland|city|county|state|province|country)\b",
                lower,
            )
            cleaned = re.sub(r"[^a-z\s-]", "", lower).strip()
            has_generic_question = re.search(r"\b(what|which|choices|options)\b", lower)
            if (3 <= len(cleaned) <= 40 and not is_question and not has_generic_question
                    and not is_who_word and not looks_like_location):
                updated["concern"] = message.strip()

    # Keywords that indicate the message is about an emergency type, NOT a location
    emergency_keywords = re.compile(
        r"\b(hurricane|tornado|wildfire|fire|earthquake|flood|storm|outage|power|gas|fuel|"
        r"water|shortage|crisis|pandemic|winter|heat|drought|supply|disruption|evacuation|"
        r"prepare|preparing|preparedness|emergency|disaster|want|need|worried|concern|"
        r"i want|i need|i am|i'm|we are|we're|our|my|plan|planning)\b"
    )

    # Helper: detect if a value looks like a household/who word (catches typos)
    def _is_household_like(text: str) -> bool:
        return bool(re.search(
            r"\b(family|kids|children|household|partner|spouse|relatives|loved ones|everyone|"
            r"myself|self|solo|single|only me|just me|beginner|intermediate|advanced)\b"
            r"|househo|famil|childre",
            text,
        ))

    # If region was previously set to a household-like typo, clear it so it can be replaced
    if updated["region"] and _is_household_like(updated["region"].lower()):
        updated["region"] = ""

    if not updated["region"]:
        # Explicit "in/from/near <place>" pattern — highest confidence
        region_match = re.search(r"\b(?:in|from|near|located in|living in|based in)\s+([A-Za-z\s]{2,40})", message, re.IGNORECASE)
        if region_match:
            candidate = region_match.group(1).strip()
            if not emergency_keywords.search(candidate.lower()) and not _is_household_like(candidate.lower()):
                updated["region"] = candidate

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
            "mexico": "Mexico",
            "new zealand": "New Zealand",
        }
        if normalized in common_regions:
            updated["region"] = common_regions[normalized]
        else:
            is_short_region = 3 <= len(normalized) <= 30 and re.fullmatch(r"[a-z\s]+", normalized)
            is_not_other_field = not _is_household_like(lower)
            is_not_greeting = normalized not in greeting_terms
            is_not_emergency = not emergency_keywords.search(lower)
            word_count = len(normalized.split())
            is_place_length = word_count <= 4
            if is_short_region and is_not_other_field and is_not_greeting and is_not_emergency and is_place_length:
                updated["region"] = message.strip()

    return updated


def is_valid_profile(profile: Dict[str, str]) -> bool:
    """Return True only if all profile fields are filled and region is not an off-topic word."""
    concern = profile.get("concern", "")
    region = profile.get("region", "")
    preparing = profile.get("preparingFor", "")

    if not concern or not region or not preparing:
        return False

    # Region must not be an off-topic / non-location word
    if OFF_TOPIC_SIGNALS.search(region):
        return False

    return True


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
            timeout=60
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


# def sync_lead_to_sheet(email: str, profile: Dict[str, str], ip: str = "") -> None:
#     """Append a new lead row to Google Sheets. Fails silently if not configured."""
#     if not GOOGLE_SHEET_ID:
#         return
#     if not GOOGLE_CREDENTIALS_FILE and not GOOGLE_CREDENTIALS_JSON:
#         return
#     try:
#         import gspread
#         from google.oauth2.service_account import Credentials
#
#         SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
#
#         if GOOGLE_CREDENTIALS_JSON:
#             info = json.loads(GOOGLE_CREDENTIALS_JSON)
#             creds = Credentials.from_service_account_info(info, scopes=SCOPES)
#         else:
#             creds = Credentials.from_service_account_file(GOOGLE_CREDENTIALS_FILE, scopes=SCOPES)
#
#         gc = gspread.authorize(creds)
#         sh = gc.open_by_key(GOOGLE_SHEET_ID)
#         ws = sh.sheet1
#
#         # Add header row if sheet is empty
#         if ws.row_count == 0 or not ws.get_all_values():
#             ws.append_row(["Timestamp", "Email", "Preparing For", "Primary Concern", "Region", "IP"])
#
#         timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
#         # Anonymize IP: keep only first 3 octets (e.g. 1.2.3.x)
#         anon_ip = ".".join(ip.split(".")[:3]) + ".x" if ip and "." in ip else ip
#
#         ws.append_row([
#             timestamp,
#             email,
#             profile.get("preparingFor", ""),
#             profile.get("concern", ""),
#             profile.get("region", ""),
#             anon_ip,
#         ])
#         logging.info(f"Lead synced to sheet: {email}")
#     except Exception as e:
#         logging.warning(f"Google Sheets sync failed (non-critical): {e}")


def sync_to_maropost(email: str, profile: dict) -> None:
    """Add contact to Maropost list. Non-blocking — errors are logged only."""
    if not MAROPOST_API_KEY:
        return
    try:
        # Use list-specific endpoint — list_ids/tag_ids are not valid contact fields
        url = f"https://api.maropost.com/accounts/{MAROPOST_ACCOUNT_ID}/lists/{MAROPOST_LIST_ID}/contacts.json"
        payload = {
            "auth_token": MAROPOST_API_KEY,
            "contact": {
                "email": email,
                "subscribe": True,
            },
        }
        resp = requests.post(url, json=payload, timeout=15)
        if resp.status_code in (200, 201, 204):
            logging.info(f"Maropost sync OK for {email}")
        else:
            logging.warning(f"Maropost sync {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logging.warning(f"Maropost sync failed (non-critical): {e}")


SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
EMAIL_FROM_SMTP = os.getenv("EMAIL_FROM_SMTP", SMTP_USER)

EMAIL_HTML_BODY = (
    "<p>Hello,</p>"
    "<p>Thank you for using <strong>yoursurvivalexpert.ai</strong>. "
    "Your personalized survival guide is attached as a PDF.</p>"
    "<p>Inside you will find a detailed threat assessment, a supply checklist, "
    "a step-by-step action plan, a 72-hour emergency timeline, and regional resources.</p>"
    "<p>We recommend printing a copy and keeping it with your emergency supplies.</p>"
    "<p>Stay prepared,<br><strong>Commander Alex Reid</strong><br>yoursurvivalexpert.ai</p>"
)
EMAIL_SUBJECT = "Your Personalized Survival Guide — yoursurvivalexpert.ai"


def send_via_smtp(email: str, pdf_bytes: bytes) -> bool:
    """Send email via Gmail SMTP. Returns True on success, False if blocked or misconfigured."""
    import smtplib
    import socket
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders as email_encoders

    if not SMTP_USER or not SMTP_PASS:
        logging.warning("SMTP credentials not configured.")
        return False

    try:
        msg = MIMEMultipart()
        msg["From"] = EMAIL_FROM_SMTP or SMTP_USER
        msg["To"] = email
        msg["Subject"] = EMAIL_SUBJECT
        msg.attach(MIMEText(EMAIL_HTML_BODY, "html"))

        part = MIMEBase("application", "pdf")
        part.set_payload(pdf_bytes)
        email_encoders.encode_base64(part)
        part.add_header("Content-Disposition", 'attachment; filename="survival-guide.pdf"')
        msg.attach(part)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, [email], msg.as_string())

        logging.info(f"Email sent via SMTP to {email}")
        return True
    except (socket.error, OSError) as e:
        logging.warning(f"SMTP network error (port likely blocked by host): {e}")
        return False
    except Exception as e:
        logging.warning(f"SMTP send failed: {e}")
        return False


def send_via_resend(email: str, pdf_bytes: bytes) -> bool:
    """Send email via Resend API (HTTPS — not blocked by DigitalOcean). Returns True on success."""
    if not RESEND_API_KEY:
        logging.warning("RESEND_API_KEY not configured.")
        return False
    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": EMAIL_FROM,
                "to": [email],
                "subject": EMAIL_SUBJECT,
                "html": EMAIL_HTML_BODY,
                "attachments": [{
                    "filename": "survival-guide.pdf",
                    "content": base64.b64encode(pdf_bytes).decode("utf-8"),
                }],
            },
            timeout=20,
        )
        if resp.status_code in (200, 201):
            logging.info(f"Email sent via Resend to {email}")
            return True
        logging.error(f"Resend error {resp.status_code}: {resp.text[:200]}")
        return False
    except Exception as e:
        logging.error(f"Resend send failed: {e}")
        return False


def send_email(email: str, pdf_bytes: bytes) -> bool:
    """Send via Gmail SMTP only."""
    return send_via_smtp(email, pdf_bytes)
    # Resend API fallback (commented out — enable once yoursurvivalexpert.ai domain is verified)
    # if send_via_smtp(email, pdf_bytes):
    #     return True
    # logging.info("SMTP failed or unavailable — trying Resend API fallback.")
    # return send_via_resend(email, pdf_bytes)

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
def chat(req: ChatRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    session_id = (req.session_id or "").strip()
    user_agent = request.headers.get("user-agent", "")
    if not _check_rate_limit(f"chat:{client_ip}", RATE_LIMIT_CHAT):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")

    profile = normalize_profile(req.profile)
    # Extract from all messages for context retention, but newest message takes priority
    for m in req.messages[:-1]:
        if m.role == "user":
            profile = extract_profile_from_message(profile, m.content)
    latest_user = next((m for m in reversed(req.messages) if m.role == "user"), None)
    if latest_user:
        profile = extract_profile_from_message(profile, latest_user.content)
    missing = get_missing_fields(profile)
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

    # Save user message + profile to MongoDB before any branching
    if session_id and latest_user:
        db_append_message(session_id, "user", latest_user.content)
        db_upsert_session(session_id, {
            "profile": profile,
            "ip": client_ip,
            "user_agent": user_agent,
        })

    def _reply_and_save(reply_text: str, ready: bool) -> dict:
        """Save AI reply to MongoDB then return the response dict."""
        if session_id:
            db_append_message(session_id, "assistant", reply_text)
        return {"reply": reply_text, "profile": profile, "readyForEmail": ready}

    if latest_text and needs_supply_list(latest_text):
        if missing:
            next_question = dict(QUESTION_ORDER)[missing[0]]
            field_labels = {"preparingFor": "who you're preparing for", "concern": "your primary concern", "region": "your region"}
            missing_labels = [field_labels.get(f, f) for f in missing]
            return _reply_and_save(
                f"I want to give you the most accurate supply list possible — "
                f"but I still need a couple of details first. "
                f"Could you tell me {' and '.join(missing_labels)}?\n\n{next_question}",
                False,
            )
        print("[OpenAI] Calling OpenAI for supply list (reference-based)...")
        supply_list = build_supply_list(profile)
        items = extract_numbered_items(supply_list)
        return _reply_and_save("\n".join(items), is_valid_profile(profile))

    if latest_text:
        email_candidate = detect_email_candidate(latest_text)
        if email_candidate and not validate_email(email_candidate):
            next_question = dict(QUESTION_ORDER)[missing[0]] if missing else None
            extra = f" {next_question}" if next_question else ""
            return _reply_and_save(
                f"'{email_candidate}' is not a valid email format. "
                f"Please provide a correct email like name@example.com.{extra}",
                not missing and is_valid_profile(profile),
            )

    if latest_text:
        detected_email = detect_email_in_message(latest_text)
        if detected_email and missing:
            return _reply_and_save(
                "Thanks. I will collect your email after we finish your profile. "
                f"{dict(QUESTION_ORDER)[missing[0]]}",
                False,
            )
        if detected_email and not missing:
            return _reply_and_save(
                "That email format looks valid. Please enter it in the email field below "
                "and click 'Send my guide'.",
                is_valid_profile(profile),
            )

    # Switch prompt logic: if all profile fields are filled, use advice/guide mode
    if not missing:
        guide_messages = [
            {"role": "system", "content": GUIDE_PROMPT},
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
            *[m.dict() for m in req.messages[-12:]],
        ]
        print("[OpenAI] Calling OpenAI for advice/guide mode...")
        ai_reply = call_openai(guide_messages)
        reply = ai_reply or (
            f"I have everything I need to build your personalized survival plan — "
            f"wildfire preparedness for your household in {profile.get('region', 'your area')}. "
            "Enter your email below and I'll send your custom PDF guide right away."
            if is_valid_profile(profile) else
            "I'm having a brief connection issue. Could you repeat your last message?"
        )
        return _reply_and_save(reply, is_valid_profile(profile))
    else:
        messages = [
            {
                "role": "system",
                "content": (
                    f"{CHAT_PROMPT}\n\nSite context:\n{SITE_CONTEXT}\n\n"
                    f"Known profile: {profile}\nMissing: {missing}"
                ),
            },
            *[m.dict() for m in req.messages[-12:]],
        ]
        print("[OpenAI] Calling OpenAI for chat endpoint...")
        ai_reply = call_openai(messages)
        if missing and ai_reply and re.search(r"\bemail\b", ai_reply, re.IGNORECASE):
            reply = build_chat_reply(profile, missing)
        else:
            reply = ai_reply or build_chat_reply(profile, missing)
        return _reply_and_save(reply, not missing and is_valid_profile(profile))


@app.post("/api/guide")
@app.post("/guide")
def guide(req: GuideRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    session_id = (req.session_id or "").strip()
    user_agent = request.headers.get("user-agent", "")

    if not _check_rate_limit(f"guide:{client_ip}", RATE_LIMIT_GUIDE):
        raise HTTPException(status_code=429, detail="Too many guide requests. Please wait a few minutes.")

    if not _check_email_cooldown(str(req.email)):
        raise HTTPException(status_code=429, detail="A guide was already sent to this email recently. Please check your inbox.")

    try:
        profile = normalize_profile(req.profile)
        if not is_valid_profile(profile):
            raise HTTPException(status_code=400, detail="Please complete your profile before requesting a guide.")
        print("[OpenAI] Calling OpenAI for guide endpoint...")
        text = build_guide_text(profile)
        pdf = create_pdf("Personalized Survival Guide", text, profile)
        sent = send_email(req.email, pdf)
        if not sent:
            # Release cooldown so they can retry
            _email_cooldown.pop(str(req.email).lower(), None)
            return JSONResponse(
                status_code=503,
                content={"ok": False, "error": "We couldn't deliver your guide by email right now. Please try again later or contact support."}
            )
        # Sync lead to Maropost CRM (non-blocking, fails silently)
        sync_to_maropost(str(req.email), profile)
        # Save guide delivery to MongoDB
        mongo_key = session_id or f"email:{str(req.email).lower()}"
        db_upsert_session(mongo_key, {
            "email": str(req.email),
            "profile": profile,
            "guide_sent_at": datetime.now(timezone.utc),
            "ip": client_ip,
            "user_agent": user_agent,
        })
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Guide endpoint error: {e}")
        _email_cooldown.pop(str(req.email).lower(), None)
        return JSONResponse(
            status_code=500,
            content={"ok": False, "error": "Something went wrong generating your guide. Please try again."}
        )


class LeadRequest(BaseModel):
    email: EmailStr
    session_id: Optional[str] = Field(default="", max_length=64)
    source: Optional[str] = Field(default="", max_length=64)


@app.post("/api/lead")
@app.post("/lead")
def capture_lead(req: LeadRequest, request: Request):
    """Lightweight lead capture — saves email to MongoDB + Maropost without requiring a full profile."""
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")
    session_id = (req.session_id or "").strip()
    email_str = str(req.email)

    try:
        # Add to Maropost with minimal profile
        sync_to_maropost(email_str, {})
        # Save to MongoDB
        mongo_key = session_id or f"email:{email_str.lower()}"
        db_upsert_session(mongo_key, {
            "email": email_str,
            "lead_source": req.source or "exit_intent",
            "ip": client_ip,
            "user_agent": user_agent,
            "lead_captured_at": datetime.now(timezone.utc),
        })
        logging.info(f"Lead captured: {email_str} source={req.source}")
        return {"ok": True}
    except Exception as e:
        logging.error(f"Lead capture error: {e}")
        return JSONResponse(status_code=500, content={"ok": False, "error": "Failed to save lead."})


# -------------------------------------------------
# Admin Dashboard Endpoints
# -------------------------------------------------

from fastapi import Header

def _verify_admin(authorization: str = "") -> bool:
    """Check Bearer token matches admin password."""
    if not ADMIN_PASSWORD:
        return False
    token = authorization.replace("Bearer ", "").strip()
    return token == ADMIN_PASSWORD


@app.post("/api/admin/login")
def admin_login(body: dict):
    password = body.get("password", "")
    if not ADMIN_PASSWORD or password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password.")
    return {"ok": True, "token": ADMIN_PASSWORD}


@app.get("/api/admin/stats")
def admin_stats(authorization: str = Header(default="")):
    if not _verify_admin(authorization):
        raise HTTPException(status_code=401, detail="Unauthorized.")
    if _sessions_col is None:
        raise HTTPException(status_code=503, detail="MongoDB not connected.")

    total_sessions = _sessions_col.count_documents({})
    total_emails = _sessions_col.count_documents({"email": {"$exists": True, "$ne": ""}})
    total_guides = _sessions_col.count_documents({"guide_sent_at": {"$exists": True}})
    total_leads = _sessions_col.count_documents({"lead_source": {"$exists": True}})

    # Conversion rate: sessions that became email leads
    conversion_rate = round((total_emails / total_sessions * 100), 1) if total_sessions else 0

    # Top regions
    region_pipeline = [
        {"$match": {"profile.region": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$profile.region", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]
    top_regions = [{"region": r["_id"], "count": r["count"]}
                   for r in _sessions_col.aggregate(region_pipeline)]

    # Top concerns
    concern_pipeline = [
        {"$match": {"profile.concern": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$profile.concern", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]
    top_concerns = [{"concern": c["_id"], "count": c["count"]}
                    for c in _sessions_col.aggregate(concern_pipeline)]

    # Sessions per day (last 14 days)
    from datetime import timedelta
    daily_pipeline = [
        {"$match": {"created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=14)}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "sessions": {"$sum": 1},
            "leads": {"$sum": {"$cond": [{"$ifNull": ["$email", False]}, 1, 0]}},
        }},
        {"$sort": {"_id": 1}},
    ]
    daily = list(_sessions_col.aggregate(daily_pipeline))

    return {
        "total_sessions": total_sessions,
        "total_emails": total_emails,
        "total_guides_sent": total_guides,
        "total_exit_leads": total_leads,
        "conversion_rate": conversion_rate,
        "top_regions": top_regions,
        "top_concerns": top_concerns,
        "daily": daily,
    }


@app.get("/api/admin/sessions")
def admin_sessions(
    authorization: str = Header(default=""),
    page: int = 1,
    limit: int = 20,
):
    if not _verify_admin(authorization):
        raise HTTPException(status_code=401, detail="Unauthorized.")
    if _sessions_col is None:
        raise HTTPException(status_code=503, detail="MongoDB not connected.")

    skip = (page - 1) * limit
    total = _sessions_col.count_documents({})
    docs = list(
        _sessions_col.find(
            {},
            {"session_id": 1, "email": 1, "profile": 1, "ip": 1,
             "user_agent": 1, "created_at": 1, "guide_sent_at": 1,
             "lead_source": 1, "conversation": 1},
        )
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    # Serialize ObjectId and datetime
    for doc in docs:
        doc["_id"] = str(doc["_id"])
        for k in ("created_at", "guide_sent_at", "lead_captured_at"):
            if k in doc and doc[k]:
                doc[k] = doc[k].isoformat()
        if "conversation" in doc:
            doc["message_count"] = len(doc["conversation"])
            # Serialize datetime timestamps inside each message
            for msg in doc["conversation"]:
                if "ts" in msg and msg["ts"]:
                    msg["ts"] = msg["ts"].isoformat()

    return {"total": total, "page": page, "limit": limit, "sessions": docs}
