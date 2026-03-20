import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MRResult, VulnDiff, PipelineState } from '../types';

// ── Helpers ──
function scoreColor(s: number): string {
  return s >= 70 ? 'text-emerald-400' : s >= 40 ? 'text-amber-400' : 'text-red-400';
}
function decisionBadge(d: string): string {
  if (d === 'APPROVE') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (d === 'NEEDS_FIX') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-red-500/10 text-red-400 border-red-500/20';
}
function decisionLabel(d: string): string {
  return d === 'APPROVE' ? 'Approved' : d === 'NEEDS_FIX' ? 'Needs Fix' : 'Blocked';
}

// ── Header ──
interface HeaderProps {
  isLive: boolean;
  demoStatus: 'idle' | 'running' | 'done';
  onRunDemo: () => void;
}
export function Header({ isLive, demoStatus, onRunDemo }: HeaderProps) {
  return (
    <header className="flex items-center justify-between py-3 border-b border-white/5 mb-5">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/20">✦</div>
        <div>
          <h1 className="text-xl font-bold tracking-wide bg-gradient-to-r from-cyan-400 to-cyan-100 bg-clip-text text-transparent" style={{ fontFamily: 'Inter, sans-serif' }}>STELLAR INTELLIGENCE</h1>
          <p className="text-[11px] text-slate-500 font-medium tracking-[2px] uppercase">Autonomous Release Authority</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-4 py-2 rounded-full glass-panel min-w-[280px]">
        <span className="text-slate-500 text-sm">🔍</span>
        <input type="text" placeholder="Search nodes, pipelines..." className="bg-transparent border-none outline-none text-white/90 text-sm w-full placeholder:text-slate-600" />
        <span className="text-slate-500 text-sm cursor-pointer hover:text-cyan-400 transition-colors">🎤</span>
      </div>
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRunDemo}
          disabled={demoStatus === 'running'}
          className="px-5 py-2 rounded-xl border-none cursor-pointer text-sm font-bold bg-gradient-to-r from-cyan-400 to-violet-600 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {demoStatus === 'running' ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Scanning...</>
            : demoStatus === 'done' ? '✅ Complete' : '⚡ Initiate Scan'}
        </motion.button>
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/8 text-emerald-400 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/30 animate-[pulse_2s_infinite]" />
          {isLive ? 'ONLINE' : 'DEMO'}
        </div>
      </div>
    </header>
  );
}

// ── Impact Banner ──
export function ImpactBanner({ data }: { data: MRResult[] }) {
  const vulns = data.reduce((s, d) => s + (d.patches_committed || 0), 0);
  const mins = data.reduce((s, d) => s + (d.time_saved_min || 0), 0);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 px-6 mb-4 flex items-center justify-around gap-3 bg-gradient-to-r from-cyan-500/5 via-violet-500/5 to-emerald-500/5">
      <div className="text-center">
        <div className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">{vulns}</div>
        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">Vulnerabilities Patched</div>
      </div>
      <div className="w-px h-9 bg-white/5" />
      <div className="text-center">
        <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">{mins}</div>
        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">Minutes Saved</div>
      </div>
      <div className="w-px h-9 bg-white/5" />
      <div className="text-center">
        <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-sky-200 bg-clip-text text-transparent">{data.length}</div>
        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">MRs Secured</div>
      </div>
    </motion.div>
  );
}

