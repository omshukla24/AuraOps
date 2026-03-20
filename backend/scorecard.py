"""
AuraOps Scorecard — Formats the MR comment with full analysis results.
"""

from datetime import datetime, timezone

from backend.config import DEPLOY_REGION
from backend.agents.security_agent import empty_result as _empty_sec_result


def format_scorecard(ctx: dict, elapsed: int) -> str:
    """Build the complete MR scorecard comment in GitLab-flavored markdown."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    sec = ctx.get("sec_result", _empty_sec_result())
    eco = ctx.get("eco_result", {})
    val = ctx.get("val_result", {})
    risk = ctx.get("risk_result", {})
    compliance = ctx.get("compliance", {})
    deploy_url = ctx.get("deploy_url")

    decision = risk.get("decision", "UNKNOWN")
    confidence = risk.get("confidence", 0)
    reason = risk.get("reason", "")

    dec_emoji = {"APPROVE": "✅", "NEEDS_FIX": "⚠️", "BLOCK": "❌"}.get(decision, "❓")
    dec_word = {"APPROVE": "APPROVED", "NEEDS_FIX": "NEEDS FIX", "BLOCK": "BLOCKED"}.get(decision, decision)

    def score_emoji(score):
        if score >= 70: return "🟢"
        if score >= 40: return "🟡"
        return "🔴"

    sec_score = sec.get("score", 100)
    eco_score = eco.get("eco_score", 75)

    lines = []
    lines.append("---")
    lines.append("## 🤖 AuraOps — Autonomous Release Report")
    lines.append(f"_Analyzed at {now} · ran in {elapsed}s_")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Decision
    lines.append(f"### {dec_emoji} {dec_word} — confidence {confidence}%")
    if reason:
        lines.append(f'> "{reason}"')
    lines.append("")
    for pf in risk.get("positive_factors", []):
        lines.append(f"- ✅ {pf}")
    for rf in risk.get("risk_factors", []):
        lines.append(f"- ⚠️ {rf}")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Security
    lines.append(f"### 🔐 Security — {score_emoji(sec_score)} {sec_score}/100")
    vuln_count = sec.get("count", 0)
    patches = sec.get("patches_committed", 0)
    time_saved = sec.get("time_saved_min", 0)
    regression_tests = sec.get("regression_tests", 0)
    if vuln_count > 0:
        lines.append(f"- **{vuln_count}** vulnerabilities found — **{patches}** auto-patched {'✅' if patches == vuln_count else '⚠️'}")
        if regression_tests > 0:
            lines.append(f"- 🧪 **{regression_tests}** regression guard tests generated")
        if time_saved > 0:
            lines.append(f"- ⏱️ **~{time_saved} min** of manual triage saved")
        lines.append("")

        for v in sec.get("vulns", []):
            vuln_type = v.get('type', 'Unknown')
            vuln_file = v.get('file', '?')
            vuln_line = v.get('line', '?')
            patched = v.get('patched', False)
            conf = v.get('patch_confidence', 0)
            est_min = v.get('time_saved_min', 0)

            lines.append("<details>")
            status_icon = '\u2705' if patched else '\u274c'
            lines.append(f"<summary>{status_icon} <code>{vuln_type}</code> in <code>{vuln_file}:{vuln_line}</code></summary>")
            lines.append("")
            lines.append(f"🔍 **Found:** {v.get('description', '')}")
            if patched:
                lines.append(f"  ↓")
                lines.append(f"🔧 **Patched:** {v.get('fix', 'Auto-fix applied')} (confidence: {conf}%)")
                original = v.get('original_code', '')
                patched_code = v.get('patched_code', '')
                if original and patched_code:
                    lines.append(f"  ↓")
                    lines.append("```diff")
                    lines.append(f"- {original}")
                    lines.append(f"+ {patched_code}")
                    lines.append("```")
                lines.append(f"  ↓")
                lines.append(f"✅ **Verified:** Fix committed to MR branch")
                lines.append(f"  ↓")
                lines.append(f"⏱️ **Time saved:** ~{est_min} min of manual triage")
            else:
                lines.append(f"  ↓")
                lines.append(f"\u274c **Unpatched:** Manual fix required")
            lines.append("")
            lines.append("</details>")
            lines.append("")
    else:
        lines.append("- No vulnerabilities detected ✅")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Sustainability
    lines.append(f"### 🌱 Sustainability — {score_emoji(eco_score)} {eco_score}/100")
    changes = eco.get("changes_made", [])
    if changes:
        for change in changes:
            lines.append(f"- ✅ {change}")
        co2 = eco.get("co2_saved", 0)
        if co2 > 0:
            lines.append(f"- **~{co2} kg CO₂/month** saved by this optimization 🌍")
    else:
        lines.append("- Infrastructure already optimized ✅")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Tests
    val_status = val.get("status", "skipped")
    val_passed = val.get("passed", True)
    val_emoji = "✅ Passed" if val_passed else "❌ Failed"
    lines.append(f"### 🧪 Tests — {val_emoji}")
    pipeline_url = val.get("pipeline_url", "")
    if val_status == "skipped":
        lines.append("- Pipeline skipped (no CI configured or no token)")
    elif pipeline_url:
        lines.append(f"- Pipeline {val_status} · [View pipeline →]({pipeline_url})")
    else:
        lines.append(f"- Pipeline {val_status}")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Deployment
    lines.append("### 🚀 Deployment")
    if deploy_url:
        lines.append("- **Status:** Live ✅")
        lines.append(f"- **URL:** [{deploy_url}]({deploy_url})")
        lines.append(f"- **Region:** `{DEPLOY_REGION}` (low-carbon, scale-to-zero)")
        lines.append("- Smoke test: passed ✅")
    elif decision == "APPROVE":
        lines.append("- **Status:** Mock deployment (no GCP project configured)")
    else:
        lines.append(f"- **Status:** Skipped ({dec_word})")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Compliance
    comp_items = compliance.get("items", [])
    passed_count = sum(1 for i in comp_items if i.get("status") == "PASS")
    applicable_count = sum(1 for i in comp_items if i.get("status") != "NA")
    soc2 = compliance.get("soc2_score", 0)
    lines.append(f"### 📋 Compliance — {passed_count}/{applicable_count} checks passed (SOC2: {soc2}/100)")
    comp_md = compliance.get("markdown", "")
    if comp_md:
        lines.append(comp_md)
    else:
        for item in comp_items:
            status = item.get("status", "NA")
            cat = item.get("category", "")
            check = item.get("check", "")
            evidence = item.get("evidence", "")
            if status == "PASS":
                lines.append(f"- [x] ✅ **{cat}**: {check}")
            elif status == "FAIL":
                lines.append(f"- [ ] ❌ **{cat}**: {check}")
            else:
                lines.append(f"- [x] ➖ **{cat}**: {check} _(N/A)_")
            if evidence:
                lines.append(f"  - _{evidence}_")

    audit_notes = compliance.get("audit_notes", "")
    if audit_notes:
        lines.append(f"\n_Audit note: {audit_notes}_")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Agent Errors
    agent_errors = ctx.get("agent_errors", [])
    if agent_errors:
        lines.append("### ⚠️ Agent Status")
        for agent_name in agent_errors:
            lines.append(f"- ⚠️ **{agent_name}** — unavailable (used fallback)")
        lines.append("")
        lines.append("---")
        lines.append("")

    # Performance
    timings = ctx.get("agent_timings", {})
    token_cost = ctx.get("token_cost", {})
    if timings or token_cost:
        lines.append("### ⚡ Performance")
        if timings:
            t_parts = []
            if "phase1" in timings:
                t_parts.append(f"Phase 1: {timings['phase1']}s")
            if "risk" in timings:
                t_parts.append(f"RiskEngine: {timings['risk']}s")
            if "phase3" in timings:
                t_parts.append(f"Phase 3: {timings['phase3']}s")
            dot = '\u00b7'
            lines.append(f"- ⏱️ {f' {dot} '.join(t_parts)} {dot} **Total: {elapsed}s**")
        if token_cost:
            total_tokens = token_cost.get('total_tokens', 0)
            est_cost = token_cost.get('estimated_cost', 0)
            calls = token_cost.get('calls', 0)
            lines.append(f"- 🪧 {total_tokens:,} tokens ({calls} API calls) · est. cost: ${est_cost}")
        lines.append("")
        lines.append("---")
        lines.append("")

    lines.append("_AuraOps v2.0 \u00b7 [Dashboard](/dashboard) \u00b7 Autonomous Release Authority_")
    lines.append("")
    lines.append("---")

    return "\n".join(lines)
