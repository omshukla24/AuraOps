# 🤖 AuraOps — Autonomous Unified Release Authority for Operations

> **Scanners find 200 vulnerabilities. Developers fix 3. The rest rot until audit day.**
>
> AuraOps doesn't just scan — **it fixes**. Push vulnerable code to GitLab. Within 60 seconds, AuraOps auto-patches SQL injections, removes hardcoded secrets, bumps CVE-affected dependencies, verifies each fix actually resolves the issue, generates regression tests so the vuln can never come back, and posts a full scorecard with before/after diffs.
>
> **6 agents. 3 phases. Zero developer action. The AI that decides if your code deserves to ship.**

---

## 🎯 The Problem

Every development team faces the same bottleneck:

| Pain Point | Industry Reality |
|-----------|-----------------|
| **Security triage** | Average MTTR for vulnerabilities: **58 days** |
| **Manual patching** | Developers spend **30+ min per vuln** finding, fixing, testing |
| **Compliance burden** | SOC2/GDPR audits require **weeks** of manual evidence gathering |
| **Carbon blind spots** | Teams deploy to high-carbon regions without knowing the impact |
| **Decision paralysis** | "Is this MR safe to ship?" requires senior review every time |

**AuraOps eliminates all of these.** It's not a dashboard, not a chatbot — it's an autonomous agent that jumps into your merge request workflow, auto-fixes security issues, and makes the ship/no-ship decision for you.

---

## 🏗️ Architecture

```
GitLab MR Event (Webhook)
        ↓
AuraOps Orchestrator (FastAPI Backend)
        ↓
┌───────────────────────────────────────────┐
│  ⚡ PHASE 1 — Parallel Analysis           │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ │
│  │ Security │ │ GreenOps │ │Validation │ │
│  │  Agent   │ │  Agent   │ │  Agent    │ │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ │
│       │             │             │       │
│  ┌────▼─────────────▼─────────────▼────┐  │
│  │    🧠 PHASE 2 — Risk Engine        │  │
│  │    AI Release Decision              │  │
│  └────────────────┬────────────────────┘  │
│                   │                       │
│  ┌────────────────▼────────────────────┐  │
│  │ ⚡ PHASE 3 — Parallel Execution     │  │
│  │ ┌────────────┐  ┌────────────────┐  │  │
│  │ │ Compliance │  │ Deploy Agent   │  │  │
│  │ │   Agent    │  │ (Cloud Run)    │  │  │
│  │ └────────────┘  └────────────────┘  │  │
│  └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘
        ↓
GitLab MR Comment (Full Scorecard)
+ Auto-patched commits on MR branch
+ Regression guard tests
+ Live 3D Dashboard update
```

---

## 🔧 The 6 Agents

### 🔐 SecurityAgent
- **OWASP vulnerability scanning** via Claude AI — detects SQL injection, XSS, command injection, path traversal, SSRF, and more
- **Secrets detection** — finds hardcoded API keys, passwords, database connection strings
- **Dependency CVE scanning** — checks `requirements.txt`, `package.json` for known CVEs
- **Auto-patching** — commits the exact code fix to the MR branch automatically
- **Patch verification** — re-scans patched code to confirm the fix works
- **Regression guard tests** — generates test cases so the vulnerability can never come back
- **Before/after diffs** — shows `- vulnerable_code` / `+ safe_code` in the scorecard

### 🌱 GreenOpsAgent
- Detects high-carbon GCP regions and auto-swaps to `europe-north1` (7 gCO₂eq/kWh)
- Replaces `n1-standard` instances with 30% more efficient `e2-standard`
- Adds `--min-instances 0` for scale-to-zero on Cloud Run
- Optimizes Terraform files for carbon efficiency
- Calculates precise CO₂ savings per month

### 🧪 ValidationAgent
- Triggers the GitLab CI pipeline on the MR branch
- Polls for results with timeout handling
- Reports pass/fail with direct pipeline link

### 🧠 RiskEngine
- Claude-powered senior engineering lead makes the APPROVE / NEEDS_FIX / BLOCK decision
- Considers unpatched critical vulnerabilities, security score, eco score, and test results
- Rule-based fallback when Claude is unavailable
- Confidence scoring (0-100%) for every decision

