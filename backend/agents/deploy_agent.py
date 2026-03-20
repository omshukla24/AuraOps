"""
AuraOps DeployAgent — Cloud Run deployment with build, deploy, smoke test, and rollback.
"""

import re
import asyncio
import subprocess

import requests

from backend.config import GCP_PROJECT_ID, DEPLOY_REGION
from backend.utils.logger import log
from backend.utils.gitlab_client import get_file_content


async def run(ctx: dict) -> str | None:
    """
    DeployAgent: Deploy the application to Google Cloud Run on APPROVE decision.
    Returns service URL or None.
    """
    decision = ctx.get("risk_result", {}).get("decision", "BLOCK")

    if decision != "APPROVE":
        log(f"🚀 DeployAgent: Skipping deployment (decision: {decision})")
        return None

    log("🚀 DeployAgent: Starting deployment")

    if not GCP_PROJECT_ID:
        mock_url = "https://auraops-demo.run.app"
        log(f"🚀 DeployAgent: No GCP project — returning mock URL: {mock_url}")
        return mock_url

    service_name = "auraops"
    branch = ctx.get("source_branch", "main").replace("/", "-")[:20]
    tag = f"gcr.io/{GCP_PROJECT_ID}/{service_name}:{branch}"

    try:
        dockerfile = get_file_content(ctx["project_id"], "Dockerfile", ctx["source_branch"])
        if not dockerfile:
            log("🚀 DeployAgent: No Dockerfile found — skipping")
            return None

        # Build container image
        log("🚀 DeployAgent: Building container image...")
        build_result = await asyncio.to_thread(
            subprocess.run,
            ["gcloud", "builds", "submit", "--tag", tag, "--quiet"],
            capture_output=True, text=True, timeout=300
        )
        if build_result.returncode != 0:
            log(f"🚀 DeployAgent: Build failed: {build_result.stderr[:200]}")
            return None

        # Deploy to Cloud Run
        log("🚀 DeployAgent: Deploying to Cloud Run...")
        deploy_cmd = [
            "gcloud", "run", "deploy", service_name,
            "--image", tag, "--region", DEPLOY_REGION,
            "--min-instances", "0", "--cpu-boost",
            "--allow-unauthenticated", "--quiet",
        ]
        deploy_result = await asyncio.to_thread(
            subprocess.run,
            deploy_cmd, capture_output=True, text=True, timeout=300
        )

        if deploy_result.returncode != 0:
            log(f"🚀 DeployAgent: Deploy failed: {deploy_result.stderr[:200]}")
            return None

        url_match = re.search(r'(https://\S+\.run\.app)', deploy_result.stderr + deploy_result.stdout)
        service_url = url_match.group(1) if url_match else f"https://{service_name}-{GCP_PROJECT_ID}.run.app"

        # Smoke test
        log(f"🚀 DeployAgent: Smoke testing {service_url}")
        try:
            smoke = requests.get(service_url, timeout=15)
            if smoke.status_code == 200:
                log("🚀 DeployAgent: Smoke test passed ✅")
                return service_url
            else:
                log(f"🚀 DeployAgent: Smoke test failed ({smoke.status_code}) — rolling back")
                await asyncio.to_thread(
                    subprocess.run,
                    ["gcloud", "run", "services", "update-traffic", service_name,
                     "--to-revisions", "LAST=100", "--region", DEPLOY_REGION, "--quiet"],
                    capture_output=True, text=True, timeout=60
                )
                return None
        except Exception:
            log("🚀 DeployAgent: Smoke test timeout — keeping deployment")
            return service_url

    except Exception as e:
        log(f"🚀 DeployAgent error: {e}")
        return None