// ── Metric Cards ──
export function MetricCards({ data }: { data: MRResult[] }) {
  const metrics = [
    { icon: '📊', value: data.length, label: 'MRs Processed', color: 'text-cyan-400' },
    { icon: '🔐', value: data.reduce((s, d) => s + (d.patches_committed || 0), 0), label: 'Vulns Patched', color: 'text-red-400' },
    { icon: '🔒', value: data.length ? Math.round(data.reduce((s, d) => s + d.sec_score, 0) / data.length) : 0, label: 'Avg Security', color: 'text-violet-400' },
    { icon: '🌍', value: data.reduce((s, d) => s + (d.co2_saved || 0), 0).toFixed(1), label: 'CO₂ Saved (kg)', color: 'text-emerald-400' },
    { icon: '🚀', value: data.filter(d => d.decision === 'APPROVE').length, label: 'Approvals', color: 'text-amber-400' },
  ];
  return (
    <div className="grid grid-cols-5 gap-3.5 mb-5">
      {metrics.map((m, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass-panel p-4">
          <div className="text-lg mb-2">{m.icon}</div>
          <div className={`text-3xl font-bold tracking-tighter leading-none mb-1 ${m.color}`}>{m.value}</div>
          <div className="text-xs font-semibold text-slate-400">{m.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Pipeline Viz ──
const AGENTS: Record<string, { icon: string; label: string }> = {
  security: { icon: '🔐', label: 'Security' },
  greenops: { icon: '🌍', label: 'GreenOps' },
  validation: { icon: '✅', label: 'Validate' },
  risk: { icon: '🧠', label: 'Risk' },
  compliance: { icon: '📋', label: 'Comply' },
  deploy: { icon: '🚀', label: 'Deploy' },
};

export function PipelineViz({ pipelineState }: { pipelineState: PipelineState }) {
  const { phase, agents } = pipelineState;
  const nodeClass = (name: string, ph: number) => {
    const a = agents[name];
    const base = 'w-[68px] min-h-[52px] rounded-lg flex flex-col items-center justify-center gap-0.5 text-[9px] font-semibold text-center border-[1.5px] p-1 transition-all duration-400';
    if (a?.status === 'running') return `${base} bg-cyan-500/8 border-cyan-400 text-cyan-400 shadow-lg shadow-cyan-500/20 animate-[nodePulse_1.5s_ease-in-out_infinite]`;
    if (a?.status === 'done' || phase > ph) return `${base} bg-emerald-400/6 border-emerald-400 text-emerald-400 shadow-lg shadow-emerald-500/15`;
    return `${base} bg-slate-800/50 border-white/8 text-slate-500`;
  };
  const arrowClass = (ph: number) => `text-base mx-1 pt-3 ${phase >= ph ? 'text-cyan-400' : 'text-slate-600'}`;

  const phases = [
    { label: 'Trigger', ph: 1, agents: [{ key: 'webhook', icon: '⚡', label: 'Webhook' }] },
    { label: 'Phase 1', ph: 1, agents: ['security', 'greenops', 'validation'].map(k => ({ key: k, ...AGENTS[k] })) },
    { label: 'Phase 2', ph: 2, agents: [{ key: 'risk', ...AGENTS.risk }] },
    { label: 'Phase 3', ph: 3, agents: ['compliance', 'deploy'].map(k => ({ key: k, ...AGENTS[k] })) },
    { label: 'Result', ph: 4, agents: [{ key: 'scorecard', icon: '📊', label: 'Scorecard' }] },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-4 px-5 mb-5">
      <div className="text-[13px] font-semibold text-slate-400 mb-3.5 flex items-center gap-2">🏗️ Agent Pipeline</div>
      <div className="flex items-center overflow-x-auto">
        {phases.map((p, pi) => (
          <div key={pi} className="contents">
            {pi > 0 && <span className={arrowClass(p.ph)}>→</span>}
            <div className="flex flex-col items-center gap-1">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">{p.label}</div>
              <div className="flex gap-1">
                {p.agents.map(a => (
                  <div key={a.key} className={nodeClass(a.key, p.ph)}>
                    <span className="text-[15px]">{a.icon}</span>{a.label}
                    {agents[a.key]?.time && <span className="text-[8px] text-slate-500">{agents[a.key].time}s</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Vulnerability Diff Viewer ──
export function VulnDiffViewer({ diffs }: { diffs: VulnDiff[] }) {
  const [open, setOpen] = useState(true);
  if (!diffs.length) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-4 mb-5">
      <div className="flex justify-between items-center mb-2.5 cursor-pointer" onClick={() => setOpen(!open)}>
        <h2 className="text-sm font-bold flex items-center gap-2">🔀 Vulnerability Patches ({diffs.length})</h2>
        <span className="text-[11px] text-slate-500">{open ? '▼ Collapse' : '▶ Expand'}</span>
      </div>
      <AnimatePresence>{open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-col gap-2.5 overflow-hidden">
          {diffs.map((d, i) => (
            <div key={i} className="border border-white/5 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-black/25 flex-wrap">
                <span className="font-bold text-xs">{d.type}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${d.severity === 'crit' ? 'bg-red-500/12 text-red-400' : 'bg-amber-500/12 text-amber-400'}`}>
                  {d.severity === 'crit' ? 'Critical' : 'High'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{d.file}</span>
                <span className="text-[10px] text-emerald-400 font-semibold ml-auto">✅ {d.confidence}%</span>
              </div>
              <div className="grid grid-cols-2">
                <div className="p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all bg-red-500/3 border-r border-white/5 text-red-300">
                  <div className="text-[9px] font-bold uppercase tracking-wide mb-1 text-red-400 font-sans">⛔ Vulnerable</div>{d.before}
                </div>
                <div className="p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all bg-emerald-500/3 text-emerald-300">
                  <div className="text-[9px] font-bold uppercase tracking-wide mb-1 text-emerald-400 font-sans">✅ Patched</div>{d.after}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}</AnimatePresence>
    </motion.div>
  );
}

// ── History Table ──
export function HistoryTable({ data }: { data: MRResult[] }) {
  const rows = [...data].reverse();
  return (
    <div className="glass-panel overflow-hidden mb-5">
      <div className="p-3.5 px-4 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-slate-400">📋 MR History</h2>
        <span className="text-[10px] text-slate-600">Auto-refreshes every 30s</span>
      </div>
      <table className="w-full border-collapse">
        <thead><tr className="bg-black/20">
          {['MR#', 'Title', 'Decision', 'Security', 'Patches', 'Eco', 'CO₂', 'Deploy'].map(h => (
            <th key={h} className="text-left px-3.5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
          ))}
        </tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i} className="border-b border-white/5 hover:bg-cyan-500/3 transition-colors">
            <td className="px-3.5 py-2.5 text-xs"><span className="font-bold text-cyan-400">!{r.mr_iid}</span></td>
            <td className="px-3.5 py-2.5 text-xs max-w-[200px] truncate text-slate-400" title={r.mr_title}>{r.mr_title}</td>
            <td className="px-3.5 py-2.5 text-xs"><span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase border ${decisionBadge(r.decision)}`}>{decisionLabel(r.decision)}</span></td>
            <td className={`px-3.5 py-2.5 text-xs font-bold ${scoreColor(r.sec_score)}`}>{r.sec_score}</td>
            <td className="px-3.5 py-2.5 text-xs">{(r.patches_committed || 0) > 0 ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">✅ {r.patches_committed}</span> : <span className="text-slate-600">—</span>}</td>
            <td className={`px-3.5 py-2.5 text-xs font-bold ${scoreColor(r.eco_score)}`}>{r.eco_score}</td>
            <td className="px-3.5 py-2.5 text-xs text-slate-400">{r.co2_saved > 0 ? `${r.co2_saved} kg` : '—'}</td>
            <td className="px-3.5 py-2.5 text-xs">{r.deploy_url ? <a href={r.deploy_url} target="_blank" rel="noopener" className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors no-underline">Live ↗</a> : <span className="text-slate-600">—</span>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ── Live Feed ──
export function LiveFeed({ log }: { log: { message: string; timestamp: string }[] }) {
  if (!log.length) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-4 mt-5">
      <div className="flex justify-between items-center mb-2.5">
        <h2 className="text-sm font-bold">⚡ Live Agent Feed</h2>
        <span className="text-[10px] text-slate-500">{log.length} events</span>
      </div>
      <div className="max-h-40 overflow-y-auto text-[11px] font-mono leading-relaxed text-slate-400">
        {log.map((e, i) => (
          <div key={i} className="py-px">
            <span className="text-slate-600 mr-1.5">{e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : ''}</span>
            {e.message}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
