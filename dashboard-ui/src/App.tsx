import { useState, useEffect, useCallback } from 'react';
import Scene from './components/Scene';
import {
  Header, ImpactBanner, MetricCards, PipelineViz,
  HistoryTable, VulnDiffViewer, LiveFeed,
} from './components/Panels';
import type { PipelineNode, PipelineState, AgentState, MRResult, VulnDiff } from './types';
import './index.css';

// ── Mock Data ──
const MOCK_DATA: MRResult[] = [
  { mr_iid: 38, mr_title: "fix: database connection pooling", author: "sarah", decision: "BLOCK", confidence: 92, sec_score: 22, eco_score: 65, co2_saved: 0, deploy_url: null, elapsed: 38, timestamp: "2026-03-18T08:12:00Z", patches_committed: 0, vuln_count: 4, time_saved_min: 0 },
  { mr_iid: 39, mr_title: "feat: add user authentication flow", author: "alex", decision: "NEEDS_FIX", confidence: 68, sec_score: 44, eco_score: 58, co2_saved: 0.8, deploy_url: null, elapsed: 42, timestamp: "2026-03-18T10:24:00Z", patches_committed: 1, vuln_count: 3, time_saved_min: 25 },
  { mr_iid: 40, mr_title: "refactor: optimize user queries", author: "sarah", decision: "APPROVE", confidence: 95, sec_score: 96, eco_score: 88, co2_saved: 1.2, deploy_url: "https://auraops-app-v40.run.app", elapsed: 35, timestamp: "2026-03-18T14:05:00Z", patches_committed: 1, vuln_count: 1, time_saved_min: 15 },
  { mr_iid: 41, mr_title: "feat: payment gateway integration", author: "mike", decision: "APPROVE", confidence: 88, sec_score: 82, eco_score: 76, co2_saved: 2.4, deploy_url: "https://auraops-app-v41.run.app", elapsed: 51, timestamp: "2026-03-19T07:15:00Z", patches_committed: 2, vuln_count: 2, time_saved_min: 45 },
  { mr_iid: 42, mr_title: "feat: add user payment flow", author: "devname", decision: "APPROVE", confidence: 91, sec_score: 84, eco_score: 82, co2_saved: 2.4, deploy_url: "https://auraops-demo.run.app", elapsed: 43, timestamp: "2026-03-19T09:23:00Z", patches_committed: 3, vuln_count: 3, time_saved_min: 70 },
  { mr_iid: 43, mr_title: "chore: update CI for multi-region deploy", author: "alex", decision: "APPROVE", confidence: 94, sec_score: 100, eco_score: 95, co2_saved: 5.8, deploy_url: "https://auraops-app-v43.run.app", elapsed: 29, timestamp: "2026-03-19T11:01:00Z", patches_committed: 0, vuln_count: 0, time_saved_min: 0 },
];

const DEMO_VULNS: VulnDiff[] = [
  { type: 'SQL Injection', severity: 'crit', confidence: 96, file: 'demo_vulnerable_app.py:38', before: 'query = f"SELECT * FROM users WHERE id = {user_id}"', after: 'query = "SELECT * FROM users WHERE id = ?"\ncursor.execute(query, (user_id,))' },
  { type: 'Hardcoded API Key', severity: 'crit', confidence: 98, file: 'demo_vulnerable_app.py:29', before: 'STRIPE_API_KEY = "sk_live_4eC39..."', after: 'STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")' },
  { type: 'Command Injection', severity: 'crit', confidence: 94, file: 'demo_vulnerable_app.py:56', before: 'subprocess.run(f"ping -c 4 {host}", shell=True)', after: 'subprocess.run(["ping", "-c", "4", host])' },
  { type: 'Cross-Site Scripting', severity: 'high', confidence: 91, file: 'demo_vulnerable_app.py:71', before: 'html = f"<h1>Welcome, {username}!</h1>"', after: 'html = f"<h1>Welcome, {escape(username)}!</h1>"' },
  { type: 'Path Traversal', severity: 'high', confidence: 89, file: 'demo_vulnerable_app.py:84', before: 'filepath = os.path.join("/app/uploads", filename)', after: 'safe = secure_filename(filename)\nfilepath = os.path.join("/app/uploads", safe)' },
];

