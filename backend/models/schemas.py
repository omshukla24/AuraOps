"""
AuraOps Schemas — Pydantic models for webhook payloads and agent responses.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ─────────────────────────────────────────────────────────────────────
# GITLAB WEBHOOK MODELS
# ─────────────────────────────────────────────────────────────────────

class GitLabUser(BaseModel):
    username: str = "unknown"

class MergeRequestAttributes(BaseModel):
    iid: int = 0
    title: str = "Untitled MR"
    action: Optional[str] = None
    source_branch: str = "main"
    target_branch: str = "main"
    source_project_id: int = 0

class GitLabProject(BaseModel):
    id: int = 0

class MergeRequestEvent(BaseModel):
    object_kind: str = ""
    user: GitLabUser = GitLabUser()
    project: GitLabProject = GitLabProject()
    object_attributes: MergeRequestAttributes = MergeRequestAttributes()


# ─────────────────────────────────────────────────────────────────────
# AGENT RESULT MODELS
# ─────────────────────────────────────────────────────────────────────

class Vulnerability(BaseModel):
    type: str = "Unknown"
    severity: int = 5
    file: str = ""
    line: int = 0
    description: str = ""
    fix: str = ""
    original_code: str = ""
    patched_code: str = ""
    patched: bool = False
    patch_confidence: int = 0
    time_saved_min: float = 0


class SecurityResult(BaseModel):
    score: int = 100
    vulns: list = Field(default_factory=list)
    count: int = 0
    patches_committed: int = 0
    critical_count: int = 0
    high_count: int = 0
    time_saved_min: float = 0
    regression_tests: int = 0
    agent_time: float = 0


class GreenOpsResult(BaseModel):
    eco_score: int = 75
    co2_saved: float = 0
    old_region: Optional[str] = None
    new_region: str = "europe-north1"
    changes_made: list = Field(default_factory=list)
    instance_optimized: bool = False


class ValidationResult(BaseModel):
    status: str = "skipped"
    passed: bool = True
    pipeline_url: str = ""


class RiskResult(BaseModel):
    decision: str = "UNKNOWN"
    confidence: int = 0
    reason: str = ""
    risk_factors: list = Field(default_factory=list)
    positive_factors: list = Field(default_factory=list)


class ComplianceResult(BaseModel):
    overall: str = "UNKNOWN"
    items: list = Field(default_factory=list)
    soc2_score: int = 0
    markdown: str = ""
    audit_notes: str = ""
