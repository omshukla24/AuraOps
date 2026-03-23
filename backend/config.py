"""
AuraOps Configuration — Environment variables, constants, and shared state.
"""

import os
import queue as queue_mod
from datetime import datetime, timezone

import anthropic
from dotenv import load_dotenv

# ─────────────────────────────────────────────────────────────────────
# ENVIRONMENT
# ─────────────────────────────────────────────────────────────────────

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GITLAB_TOKEN = os.getenv("GITLAB_TOKEN", "")
GITLAB_URL = os.getenv("GITLAB_URL", "https://gitlab.com")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "")
DEPLOY_REGION = os.getenv("DEPLOY_REGION", "europe-north1")
HISTORY_FILE = os.getenv("HISTORY_FILE", "/tmp/auraops_history.json")
PORT = int(os.getenv("PORT", "8080"))

HEADERS = {"PRIVATE-TOKEN": GITLAB_TOKEN}
CLAUDE_MODEL = "claude-sonnet-4.6-20250514"

# ─────────────────────────────────────────────────────────────────────
# CARBON INTENSITY (gCO₂eq/kWh by GCP region)
# ─────────────────────────────────────────────────────────────────────

CARBON = {
    "europe-north1": 7,
    "us-west1": 96,
    "southamerica-east1": 100,
    "europe-west1": 112,
    "europe-west4": 284,
    "us-east4": 276,
    "us-central1": 440,
    "asia-east1": 370,
    "asia-northeast1": 465,
}
BEST_REGION = min(CARBON, key=CARBON.get)

# ─────────────────────────────────────────────────────────────────────
# CLAUDE CLIENT
# ─────────────────────────────────────────────────────────────────────

import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-2.5-flash") if GEMINI_API_KEY else None
GEMINI_READY = bool(GEMINI_API_KEY)

claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

# ─────────────────────────────────────────────────────────────────────
# TOKEN / COST TRACKING
# ─────────────────────────────────────────────────────────────────────

_token_usage = {"input": 0, "output": 0, "calls": 0}


def track_tokens(response):
    """Track token usage from a Claude API response."""
    if hasattr(response, 'usage'):
        _token_usage["input"] += getattr(response.usage, 'input_tokens', 0)
        _token_usage["output"] += getattr(response.usage, 'output_tokens', 0)
        _token_usage["calls"] += 1


def get_token_cost():
    """Calculate estimated API cost (Claude Sonnet: $3/M input, $15/M output)."""
    ic = (_token_usage["input"] / 1_000_000) * 3.0
    oc = (_token_usage["output"] / 1_000_000) * 15.0
    return {
        "input_tokens": _token_usage["input"],
        "output_tokens": _token_usage["output"],
        "total_tokens": _token_usage["input"] + _token_usage["output"],
        "calls": _token_usage["calls"],
        "estimated_cost": round(ic + oc, 4),
    }


def reset_tokens():
    """Reset token counters for a new run."""
    _token_usage["input"] = 0
    _token_usage["output"] = 0
    _token_usage["calls"] = 0


# ─────────────────────────────────────────────────────────────────────
# TIME-SAVED ESTIMATES (minutes per vulnerability type)
# ─────────────────────────────────────────────────────────────────────

TIME_SAVED_MAP = {
    "SQL Injection": 30, "Cross-Site Scripting": 25, "XSS": 25,
    "Command Injection": 35, "Path Traversal": 20, "SSRF": 30,
    "Hardcoded API Key": 15, "Hardcoded Password": 15, "Hardcoded Secret": 15,
    "Exposed Credentials": 15, "Insecure Deserialization": 35,
    "CSRF": 20, "Open Redirect": 15, "XXE": 25,
    "Broken Authentication": 30, "Sensitive Data Exposure": 20,
}


def estimate_time_saved(vuln_type: str) -> float:
    """Estimate minutes saved by auto-patching this vulnerability type."""
    return TIME_SAVED_MAP.get(vuln_type, 20)


# ─────────────────────────────────────────────────────────────────────
# SSE EVENT QUEUE (live dashboard feed) — Pub/Sub for multiple clients
# ─────────────────────────────────────────────────────────────────────

_event_queues = []

def subscribe_queue():
    """Create a new queue for a client and return it."""
    q = queue_mod.Queue(maxsize=500)
    _event_queues.append(q)
    return q

def remove_queue(q):
    """Remove a disconnected client's queue."""
    if q in _event_queues:
        _event_queues.remove(q)

def broadcast(msg):
    """Push event to all connected SSE clients."""
    if isinstance(msg, dict):
        evt = {**msg, "timestamp": datetime.now(timezone.utc).isoformat()}
    else:
        evt = {"type": "log", "message": str(msg), "timestamp": datetime.now(timezone.utc).isoformat()}
    for q in list(_event_queues):
        try:
            q.put_nowait(evt)
        except queue_mod.Full:
            pass

def get_event_queue():
    """Backward compat: creates a new subscription."""
    return subscribe_queue()


# ─────────────────────────────────────────────────────────────────────
# DEMO MODE
# ─────────────────────────────────────────────────────────────────────

DEMO_MODE = False
