# 🤖 AuraOps — Autonomous Unified Release Authority for Operations

> **"Scanners find 200 vulnerabilities. Developers fix 3. The rest rot until audit day."**
>
> AuraOps doesn't just scan — **it fixes.** Push vulnerable code to GitLab. Within 60 seconds, AuraOps auto-patches SQL injections, removes hardcoded secrets, bumps CVE-affected dependencies, verifies each fix actually resolves the issue, generates regression tests so the vulnerability can never come back, and posts a full scorecard with before/after diffs.
>
> **6 agents. 3 phases. Zero developer action. The AI that decides if your code deserves to ship.**

---

## 🏗️ Architecture

```
GitLab MR Event (Webhook)
        ↓
AuraOps Orchestrator (Cloud Run)
        ↓
   ╔════════════════════════════════════════╗
   ║  PHASE 1 — Parallel Analysis          ║
   ║  ┌──────────┐ ┌──────────┐ ┌────────┐ ║
   ║  │ Security │ │ GreenOps │ │ Valid. │ ║
   ║  │  Agent   │ │  Agent   │ │ Agent  │ ║
   ║  └────┬─────┘ └────┬─────┘ └───┬────┘ ║
   ╚═══════╪════════════╪═══════════╪══════╝
           ↓            ↓           ↓
   ╔════════════════════════════════════════╗
   ║  PHASE 2 — AI Release Decision        ║
   ║  ┌────────────────────────────────┐    ║
   ║  │       🧠 Risk Engine           │    ║
   ║  │   APPROVE / NEEDS_FIX / BLOCK  │    ║
   ║  └────────────────────────────────┘    ║
   ╚════════════════════════════════════════╝
           ↓
   ╔════════════════════════════════════════╗
   ║  PHASE 3 — Compliance + Deploy        ║
   ║  ┌────────────┐  ┌─────────────────┐  ║
   ║  │ Compliance │  │  Deploy Agent   │  ║
   ║  │   Agent    │  │ (Cloud Run +    │  ║
   ║  │ SOC2/GDPR  │  │  Smoke Test)    │  ║
   ║  └────────────┘  └─────────────────┘  ║
   ╚════════════════════════════════════════╝
           ↓
   📋 MR Scorecard Comment (with before/after diffs)
   📊 3D Dashboard Updated
```

---

## 🔐 The 6 Agents

| Agent | What It Does | Key Feature |
|-------|-------------|-------------|
| **🔐 SecurityAgent** | OWASP vuln scan + secrets detection via Claude AI | **Auto-patches** each vulnerability with real commits, generates regression guard tests |
| **🌱 GreenOpsAgent** | Carbon footprint analysis of CI/infrastructure | Swaps high-carbon GCP regions, upgrades instance types, enables scale-to-zero |
| **🧪 ValidationAgent** | Triggers CI pipeline, polls for results | Parses pass/fail, reports in scorecard |
| **🧠 RiskEngine** | AI-powered release decision (APPROVE/NEEDS_FIX/BLOCK) | Claude-powered with rule-based fallback |
| **📋 ComplianceAgent** | SOC2 & GDPR compliance checklist | Automated evidence collection per check |
| **🚀 DeployAgent** | Cloud Run build + deploy + smoke test | Auto-rollback on failed smoke test |

---

## ⚡ How It Works

1. **Developer creates a Merge Request** with code changes
2. **GitLab webhook** fires → hits AuraOps Cloud Run endpoint
3. **Phase 1** (parallel): SecurityAgent scans for OWASP vulns + secrets + CVEs, GreenOpsAgent checks carbon efficiency, ValidationAgent triggers CI
4. **SecurityAgent auto-patches** each vulnerability:
   - Commits the fix to the MR branch
   - Generates a regression guard test
   - Shows before/after diff in scorecard
5. **Phase 2**: RiskEngine synthesizes all data → APPROVE, NEEDS_FIX, or BLOCK
6. **Phase 3** (parallel): ComplianceAgent generates SOC2/GDPR checklist, DeployAgent deploys on APPROVE
7. **Full scorecard** posted as MR comment with:
   - Per-vulnerability fix loop (Found → Patched → Verified → Time Saved)
   - Token cost tracking
   - Per-agent timing
   - Compliance checklist with evidence

