# AuraOps — Autonomous Release Authority

> **The AI that decides if your code deserves to ship.**

AuraOps is an enterprise-grade, AI-powered merge request analysis platform. It intercepts GitLab webhooks, runs autonomous security/compliance/sustainability agents, and delivers real-time verdicts with auto-patching capabilities — all visualized through an immersive 3D dashboard.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ GitLab Webhook → FastAPI Backend (main.py)          │
│   ├── SecurityAgent (vulnerability scanning)        │
│   ├── GreenOpsAgent (carbon-aware deployment)       │
│   ├── ValidationAgent (code quality + lint)         │
│   ├── RiskEngine (AI-powered risk scoring)          │
│   ├── ComplianceAgent (policy enforcement)          │
│   └── DeployAgent (auto-deploy approved MRs)        │
├─────────────────────────────────────────────────────┤
│ React + TypeScript + Three.js Dashboard             │
│   ├── Scene.tsx (3D spherical planet visualization) │
│   ├── Panels.tsx (glassmorphic HUD data panels)     │
│   └── App.tsx (state orchestrator + SSE handler)    │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **AI Engine** | Anthropic Claude (security analysis, risk scoring) |
| **Frontend** | React 19, TypeScript, Vite |
| **3D Visualization** | Three.js, @react-three/fiber, @react-three/drei |
| **Animation** | Framer Motion |
| **Styling** | Tailwind CSS v4 |
| **Cloud** | Google Cloud Run, Artifact Registry |
| **CI/CD** | GitLab Webhooks, Auto-deploy |

## Prerequisites

- Python 3.11+
- Node.js 22+
- Google Cloud CLI (`gcloud`)
- GitLab access token

## Quick Start

### 1. Backend

```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
python main.py
```

### 2. Frontend

```bash
cd dashboard-ui
npm install
npm run dev     # Dev server at http://localhost:5173
npm run build   # Production build → dist/
```

### 3. Full Stack (Local)

```bash
# Terminal 1 — Backend
python main.py   # Serves on :8080

# Terminal 2 — Frontend (with API proxy to backend)
cd dashboard-ui && npm run dev
```

## Deployment

```bash
# Build & deploy to Cloud Run (multi-stage Docker build)
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/auraops
gcloud run deploy auraops \
  --image gcr.io/YOUR_PROJECT_ID/auraops \
  --region europe-north1 \
  --allow-unauthenticated
```

## Project Structure

```
auraops/
├── main.py                     # FastAPI backend (1800+ lines)
├── demo_vulnerable_app.py      # Test target for security scanning
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Multi-stage: Node.js build → Python runtime
├── .env.example                # Environment template
├── dashboard-ui/               # React + TypeScript frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx            # React entry point
│       ├── App.tsx             # Main orchestrator
│       ├── types.ts            # Strict TypeScript interfaces
│       ├── index.css           # Tailwind CSS entry
│       └── components/
│           ├── Scene.tsx       # 3D planet visualization
│           └── Panels.tsx      # Glassmorphic HUD panels
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/dashboard` | GET | Serve React dashboard |
| `/api/history` | GET | MR processing history |
| `/api/events` | GET | SSE live event stream |
| `/api/metrics` | GET | Aggregate impact metrics |
| `/webhook` | POST | GitLab webhook receiver |
| `/trigger-test` | POST | Demo pipeline trigger |

## Environment Variables

```
GITLAB_TOKEN=glpat-xxx
GITLAB_URL=https://gitlab.com
GCP_PROJECT_ID=your-project-id
ANTHROPIC_API_KEY=sk-ant-xxx
```

## License

MIT
