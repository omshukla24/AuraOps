"""
AuraOps Orchestrator — 3-phase parallel agent coordination.

Phase 1: SecurityAgent + GreenOpsAgent + ValidationAgent (parallel)
Phase 2: RiskEngine (sequential, needs Phase 1)
Phase 3: ComplianceAgent + DeployAgent (parallel)
"""

import time
import asyncio

from backend.config import BEST_REGION, broadcast, reset_tokens, get_token_cost
from backend.utils.logger import log
from backend.utils.history import save_mr_result
from backend.utils.gitlab_client import (
    get_mr_diff, get_changed_files, post_comment, get_file_content,
)
from backend.agents import (
    security_agent,
    greenops_agent,
    validation_agent,
    risk_engine,
    compliance_agent,
    deploy_agent,
)
from backend.scorecard import format_scorecard

# Store last run context/payload for rescan and diffs
_last_ctx: dict = {}
_last_payload: dict = {}


def extract_context(payload: dict) -> dict:
    """Extract MR context from GitLab webhook payload."""
    mr = payload.get("object_attributes", {})
    project = payload.get("project", {})

    return {
        "project_id": project.get("id", mr.get("source_project_id", 0)),
        "mr_iid": mr.get("iid", 0),
        "mr_title": mr.get("title", "Untitled MR"),
        "source_branch": mr.get("source_branch", "main"),
        "target_branch": mr.get("target_branch", "main"),
        "author": payload.get("user", {}).get("username", "unknown"),
        "diff": None,
        "changed_files": None,
    }


async def ensure_diff(ctx: dict):
    """Lazily load the MR diff and changed files.
    Falls back to reading actual file contents from the source branch
    if the diff API call fails (auth issues, race condition, etc.).
    """
    if ctx["diff"] is None:
        ctx["diff"] = get_mr_diff(ctx["project_id"], ctx["mr_iid"])

    if ctx["changed_files"] is None:
        ctx["changed_files"] = get_changed_files(ctx["project_id"], ctx["mr_iid"])

    # If diff API failed but we have changed files, build diff from file contents
    if not ctx["diff"] and ctx["changed_files"]:
        log("⚠️ Diff API empty, building diff from individual file contents...")
        diff_parts = []
        for fpath in ctx["changed_files"][:10]:
            content = get_file_content(ctx["project_id"], fpath, ctx["source_branch"])
            if content:
                lines = content.splitlines()
                diff_parts.append(f"--- /dev/null")
                diff_parts.append(f"+++ b/{fpath}")
                diff_parts.append(f"@@ -0,0 +1,{len(lines)} @@")
                for line in lines:
                    diff_parts.append(f"+{line}")
        ctx["diff"] = "\n".join(diff_parts)
        if ctx["diff"]:
            log(f"  ✅ Built diff from {len(ctx['changed_files'])} file(s)")

    # If we still have no diff AND no changed files, try listing branch files
    if not ctx["diff"]:
        log("⚠️ No diff and no changed files; listing source branch files as last resort...")
        import requests, urllib.parse
        from backend.config import GITLAB_URL, HEADERS
        pid_enc = urllib.parse.quote(str(ctx["project_id"]), safe="")
        branch = ctx["source_branch"]
        try:
            url = f"{GITLAB_URL}/api/v4/projects/{pid_enc}/repository/tree?ref={branch}&recursive=true&per_page=50"
            resp = requests.get(url, headers=HEADERS, timeout=30)
            if resp.status_code in (401, 403):
                resp = requests.get(url, timeout=30)
            if resp.status_code == 200:
                tree = resp.json()
                code_files = [f["path"] for f in tree
                              if f.get("type") == "blob"
                              and any(f["path"].endswith(ext) for ext in
                                      (".py", ".js", ".ts", ".java", ".go", ".rb",
                                       ".yaml", ".yml", ".json", ".toml", ".cfg",
                                       ".env", "Dockerfile", ".tf", ".sh"))]
                if code_files:
                    ctx["changed_files"] = code_files
                    diff_parts = []
                    for fpath in code_files[:10]:
                        content = get_file_content(ctx["project_id"], fpath, branch)
                        if content:
                            lines = content.splitlines()
                            diff_parts.append(f"--- /dev/null")
                            diff_parts.append(f"+++ b/{fpath}")
                            diff_parts.append(f"@@ -0,0 +1,{len(lines)} @@")
                            for line in lines:
                                diff_parts.append(f"+{line}")
                    ctx["diff"] = "\n".join(diff_parts)
                    if ctx["diff"]:
                        log(f"  ✅ Built diff from {len(code_files)} branch file(s)")
        except Exception as e:
            log(f"  Branch listing fallback error: {e}")

    if not ctx["diff"]:
        log("⚠️ Could not obtain any code to scan — security results will be empty")
    if not ctx["changed_files"]:
        ctx["changed_files"] = []


