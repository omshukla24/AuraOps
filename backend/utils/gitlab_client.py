"""
AuraOps GitLab Client — All GitLab API interactions.
"""

import base64
import urllib.parse

import requests

from backend.config import GITLAB_URL, HEADERS
from backend.utils.logger import log


def _get_with_fallback(url: str, timeout: int = 30) -> requests.Response:
    """GET with auth headers; fallback to unauthenticated for public repos."""
    resp = requests.get(url, headers=HEADERS, timeout=timeout)
    if resp.status_code in (401, 403, 404) and HEADERS.get("PRIVATE-TOKEN"):
        log(f"  Auth rejected ({resp.status_code}), retrying unauthenticated...")
        fallback = requests.get(url, timeout=timeout)
        if fallback.status_code == 200:
            log(f"  Public unauthenticated GET succeeded!")
            return fallback
    return resp


def get_mr_diff(project_id: int | str, mr_iid: int) -> str:
    """Fetch the full MR diff from GitLab."""
    pid_enc = urllib.parse.quote(str(project_id), safe="")
    url = f"{GITLAB_URL}/api/v4/projects/{pid_enc}/merge_requests/{mr_iid}/changes"
    try:
        resp = _get_with_fallback(url, timeout=30)
        if resp.status_code != 200:
            log(f"  get_mr_diff failed: {resp.status_code}")
            return ""
        data = resp.json()
        changes = data.get("changes", [])
        
        # GitLab race condition: diff changes might be empty immediately after MR open
        if not changes:
            import time
            log("  get_mr_diff: changes empty, retrying in 3 seconds...")
            time.sleep(3)
            resp = _get_with_fallback(url, timeout=30)
            data = resp.json() if resp.status_code == 200 else {}
            changes = data.get("changes", [])

        diff_parts = []
        for change in changes:
            diff_parts.append(f"--- a/{change.get('old_path', '')}")
            diff_parts.append(f"+++ b/{change.get('new_path', '')}")
            diff_parts.append(change.get("diff", ""))
        return "\n".join(diff_parts)
    except Exception as e:
        log(f"  get_mr_diff error: {e}")
        return ""


def get_changed_files(project_id: int | str, mr_iid: int) -> list:
    """Get list of changed file paths in the MR."""
    pid_enc = urllib.parse.quote(str(project_id), safe="")
    url = f"{GITLAB_URL}/api/v4/projects/{pid_enc}/merge_requests/{mr_iid}/changes"
    try:
        resp = _get_with_fallback(url, timeout=30)
        if resp.status_code != 200:
            return []
        data = resp.json()
        return [c.get("new_path", "") for c in data.get("changes", []) if c.get("new_path")]
    except Exception:
        return []


def get_file_content(project_id: int | str, file_path: str, ref: str) -> str | None:
    """Fetch file content from GitLab repository. Returns None on 404."""
    pid_enc = urllib.parse.quote(str(project_id), safe="")
    encoded_path = urllib.parse.quote(file_path, safe="")
    url = f"{GITLAB_URL}/api/v4/projects/{pid_enc}/repository/files/{encoded_path}?ref={ref}"
    try:
        resp = _get_with_fallback(url, timeout=30)
        if resp.status_code != 200:
            return None
        data = resp.json()
        content_b64 = data.get("content", "")
        return base64.b64decode(content_b64).decode("utf-8")
    except Exception:
        return None


def push_commit(ctx: dict, file_path: str, new_content: str, commit_message: str) -> bool:
    """Commit a file change to the MR's source branch."""
    pid_enc = urllib.parse.quote(str(ctx["project_id"]), safe="")
    branch = ctx["source_branch"]
    encoded_path = urllib.parse.quote(file_path, safe="")
    url = f"{GITLAB_URL}/api/v4/projects/{pid_enc}/repository/files/{encoded_path}"

    payload = {
        "branch": branch,
        "content": new_content,
        "commit_message": commit_message,
    }

    try:
        check = requests.get(f"{url}?ref={branch}", headers=HEADERS, timeout=15)
        if check.status_code == 200:
            resp = requests.put(url, headers=HEADERS, json=payload, timeout=30)
        else:
            resp = requests.post(url, headers=HEADERS, json=payload, timeout=30)

        success = resp.status_code in (200, 201)
        if not success:
            log(f"  push_commit failed for {file_path}: {resp.status_code} {resp.text[:100]}")
        return success
    except Exception as e:
        log(f"  push_commit error for {file_path}: {e}")
        return False


def post_comment(project_id: int | str, mr_iid: int, body: str) -> bool:
    """Post a comment to a GitLab merge request."""
    pid_enc = urllib.parse.quote(str(project_id), safe="")
    url = f"{GITLAB_URL}/api/v4/projects/{pid_enc}/merge_requests/{mr_iid}/notes"
    try:
        resp = requests.post(url, headers=HEADERS, json={"body": body}, timeout=30)
        success = resp.status_code == 201
        if success:
            log(f"  ✅ Comment posted to MR !{mr_iid}")
        else:
            log(f"  post_comment failed: {resp.status_code}")
        return success
    except Exception as e:
        log(f"  post_comment error: {e}")
        return False
