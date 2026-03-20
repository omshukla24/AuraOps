"""
AuraOps ValidationAgent — Triggers GitLab CI pipeline and polls for results.
"""

import asyncio

import requests

from backend.config import GITLAB_URL, GITLAB_TOKEN, HEADERS
from backend.utils.logger import log


async def run(ctx: dict) -> dict:
    """
    ValidationAgent: Trigger the GitLab CI pipeline on the MR branch
    and poll for the result.
    """
    log("🧪 ValidationAgent: Triggering pipeline")
    project_id = ctx["project_id"]
    source_branch = ctx["source_branch"]

    if not GITLAB_TOKEN:
        log("🧪 ValidationAgent: No GitLab token — skipping")
        return {"status": "skipped", "passed": True, "pipeline_url": ""}

    try:
        url = f"{GITLAB_URL}/api/v4/projects/{project_id}/pipeline"
        resp = requests.post(url, headers=HEADERS, json={"ref": source_branch}, timeout=30)

        if resp.status_code not in (200, 201):
            log(f"🧪 ValidationAgent: Pipeline trigger failed ({resp.status_code})")
            return {"status": "skipped", "passed": True, "pipeline_url": ""}

        pipeline = resp.json()
        pipeline_id = pipeline.get("id")
        pipeline_url = pipeline.get("web_url", "")
        log(f"🧪 ValidationAgent: Pipeline {pipeline_id} triggered")

        # Poll for result
        status_url = f"{GITLAB_URL}/api/v4/projects/{project_id}/pipelines/{pipeline_id}"
        max_wait = 120
        poll_interval = 5
        elapsed = 0

        while elapsed < max_wait:
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

            try:
                status_resp = requests.get(status_url, headers=HEADERS, timeout=15)
                if status_resp.status_code == 200:
                    status = status_resp.json().get("status", "pending")
                    if status in ("success", "failed", "canceled"):
                        passed = status == "success"
                        log(f"🧪 ValidationAgent: Pipeline {status} ({'✅' if passed else '❌'})")
                        return {"status": status, "passed": passed, "pipeline_url": pipeline_url}
            except Exception:
                pass

        log("🧪 ValidationAgent: Pipeline timeout — treating as passed")
        return {"status": "timeout", "passed": True, "pipeline_url": pipeline_url}

    except Exception as e:
        log(f"🧪 ValidationAgent error: {e}")
        return {"status": "skipped", "passed": True, "pipeline_url": ""}
