"""
AuraOps History — JSON-based MR processing history for the dashboard.
"""

import json
import os
from datetime import datetime, timezone

from backend.config import HISTORY_FILE
from backend.utils.logger import log


def save_mr_result(ctx: dict, elapsed: int):
    """Save MR processing result to history file for dashboard."""
    sec = ctx.get("sec_result", {})
    eco = ctx.get("eco_result", {})
    risk = ctx.get("risk_result", {})

    entry = {
        "mr_iid": ctx.get("mr_iid", 0),
        "mr_title": ctx.get("mr_title", ""),
        "author": ctx.get("author", ""),
        "decision": risk.get("decision", "UNKNOWN"),
        "confidence": risk.get("confidence", 0),
        "sec_score": sec.get("score", 100),
        "eco_score": eco.get("eco_score", 75),
        "co2_saved": eco.get("co2_saved", 0),
        "deploy_url": ctx.get("deploy_url"),
        "elapsed": elapsed,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "patches_committed": sec.get("patches_committed", 0),
        "vuln_count": sec.get("count", 0),
        "time_saved_min": sec.get("time_saved_min", 0),
        "regression_tests": sec.get("regression_tests", 0),
    }

    history = load_history()
    history.append(entry)
    history = history[-100:]  # Keep last 100 entries

    try:
        with open(HISTORY_FILE, "w") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        log(f"  save_mr_result error: {e}")


def load_history() -> list:
    """Load MR processing history from file."""
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "r") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
    except Exception:
        pass
    return []
