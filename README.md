<p align="center">
  <h1 align="center">🤖 AuraOps</h1>
  <p align="center"><strong>Autonomous Unified Release Authority for Operations</strong></p>
  <p align="center"><em>The AI that decides if your code deserves to ship.</em></p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.11+-blue?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Claude_Sonnet-AI-7C3AED?logo=anthropic&logoColor=white" alt="Claude">
  <img src="https://img.shields.io/badge/Cloud_Run-GCP-4285F4?logo=googlecloud&logoColor=white" alt="GCP">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

---

## 💡 Overview

AuraOps is a **multi-agent AI system** that hooks into GitLab merge requests and autonomously analyzes security, sustainability, and code quality. Six specialized agents work in parallel — then an AI Release Authority makes the final deployment decision. All within **60 seconds**, with zero developer intervention.

> **Vulnerabilities found → patched → verified → deployed.** Hands off the keyboard.

---

## ✨ What Happens When a Developer Opens an MR

1. 🔐 **SecurityAgent** — Scans diffs with Claude AI for SQL injection, XSS, hardcoded secrets, and more. Auto-generates fix commits, calculates patch confidence, scans dependencies for CVEs, and writes regression guard tests.
2. 🌱 **GreenOpsAgent** — Detects high-carbon cloud regions and rewrites CI/Terraform configs to deploy greener (Finland: 7 gCO₂eq/kWh).
3. 🧪 **ValidationAgent** — Triggers the GitLab CI pipeline and polls until it passes or fails.
4. 🧠 **RiskEngine** — Synthesizes all Phase 1 results into an **APPROVE / NEEDS_FIX / BLOCK** decision with a confidence percentage.
5. 📋 **ComplianceAgent** — Generates an automated SOC2/GDPR compliance checklist scored out of 100.
6. 🚀 **DeployAgent** — Deploys to Google Cloud Run, runs a smoke test, and rolls back on failure.

A polished **scorecard comment** lands in the MR — with before/after diffs, per-agent timing, token costs, and estimated time saved.

---

## 🏗️ Architecture

```
  Developer opens GitLab Merge Request
                      │
                      ▼
          GitLab POST /webhook → FastAPI
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    SecurityAgent  GreenOps    Validation       ← Phase 1 (parallel, ~15s)
    (Claude AI)   (Carbon)    (GitLab CI)
    │ Scan vulns   │           │
    │ Auto-patch   │           │
    │ Dep CVEs     │           │
    │ Regr guard   │           │
          │           │           │
          └───────────┼───────────┘
                      ▼
                RiskEngine (Claude AI)           ← Phase 2 (sequential)
             APPROVE / NEEDS_FIX / BLOCK
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
    ComplianceAgent          DeployAgent         ← Phase 3 (parallel)
     (SOC2/GDPR)          (Cloud Run)
          │                       │
          └───────────┬───────────┘
                      ▼
             Post Scorecard → MR Comment
                      │
                SSE → Dashboard (live feed)
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- An [Anthropic API key](https://console.anthropic.com)
- A [GitLab personal access token](https://gitlab.com/-/user_settings/personal_access_tokens) with `api` scope

### 1. Clone & Install

```bash
git clone https://github.com/omshukla24/AuraOps.git
cd auraops
pip install -r requirements.txt
```

### 2. Configure

```bash
cp .env.example .env
# Fill in your keys — see .env.example for descriptions
```

### 3. Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8080
```

Open the dashboard at **http://localhost:8080/dashboard**

### 4. Quick Demo (no GitLab needed)

```bash
curl -X POST http://localhost:8080/trigger-test
```

This triggers the full pipeline against a simulated MR with intentional vulnerabilities from `demo_vulnerable_app.py`.

### 5. Connect GitLab Webhook

In your GitLab project → **Settings → Webhooks**:

| Field | Value |
|---|---|
| URL | `https://your-server.com/webhook` |
| Trigger | Merge request events |
| SSL | Enable |

---

## 📊 Live Dashboard

The built-in dashboard provides real-time visibility into AuraOps activity:

| Feature | Description |
|---|---|
| **Metric Cards** | MRs processed, Vulns patched, Minutes saved, Avg security score, CO₂ saved |
| **Score Trends** | Security and eco scores charted over time |
| **CO₂ Impact** | Cumulative carbon savings per MR |
| **History Table** | Every MR with decision badges, patch counts, and deploy links |
| **Live Feed** | Real-time SSE event stream showing agent activity as it happens |

---

## 🔐 MR Scorecard Example