### 📋 ComplianceAgent
- Automated SOC2/GDPR compliance checklist
- Evaluates input validation, authentication, secrets management, data protection, infrastructure
- Per-item PASS/FAIL/NA with evidence
- SOC2 score calculation

### 🚀 DeployAgent
- Builds Docker image via Cloud Build
- Deploys to Cloud Run (`europe-north1`, scale-to-zero)
- Automated smoke test after deployment
- Auto-rollback on smoke test failure

---

## 🎮 How It Works

### Automatic (Webhook-Driven)
1. Developer opens a Merge Request in GitLab
2. GitLab webhook fires → hits AuraOps backend
3. All 6 agents run in 3 parallel phases
4. Auto-patches committed to the MR branch
5. Full scorecard posted as MR comment
6. Decision: ✅ APPROVED / ⚠️ NEEDS FIX / ❌ BLOCKED

### GitLab Duo Chat (Interactive)
1. Open GitLab Duo Chat sidebar
2. Select **AuraOps Assistant** from the dropdown
3. Ask about security vulnerabilities, compliance, or pipeline failures
4. Get expert AI-powered guidance

### One-Click Demo
```bash
curl -X POST https://auraops-735853806237.europe-north1.run.app/trigger-test
```

---

## 📂 Project Structure

```
├── backend/                    # Modular Python backend
│   ├── main.py                 # FastAPI app + routes
│   ├── config.py               # Environment & constants
│   ├── orchestrator.py         # 3-phase agent coordination
│   ├── scorecard.py            # MR comment formatter
│   ├── agents/
│   │   ├── security_agent.py   # OWASP + secrets + CVE + auto-patch
│   │   ├── greenops_agent.py   # Carbon optimization
│   │   ├── validation_agent.py # CI pipeline trigger
│   │   ├── risk_engine.py      # AI release decision
│   │   ├── compliance_agent.py # SOC2/GDPR checker
│   │   └── deploy_agent.py     # Cloud Run deployment
│   ├── models/
│   │   └── schemas.py          # Pydantic models
│   └── utils/
│       ├── gitlab_client.py    # GitLab API helpers
│       ├── history.py          # MR history storage
│       └── logger.py           # Dual console+file logging
├── dashboard-ui/               # React + Three.js 3D dashboard
├── agents/agent.yml            # GitLab Duo custom agent
├── flows/flow.yml              # GitLab Duo auto-remediation flow
├── test-backend.py             # Intentionally vulnerable demo file
├── Dockerfile                  # Multi-stage (Node + Python)
└── requirements.txt
```

---

## 🛠️ Setup & Configuration

### Environment Variables
```bash
ANTHROPIC_API_KEY=your-claude-api-key
GITLAB_TOKEN=your-gitlab-personal-access-token
GITLAB_URL=https://gitlab.com
GCP_PROJECT_ID=your-gcp-project-id
DEPLOY_REGION=europe-north1
```

### Run Locally
```bash
pip install -r requirements.txt
cd dashboard-ui && npm install && npm run build && cd ..
uvicorn backend.main:app --host 0.0.0.0 --port 8080
```

### Deploy to Cloud Run
```bash
gcloud run deploy auraops --source . --region europe-north1 --allow-unauthenticated
```

### Configure GitLab Webhook
1. Go to **Settings → Webhooks** in your GitLab project
2. Enter URL: `https://auraops-735853806237.europe-north1.run.app/webhook`
3. Check **Merge request events**
4. Save

---

## 🏆 Impact Metrics

| Metric | Value |
|--------|-------|
| **Average MTTR** | 58 days → **60 seconds** |
| **Manual triage saved** | ~30 min per vulnerability |
| **Auto-patch success** | SQL injection, hardcoded secrets, dependency CVEs |
| **Carbon savings** | Up to 15.6 kg CO₂/month per region swap |
| **Compliance automation** | 8-point SOC2/GDPR checklist per MR |

---

## 🌐 Live Demo

- **Backend API**: https://auraops-735853806237.europe-north1.run.app
- **3D Dashboard**: https://auraops-735853806237.europe-north1.run.app/dashboard
- **GitHub Mirror**: https://github.com/omshukla24/AuraOps

---

## 📜 License

MIT License — see [LICENSE](LICENSE)

---

*Built for the GitLab AI Hackathon 2026 by Om Shukla*