// ── Initial 3D Nodes ──
function createNodes(): PipelineNode[] {
  return [
    { id: 'core', position: [0, 0, 0], label: 'Core API', type: 'core', status: 'idle', color: '#00a0b0', emissive: '#00f0ff', orbitRadius: 0, orbitSpeed: 0, angle: 0 },
    { id: 'security', position: [5, 0.5, 0], label: 'SecurityAgent', type: 'security', status: 'idle', color: '#f97066', emissive: '#ff4444', orbitRadius: 5.0, orbitSpeed: 0.15, angle: 0 },
    { id: 'greenops', position: [-3, -1, 4], label: 'GreenOpsAgent', type: 'greenops', status: 'idle', color: '#10b981', emissive: '#50ffb0', orbitRadius: 5.5, orbitSpeed: 0.12, angle: Math.PI * 0.4 },
    { id: 'validation', position: [2, 1.5, -4], label: 'ValidationAgent', type: 'validation', status: 'idle', color: '#f59e0b', emissive: '#ffc107', orbitRadius: 4.8, orbitSpeed: 0.18, angle: Math.PI * 0.8 },
    { id: 'risk', position: [-4, -0.5, -2], label: 'RiskEngine', type: 'risk', status: 'idle', color: '#8b5cf6', emissive: '#9d05ff', orbitRadius: 5.2, orbitSpeed: 0.1, angle: Math.PI * 1.2 },
    { id: 'compliance', position: [1, -1.5, 3], label: 'ComplianceAgent', type: 'compliance', status: 'idle', color: '#3b82f6', emissive: '#00aaff', orbitRadius: 4.5, orbitSpeed: 0.14, angle: Math.PI * 1.6 },
  ];
}