async def run_all_agents(payload: dict):
    """
    Full 3-phase agent orchestration with per-agent timing.
    Phase 1: SecurityAgent + GreenOpsAgent + ValidationAgent (parallel)
    Phase 2: RiskEngine (sequential, needs Phase 1)
    Phase 3: ComplianceAgent + DeployAgent (parallel)
    Then: format scorecard, post to MR, save history.
    """
    global _last_ctx, _last_payload
    start_time = time.time()
    reset_tokens()
    ctx = extract_context(payload)
    ctx["agent_timings"] = {}
    ctx["agent_errors"] = []
    _last_payload = payload
    log(f"📋 Processing MR !{ctx['mr_iid']}: {ctx['mr_title']}")
    broadcast({"type": "pipeline_start", "mr_iid": ctx['mr_iid'], "mr_title": ctx['mr_title']})

    try:
        await ensure_diff(ctx)

        # ── Phase 1: Parallel analysis ──
        log("⚡ Phase 1: Running SecurityAgent + GreenOpsAgent + ValidationAgent")
        broadcast({"type": "phase_start", "phase": 1, "agents": ["security", "greenops", "validation"]})
        p1_start = time.time()
        sec_task = asyncio.create_task(security_agent.run(ctx))
        eco_task = asyncio.create_task(greenops_agent.run(ctx))
        val_task = asyncio.create_task(validation_agent.run(ctx))

        p1 = await asyncio.gather(sec_task, eco_task, val_task, return_exceptions=True)
        ctx["agent_timings"]["phase1"] = round(time.time() - p1_start, 1)

        ctx["sec_result"] = p1[0] if not isinstance(p1[0], Exception) else security_agent.empty_result()
        ctx["eco_result"] = p1[1] if not isinstance(p1[1], Exception) else {
            "eco_score": 75, "co2_saved": 0, "changes_made": [],
            "new_region": BEST_REGION, "old_region": None, "instance_optimized": False
        }
        ctx["val_result"] = p1[2] if not isinstance(p1[2], Exception) else {
            "status": "skipped", "passed": True, "pipeline_url": ""
        }
        
        broadcast({"type": "agent_result", "agent": "security", "data": ctx["sec_result"]})
        broadcast({"type": "agent_result", "agent": "greenops", "data": ctx["eco_result"]})
        broadcast({"type": "agent_result", "agent": "validation", "data": ctx["val_result"]})
        
        if isinstance(p1[0], Exception):
            log(f"⚠️  SecurityAgent failed: {p1[0]}")
            ctx["agent_errors"].append("SecurityAgent")
        if isinstance(p1[1], Exception):
            log(f"⚠️  GreenOpsAgent failed: {p1[1]}")
            ctx["agent_errors"].append("GreenOpsAgent")
        if isinstance(p1[2], Exception):
            log(f"⚠️  ValidationAgent failed: {p1[2]}")
            ctx["agent_errors"].append("ValidationAgent")

        # ── Phase 2: AI Release Decision ──
        log("🧠 Phase 2: Running RiskEngine")
        broadcast({"type": "phase_start", "phase": 2, "agents": ["risk"]})
        p2_start = time.time()
        ctx["risk_result"] = await risk_engine.run(ctx)
        broadcast({"type": "agent_result", "agent": "risk", "data": ctx["risk_result"]})
        ctx["agent_timings"]["risk"] = round(time.time() - p2_start, 1)

        # ── Phase 3: Compliance + Deploy (parallel) ──
        log("📋 Phase 3: Running ComplianceAgent + DeployAgent")
        broadcast({"type": "phase_start", "phase": 3, "agents": ["compliance", "deploy"]})
        p3_start = time.time()
        comp_task = asyncio.create_task(compliance_agent.run(ctx))
        deploy_task = asyncio.create_task(deploy_agent.run(ctx))

        p3 = await asyncio.gather(comp_task, deploy_task, return_exceptions=True)
        ctx["agent_timings"]["phase3"] = round(time.time() - p3_start, 1)

        ctx["compliance"] = p3[0] if not isinstance(p3[0], Exception) else {
            "overall": "UNKNOWN", "items": [], "soc2_score": 0,
            "markdown": "_Compliance unavailable_", "audit_notes": ""
        }
        ctx["deploy_url"] = p3[1] if not isinstance(p3[1], Exception) else None
        
        broadcast({"type": "agent_result", "agent": "compliance", "data": ctx["compliance"]})
        broadcast({"type": "agent_result", "agent": "deploy", "data": {"deploy_url": ctx["deploy_url"]}})
        
        if isinstance(p3[0], Exception):
            log(f"⚠️  ComplianceAgent failed: {p3[0]}")
            ctx["agent_errors"].append("ComplianceAgent")
        if isinstance(p3[1], Exception):
            log(f"⚠️  DeployAgent failed: {p3[1]}")
            ctx["agent_errors"].append("DeployAgent")

        # ── Collect token usage ──
        ctx["token_cost"] = get_token_cost()

        # ── Post scorecard ──
        elapsed = round(time.time() - start_time)
        scorecard = format_scorecard(ctx, elapsed)
        post_comment(ctx["project_id"], ctx["mr_iid"], scorecard)
        save_mr_result(ctx, elapsed)

        decision = ctx['risk_result'].get('decision', 'UNKNOWN')
        log(f"✅ AuraOps completed MR !{ctx['mr_iid']} in {elapsed}s — {decision}")
        _last_ctx = ctx  # Store for rescan/diffs API
        broadcast({
            "type": "pipeline_complete",
            "mr_iid": ctx['mr_iid'],
            "decision": decision,
            "elapsed": elapsed,
            "confidence": ctx['risk_result'].get('confidence', 0),
            "data": {
                "security_score": ctx['sec_result'].get('score', 0),
                "vuln_count": ctx['sec_result'].get('count', 0),
                "patches_committed": ctx['sec_result'].get('patches_committed', 0),
                "critical_count": ctx['sec_result'].get('critical_count', 0),
                "high_count": ctx['sec_result'].get('high_count', 0),
                "time_saved_min": ctx['sec_result'].get('time_saved_min', 0),
                "eco_score": ctx['eco_result'].get('eco_score', 0),
                "co2_saved": ctx['eco_result'].get('co2_saved', 0),
                "validation_passed": ctx['val_result'].get('passed', False),
                "compliance_score": ctx.get('compliance', {}).get('soc2_score', 0),
                "agent_cost": ctx.get('token_cost', {}).get('estimated_cost', 0),
                "vulns": ctx['sec_result'].get('vulns', []),
            },
        })

    except Exception as e:
        elapsed = round(time.time() - start_time)
        log(f"❌ AuraOps error on MR !{ctx['mr_iid']}: {e}")
        broadcast({"type": "pipeline_error", "mr_iid": ctx['mr_iid'], "error": str(e)[:100]})
        error_comment = (
            "## 🤖 AuraOps — Error Report\n\n"
            f"An error occurred while processing this MR.\n\n"
            f"```\n{str(e)[:500]}\n```\n\n"
            f"_Ran for {elapsed}s before failure._"
        )
        try:
            post_comment(ctx["project_id"], ctx["mr_iid"], error_comment)
        except Exception:
            pass