**Total time: ~15-60 seconds. Zero developer action.**

---

## 🎮 Demo Instructions

### Quick Demo (One-Click)
```bash
curl -X POST https://auraops-735853806237.europe-north1.run.app/trigger-test
```
This triggers a mock MR with pre-built vulnerable code through the full 6-agent pipeline.

### Full Demo (Real MR)
1. Fork this project or create a branch
2. Add a file with vulnerable code (see `test-backend.py` for examples)
3. Open a Merge Request → AuraOps auto-triggers via webhook
4. Watch the scorecard appear as an MR comment within 60 seconds

### Dashboard
🔗 **Live:** [https://auraops-735853806237.europe-north1.run.app/dashboard](https://auraops-735853806237.europe-north1.run.app/dashboard)

Interactive 3D pipeline visualization built with React + Three.js showing:
- Real-time agent activity feed
- MR processing history
- CO₂ savings tracker
- Security score trends

---

## 🗂️ Project Structure

```
├── backend/                    # Modular Python backend
│   ├── main.py                 # FastAPI app + routes
│   ├── config.py               # Environment + constants
│   ├── orchestrator.py          # 3-phase parallel coordination
│   ├── scorecard.py             # MR comment formatter
│   ├── agents/
│   │   ├── security_agent.py    # OWASP scan + auto-patch + CVE scan
│   │   ├── greenops_agent.py    # Carbon footprint optimization
│   │   ├── validation_agent.py  # CI pipeline trigger + polling
│   │   ├── risk_engine.py       # AI release decisions
│   │   ├── compliance_agent.py  # SOC2/GDPR checklist
│   │   └── deploy_agent.py      # Cloud Run deployment
│   ├── models/
│   │   └── schemas.py           # Pydantic data models
│   └── utils/
│       ├── gitlab_client.py     # GitLab API helpers
│       ├── history.py           # MR history storage
│       └── logger.py            # Dual console + file logging
├── dashboard-ui/               # React + Three.js 3D dashboard
├── agents/agent.yml            # GitLab Duo custom agent definition
├── flows/flow.yml              # GitLab Duo auto-remediation flow
├── main.py                     # Legacy monolith (kept for reference)
├── test-backend.py             # Demo vulnerable code for testing
├── Dockerfile                  # Multi-stage build (Node + Python)
├── requirements.txt            # Python dependencies
└── demo_vulnerable_app.py      # Extended demo payloads
```

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.11 + FastAPI + asyncio |
| AI Engine | Anthropic Claude (Sonnet) |
| Frontend | React + Three.js + Vite |
| Deployment | Google Cloud Run (europe-north1, low-carbon) |
| CI/CD | GitLab CI |
| SCM Integration | GitLab API v4 |
| Agent Platform | GitLab Duo Agent + Flow |

---

## 🌍 Impact Metrics

- **Auto-patching**: Fixes SQL injections, XSS, command injection, hardcoded secrets, path traversal, and dependency CVEs — automatically
- **Time saved**: ~25-35 minutes per vulnerability (vs manual triage)
- **Carbon optimization**: Routes deployments to low-carbon GCP regions (europe-north1: 7 gCO₂eq/kWh vs us-central1: 440 gCO₂eq/kWh)
- **Regression prevention**: Auto-generated test files prevent fixed vulnerabilities from being reintroduced
- **Compliance**: Automated SOC2/GDPR evidence collection

---

## 📄 Environment Variables

```env
ANTHROPIC_API_KEY=your_claude_api_key
GITLAB_TOKEN=your_gitlab_personal_access_token
GITLAB_URL=https://gitlab.com
GCP_PROJECT_ID=your_gcp_project_id
DEPLOY_REGION=europe-north1
```

See `.env.example` for the full template.

---

## 📜 License

MIT License — see [LICENSE](LICENSE)

---

*Built for the [GitLab AI Hackathon](https://gitlab.com/gitlab-ai-hackathon) by [@omshukla24](https://gitlab.com/omshukla24)*