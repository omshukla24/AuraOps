"""
AuraOps — Autonomous Unified Release Authority for Operations
The AI that decides if your code deserves to ship.

FastAPI application with all route definitions.
"""

import os
import json
import asyncio
import queue as queue_mod

from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse

from backend.config import PORT, get_event_queue, broadcast
from backend.orchestrator import run_all_agents
from backend.utils.history import load_history
from backend.utils.logger import log, get_log_file_path


# ─────────────────────────────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────────────────────────────

app = FastAPI(title="AuraOps", version="2.0.0")

DASHBOARD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dashboard-ui", "dist")


@app.get("/", response_class=JSONResponse)
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "AuraOps",
        "version": "2.0.0",
        "tagline": "The AI that decides if your code deserves to ship.",
        "agents": ["SecurityAgent", "GreenOpsAgent", "ValidationAgent",
                    "RiskEngine", "ComplianceAgent", "DeployAgent"],
        "dashboard": "/dashboard",
    }


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard():
    """Serve the AuraOps React dashboard."""
    html_path = os.path.join(DASHBOARD_DIR, "index.html")
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Dashboard not built. Run: cd dashboard-ui && npm run build</h1>", status_code=404)


# Serve static assets from the React build
from starlette.staticfiles import StaticFiles as _StaticFiles
if os.path.exists(os.path.join(DASHBOARD_DIR, "assets")):
    app.mount("/assets", _StaticFiles(directory=os.path.join(DASHBOARD_DIR, "assets")), name="static-assets")


@app.get("/api/history", response_class=JSONResponse)
async def api_history():
    """Return MR processing history for the dashboard."""
    return load_history()


@app.post("/webhook")
async def webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive GitLab MR webhook events."""
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    event_type = payload.get("object_kind", "")
    if event_type == "merge_request":
        mr = payload.get("object_attributes", {})
        action = mr.get("action", "")
        if action in ("open", "reopen", "update"):
            background_tasks.add_task(run_all_agents, payload)
            log(f"🚀 Webhook received: MR !{mr.get('iid', '?')} ({action})")
            return {"status": "accepted", "message": "AuraOps agents triggered"}

    return {"status": "ignored", "message": "Not a relevant MR event"}


@app.post("/trigger-test")
async def trigger_test(background_tasks: BackgroundTasks):
    """One-click demo: trigger a test run with a mock vulnerable MR payload."""
    mock_payload = {
        "object_kind": "merge_request",
        "user": {"username": "demo-dev"},
        "project": {"id": 0},
        "object_attributes": {
            "iid": 99,
            "title": "feat: add user payment flow [AuraOps Demo]",
            "action": "open",
            "source_branch": "feature/demo",
            "target_branch": "main",
            "source_project_id": 0,
        },
    }
    background_tasks.add_task(run_all_agents, mock_payload)
    log("🎮 Demo triggered via /trigger-test")
    return {"status": "accepted", "message": "Demo MR triggered — watch the dashboard!"}


@app.get("/api/events")
async def api_events():
    """SSE endpoint for live agent activity feed."""
    async def event_stream():
        event_queue = get_event_queue()
        while True:
            try:
                evt = event_queue.get_nowait()
                yield f"data: {json.dumps(evt)}\n\n"
            except queue_mod.Empty:
                yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
                await asyncio.sleep(1)
    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/api/impact", response_class=JSONResponse)
async def api_impact():
    """Return aggregate impact metrics for the dashboard."""
    history = load_history()
    total_patches = sum(h.get("patches_committed", 0) for h in history)
    total_vulns = sum(h.get("vuln_count", 0) for h in history)
    total_time_saved = sum(h.get("time_saved_min", 0) for h in history)
    total_co2 = sum(h.get("co2_saved", 0) for h in history)
    fix_times = [h.get("elapsed", 0) for h in history if h.get("patches_committed", 0) > 0]
    avg_fix_time = round(sum(fix_times) / len(fix_times), 1) if fix_times else 0
    return {
        "total_mrs": len(history),
        "total_vulns_found": total_vulns,
        "total_patches": total_patches,
        "total_time_saved_min": round(total_time_saved, 1),
        "total_co2_saved": round(total_co2, 1),
        "avg_fix_time_sec": avg_fix_time,
        "industry_avg_mttr_days": 58,
    }


# ─────────────────────────────────────────────────────────────────────
# ENTRYPOINT
# ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    import webbrowser
    import threading

    from backend.config import ANTHROPIC_API_KEY, GITLAB_TOKEN, GCP_PROJECT_ID

    log("🚀 AuraOps starting...")
    log(f"   Claude API: {'✅ configured' if ANTHROPIC_API_KEY else '❌ not set'}")
    log(f"   GitLab:     {'✅ configured' if GITLAB_TOKEN else '❌ not set'}")
    log(f"   GCP:        {'✅ ' + GCP_PROJECT_ID if GCP_PROJECT_ID else '⚠️  mock mode'}")
    log(f"   Dashboard:  http://localhost:{PORT}/dashboard")
    log(f"   Log file:   {get_log_file_path()}")

    def _open_browser():
        import time
        time.sleep(2)
        dashboard_url = f"http://localhost:{PORT}/dashboard"
        log(f"🌐 Opening dashboard: {dashboard_url}")
        webbrowser.open(dashboard_url)

    threading.Thread(target=_open_browser, daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=PORT)