export default function App() {
  const [data, setData] = useState<MRResult[]>(MOCK_DATA);
  const [isLive, setIsLive] = useState(false);
  const [demoStatus, setDemoStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [diffs, setDiffs] = useState<VulnDiff[]>(DEMO_VULNS.slice(0, 2));
  const [pipeline, setPipeline] = useState<PipelineState>({ phase: 0, agents: {} });
  const [liveLog, setLiveLog] = useState<{ message: string; timestamp: string }[]>([]);
  const [nodes, setNodes] = useState<PipelineNode[]>(createNodes);

  const addLog = (msg: string) =>
    setLiveLog(prev => [{ message: msg, timestamp: new Date().toISOString() }, ...prev].slice(0, 50));

  // ── SSE ──
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events');
      es.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data);
          if (evt.type === 'heartbeat') return;
          if (evt.type === 'pipeline_start') setPipeline({ phase: 0, agents: {} });
          else if (evt.type === 'phase_start') {
            setPipeline(s => {
              const ag = { ...s.agents };
              (evt.agents || []).forEach((a: string) => { ag[a] = { status: 'running' }; });
              return { phase: evt.phase || 1, agents: ag };
            });
            setNodes(prev => prev.map(n => (evt.agents || []).includes(n.type) ? { ...n, status: 'running' as const } : n));
          }
          else if (evt.type === 'agent_complete') {
            setPipeline(s => ({ ...s, agents: { ...s.agents, [evt.agent]: { status: 'done' as const, time: evt.time } } }));
            setNodes(prev => prev.map(n => n.type === evt.agent ? { ...n, status: 'done' as const } : n));
          }
          else if (evt.type === 'pipeline_complete') {
            setPipeline(s => {
              const ag: Record<string, AgentState> = {};
              Object.keys(s.agents).forEach(k => { ag[k] = { ...s.agents[k], status: 'done' as const }; });
              return { phase: 4, agents: ag };
            });
            setNodes(prev => prev.map(n => ({ ...n, status: 'done' as const })));
            setDemoStatus('done');
            setTimeout(() => setDemoStatus('idle'), 3000);
          }
        } catch { /* ignore */ }
      };
      es.onerror = () => es?.close();
    } catch { /* SSE unavailable */ }
    return () => { es?.close(); };
  }, []);

  // ── Demo Runner ──
  const runDemo = async () => {
    setDemoStatus('running');
    setPipeline({ phase: 0, agents: {} });
    setDiffs([]);
    setNodes(prev => prev.map(n => ({ ...n, status: 'idle' as const })));
    addLog('📋 Processing MR !44: feat: add user payment & auth flow');

    try {
      const r = await fetch('/trigger-test', { method: 'POST' });
      if (!r.ok) throw new Error();
    } catch {
      const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

      addLog('⚡ Phase 1: SecurityAgent + GreenOpsAgent + ValidationAgent');
      setNodes(prev => prev.map(n => ['security', 'greenops', 'validation'].includes(n.type) ? { ...n, status: 'running' as const } : n));
      setPipeline({ phase: 1, agents: { security: { status: 'running' }, greenops: { status: 'running' }, validation: { status: 'running' } } });
      await wait(600);

      addLog('🔐 Scanning vulnerabilities...');
      for (const v of DEMO_VULNS) {
        setDiffs(p => [...p, v]);
        addLog(`  ✅ Patched ${v.type} (${v.confidence}%)`);
        await wait(350);
      }

      setNodes(prev => prev.map(n => ['security', 'greenops', 'validation'].includes(n.type) ? { ...n, status: 'done' as const } : n));
      setPipeline({ phase: 1, agents: { security: { status: 'done', time: 4.1 }, greenops: { status: 'done', time: 1.9 }, validation: { status: 'done', time: 2.3 } } });
      await wait(500);

      addLog('🧠 Phase 2: RiskEngine decision');
      setNodes(prev => prev.map(n => n.type === 'risk' ? { ...n, status: 'running' as const } : n));
      setPipeline(s => ({ ...s, phase: 2, agents: { ...s.agents, risk: { status: 'running' } } }));
      await wait(1200);

      setNodes(prev => prev.map(n => n.type === 'risk' ? { ...n, status: 'done' as const } : n));
      setPipeline(s => ({ ...s, agents: { ...s.agents, risk: { status: 'done', time: 2.8 } } }));
      await wait(400);

      addLog('📋 Phase 3: Compliance + Deploy');
      setNodes(prev => prev.map(n => ['compliance'].includes(n.type) ? { ...n, status: 'running' as const } : n));
      setPipeline(s => ({ ...s, phase: 3, agents: { ...s.agents, compliance: { status: 'running' }, deploy: { status: 'running' } } }));
      await wait(800);

      setNodes(prev => prev.map(n => ({ ...n, status: 'done' as const })));
      setPipeline(s => ({ phase: 4, agents: { ...s.agents, compliance: { status: 'done', time: 1.7 }, deploy: { status: 'done', time: 3.1 } } }));
      setData(prev => [{ mr_iid: 44, mr_title: 'feat: add user payment & auth flow', author: 'demo-dev', decision: 'NEEDS_FIX', confidence: 87, sec_score: 62, eco_score: 91, co2_saved: 2.1, deploy_url: 'https://auraops-demo-v44.run.app', elapsed: 14, timestamp: new Date().toISOString(), patches_committed: 5, vuln_count: 5, time_saved_min: 130 }, ...prev]);
      addLog('✅ Complete — 5 vulns patched, 130 min saved');
      setDemoStatus('done');
      setTimeout(() => setDemoStatus('idle'), 4000);
    }
  };

  // ── Fetch Data ──
  const fetchData = useCallback(async () => {
    try { const r = await fetch('/api/history'); if (r.ok) { const j = await r.json(); if (Array.isArray(j) && j.length > 0) { setData(j); setIsLive(true); return; } } } catch { /* fallback */ }
    setData(MOCK_DATA); setIsLive(false);
  }, []);
  useEffect(() => { fetchData(); const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, [fetchData]);

  return (
    <>
      <Scene nodes={nodes} onCoreClick={runDemo} />
      <div className="relative z-2 pointer-events-none">
        <div className="max-w-[1400px] mx-auto px-6 py-4 [&>*]:pointer-events-auto">
          <Header isLive={isLive} demoStatus={demoStatus} onRunDemo={runDemo} />
          <ImpactBanner data={data} />
          <PipelineViz pipelineState={pipeline} />
          <VulnDiffViewer diffs={diffs} />
          <MetricCards data={data} />
          <HistoryTable data={data} />
          <LiveFeed log={liveLog} />
        </div>
      </div>
    </>
  );
}
