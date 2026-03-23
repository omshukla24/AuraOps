"""
AuraOps RiskEngine — AI-powered release decision authority.
Uses Claude as a senior engineering lead with rule-based fallback.
"""

import re
import json
import asyncio

from backend.config import claude, CLAUDE_MODEL, BEST_REGION, gemini_model, track_tokens
from backend.agents.security_agent import empty_result as _empty_sec_result
from backend.utils.logger import log


RISK_SYSTEM_PROMPT = """You are a senior engineering lead and release manager with 15 years of experience.
You make final deployment decisions based on security, sustainability, and test results.
You balance security risk, performance, and business velocity.
Be decisive. Return ONLY valid JSON."""

RISK_USER_PROMPT = """Review this merge request and make a deployment decision.

MR: {mr_title} by {author} → {target_branch}

Security Score: {sec_score}/100
  Vulnerabilities found: {vuln_count}
  Critical issues: {critical_count}
  Auto-patched: {patches}
  Remaining unpatched: {unpatched}

Sustainability:
  Eco Score: {eco_score}/100
  Region: {old_region} → {new_region}
  CO₂ saved: {co2_saved} kg/month

Tests: {test_status}

Decision rules (apply in order):
1. BLOCK  if any unpatched critical vulnerability (severity >= 9) remains
2. BLOCK  if security score < 25 after patching
3. NEEDS_FIX if security 25–49, OR eco score < 30, OR tests failed
4. APPROVE otherwise

Respond ONLY with this JSON:
{{
  "decision": "APPROVE",
  "confidence": 91,
  "reason": "One to two sentences explaining the decision.",
  "risk_factors": ["up to 3 short strings"],
  "positive_factors": ["up to 3 short strings"]
}}"""


async def run(ctx: dict) -> dict:
    """
    RiskEngine: Synthesize Phase 1 results into a holistic deployment decision
    using Claude as a senior engineering lead.
    """
    log("🧠 RiskEngine: Making release decision")
    sec = ctx.get("sec_result", _empty_sec_result())
    eco = ctx.get("eco_result", {})
    val = ctx.get("val_result", {})

    sec_score = sec.get("score", 100)
    vuln_count = sec.get("count", 0)
    critical_count = sec.get("critical_count", 0)
    patches = sec.get("patches_committed", 0)
    unpatched = vuln_count - patches

    unpatched_critical = sum(
        1 for v in sec.get("vulns", [])
        if v.get("severity", 0) >= 9 and not v.get("patched", False)
    )

    eco_score = eco.get("eco_score", 75)
    test_status = val.get("status", "skipped")
    test_passed = val.get("passed", True)

    if gemini_model:
        try:
            prompt = RISK_USER_PROMPT.format(
                mr_title=ctx.get("mr_title", ""),
                author=ctx.get("author", ""),
                target_branch=ctx.get("target_branch", ""),
                sec_score=sec_score, vuln_count=vuln_count,
                critical_count=critical_count,
                patches=patches, unpatched=unpatched,
                eco_score=eco_score,
                old_region=eco.get("old_region", "default"),
                new_region=eco.get("new_region", BEST_REGION),
                co2_saved=eco.get("co2_saved", 0),
                test_status=test_status,
            )

            response_text = await asyncio.to_thread(
                lambda: gemini_model.generate_content(f"{RISK_SYSTEM_PROMPT}\n\n{prompt}").text
            )

            class DummyUsage:
                input_tokens = len(prompt) // 4
                output_tokens = len(response_text) // 4
            class DummyResponse:
                usage = DummyUsage()
            track_tokens(DummyResponse())

            text = response_text.strip()
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
            result = json.loads(text)

            if result.get("decision") in ("APPROVE", "NEEDS_FIX", "BLOCK"):
                log(f"🧠 RiskEngine: {result['decision']} — {result.get('confidence', '?')}%")
                return result

        except Exception as e:
            log(f"🧠 RiskEngine Claude error: {e}, using fallback")

    return _risk_fallback(sec_score, unpatched_critical, eco_score, test_passed)


def _risk_fallback(sec_score: int, unpatched_critical: int,
                   eco_score: int, test_passed: bool) -> dict:
    """Rule-based fallback when Claude is unavailable."""
    if unpatched_critical > 0 or sec_score < 25:
        return {"decision": "BLOCK", "confidence": 85,
                "reason": "Critical unpatched vulnerabilities or very low security score.",
                "risk_factors": ["Unpatched critical issues"], "positive_factors": []}
    if sec_score < 50 or not test_passed or eco_score < 30:
        return {"decision": "NEEDS_FIX", "confidence": 70,
                "reason": "Security or sustainability issues need attention before deployment.",
                "risk_factors": ["Score below threshold"], "positive_factors": []}
    return {"decision": "APPROVE", "confidence": 80,
            "reason": "All checks passed with acceptable risk levels.",
            "risk_factors": [], "positive_factors": ["Checks passed"]}