Every processed MR receives a rich GitLab comment:

```
✅ APPROVED — confidence 91%
> "3 vulnerabilities auto-patched. Infrastructure optimized. CI passed."

🔐 Security — 🟢 84/100
  ├─ SQL Injection (critical) → Auto-patched ✅ [confidence: 92%]
  │  Before: cursor.execute(f"SELECT * FROM users WHERE id = {uid}")
  │  After:  cursor.execute("SELECT * FROM users WHERE id = %s", (uid,))
  ├─ Hardcoded Secret (high) → Auto-patched ✅ [confidence: 88%]
  └─ 2 dependency CVEs flagged

🌱 Sustainability — 🟢 82/100
🧪 Tests — ✅ Passed | 3 regression guard tests generated
🚀 Deployment — Live ✅
📋 Compliance — 7/8 checks passed (SOC2: 88/100)

⏱️ Agents: Security 4.2s · GreenOps 1.1s · Validation 8.3s · Risk 2.1s
💰 Tokens: 12,450 in / 3,200 out · Cost: $0.023
⏳ Est. time saved: ~45 min manual review
```

---

## 🛡️ Security-First Auto-Remediation

AuraOps goes beyond scanning — it **fixes** vulnerabilities autonomously:

| Capability | Description |
|---|---|
| **Vulnerability Detection** | Claude AI scans diffs for OWASP Top 10 issues |
| **Auto-Patching** | Commits real fixes directly to the MR branch |
| **Patch Confidence** | Each fix gets a 0–100% confidence score |
| **Dependency CVE Scanning** | Checks `requirements.txt` / `package.json` against known CVEs |
| **Regression Guards** | Auto-generates `test_security_auraops.py` to prevent regressions |
| **Time-Saved Estimates** | Calculates minutes of manual review saved per auto-fix |
| **Before/After Diffs** | Scorecard shows exact code changes for every patch |

---

## 🌍 Green by Design

AuraOps doesn't just check your carbon footprint — it practices what it preaches:

- 🇫🇮 Deploys to **europe-north1** (Finland — nearly 100% clean energy, 7 gCO₂eq/kWh)
- ⚡ Uses **scale-to-zero** (`--min-instances 0`) to eliminate idle compute
- 🔄 Recommends **e2-standard** instances (30% more efficient than n1-standard)
- 📈 Tracks cumulative CO₂ savings across every MR

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Health check — returns service status and agent list |
| `/webhook` | POST | GitLab webhook — triggers the full agent pipeline |
| `/trigger-test` | POST | One-click demo — simulates a vulnerable MR |
| `/api/events` | GET | SSE stream — real-time agent events for the dashboard |
| `/api/impact` | GET | Aggregate metrics — total vulns patched, time saved, costs |
| `/api/history` | GET | MR processing history with scores and decisions |
| `/dashboard` | GET | Serves the interactive dashboard |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **AI Engine** | Anthropic Claude Sonnet (claude-sonnet-4-20250514) |
| **Backend** | Python 3.11, FastAPI, uvicorn |
| **Orchestration** | Python asyncio (3-phase parallel pipeline) |
| **Carbon Data** | Google Cloud Carbon Footprint intensity table |
| **Deployment** | Google Cloud Run (europe-north1, scale-to-zero) |
| **Live Events** | Server-Sent Events (SSE) via `StreamingResponse` |
| **Dashboard** | React 18 (CDN), Chart.js 4 (CDN) |
| **Container** | Docker (Python 3.11-slim) |

---

## 📁 Project Structure

```
auraops/
├── main.py                  # All 6 agents, orchestrator, SSE, API routes
├── demo_vulnerable_app.py   # Intentionally vulnerable app for demo testing
├── dashboard/
│   └── index.html           # React + Chart.js dashboard with live SSE feed
├── requirements.txt         # Python dependencies
├── Dockerfile               # Cloud Run container image
├── test_payload.json        # Sample GitLab webhook payload for testing
├── .env.example             # Environment variable template
├── .gitignore
├── LICENSE                  # MIT
└── README.md
```

---

## 🐳 Docker Deployment

```bash
# Build
docker build -t auraops .

# Run
docker run -p 8080:8080 --env-file .env auraops
```

Or deploy directly to **Google Cloud Run**:

```bash
gcloud run deploy auraops \
  --source . \
  --region europe-north1 \
  --allow-unauthenticated \
  --min-instances 0
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>AuraOps</strong> — The AI that decides if your code deserves to ship.
</p>
