import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import AuraUniverse, { INITIAL_NODES, type NodeDef } from './components/AuraUniverse';
import './index.css';

function TypewriterTerminal({ logs, tourIndex }: { logs: string[], tourIndex: number }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    if (!logs || logs.length === 0) return;
    
    const fullText = logs.join('\n\n');
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      setDisplayedText(fullText.slice(0, currentIndex));
      currentIndex++;
      if (currentIndex > fullText.length) {
        clearInterval(interval);
      }
    }, 15); // Fast typing speed
    
    return () => clearInterval(interval);
  }, [logs, tourIndex]);

  return (
    <div className="bg-black/40 backdrop-blur-md p-3 md:p-4 rounded-lg border border-white/10 flex flex-col font-mono text-[11px] md:text-[13px] text-emerald-400 min-h-[140px] md:min-h-[180px] whitespace-pre-wrap flex-1 overflow-y-auto shadow-inner">
      <div className="opacity-90 leading-relaxed">
        {displayedText}
        <span className="inline-block w-2 h-3.5 bg-emerald-400 ml-1 align-middle animate-[blink_1s_step-end_infinite]"></span>
      </div>
    </div>
  );
}

function HistoryWindow() {
  const events = [
    { tag: 'MERGED', time: '2m ago', desc: 'Auto-patch applied (MR #42)', color: 'text-emerald-400', border: '#10B981' },
    { tag: 'REJECTED', time: '1h ago', desc: 'CPU Bloat Regression (Pipeline Blocked)', color: 'text-rose-400', border: '#F43F5E' },
    { tag: 'ANALYSIS', time: '1h 5m ago', desc: 'Security payload scan initialized', color: 'text-cyan-400', border: '#38BDF8' },
    { tag: 'MERGED', time: '5h ago', desc: 'Node.js Dependency Bump (MR #41)', color: 'text-emerald-400', border: 'rgba(255,255,255,0.1)' },
    { tag: 'SYSTEM', time: '1d ago', desc: 'AuraOps Control Plane updated', color: 'text-slate-400', border: 'rgba(255,255,255,0.1)' }
  ];

  return (
    <div className="absolute top-4 right-4 md:top-6 md:right-6 z-[100] pointer-events-auto hidden md:block">
      <div className="bg-gradient-to-br from-slate-900/40 to-black/60 backdrop-blur-md p-4 md:p-5 rounded-2xl border border-white/5 w-[280px] shadow-[0_0_50px_rgba(139,92,246,0.1)] flex flex-col gap-4 transition-all duration-300 hover:bg-slate-900/60 hover:border-white/10 hover:shadow-[0_0_50px_rgba(139,92,246,0.2)] hover:scale-[1.02]">
        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.4)]">
            <span className="text-[14px]">📜</span>
          </div>
          <h3 className="text-white text-[13px] font-bold tracking-[2px] font-['Space_Grotesk','Inter',sans-serif] uppercase text-violet-300 drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]">Audit Ledger</h3>
        </div>
        
        <div className="flex flex-col gap-4 mt-1">
          {events.map((item, i) => (
            <div key={i} className="flex flex-col gap-1.5 border-l-[3px] pl-3 py-1 transition-colors duration-300 hover:border-white/50 cursor-default group" style={{ borderColor: item.border }}>
              <div className="flex justify-between items-center w-full">
                <span className={`text-[10px] font-extrabold ${item.color} tracking-[1.5px] uppercase`}>{item.tag}</span>
                <span className="text-[9px] text-slate-500 font-mono tracking-widest group-hover:text-slate-400 transition-colors uppercase">{item.time}</span>
              </div>
              <span className="text-[13px] text-slate-300 leading-snug font-['Inter',sans-serif] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TriggerModal({ onClose, mriid, setMriid, projectId, setProjectId }: any) {
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId || 'omshukla24/AuraOps',
          mr_iid: parseInt(mriid) || 42
        })
      });
      // Optionally reset the local node rendering here, or let the server logic overwrite it
      onClose();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
      <div className="bg-slate-900 border border-white/20 p-6 rounded-2xl w-[90%] max-w-sm flex flex-col gap-4 shadow-[0_0_50px_rgba(139,92,246,0.2)]">
        <h2 className="text-white font-bold tracking-[2px] uppercase text-sm">Manual Analysis</h2>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">Project ID</label>
          <input 
            type="text" 
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-[13px] font-mono focus:outline-none focus:border-cyan-400"
            placeholder="omshukla24/AuraOps"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">Merge Request ID</label>
          <input 
            type="text" 
            value={mriid}
            onChange={(e) => setMriid(e.target.value)}
            className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-[13px] font-mono focus:outline-none focus:border-cyan-400"
            placeholder="42"
          />
        </div>
        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="flex-1 py-2 text-white/50 hover:bg-white/5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-colors">Cancel</button>
          <button onClick={handleRun} disabled={loading} className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-bold uppercase tracking-widest rounded-lg transition-colors">
            {loading ? 'Running...' : 'Run Pipeline'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tourIndex, setTourIndex] = useState(0);
  const [nodes, setNodes] = useState<NodeDef[]>(INITIAL_NODES);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [mriid, setMriid] = useState('42');
  const [projectId, setProjectId] = useState('omshukla24/AuraOps');

  useEffect(() => {
    const source = new EventSource('/api/events');
    source.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        
        setNodes((prevNodes) => {
          const nextNodes = [...prevNodes];
          
          if (payload.type === 'pipeline_start') {
            setTourIndex(1); // Jump to Security
          } else if (payload.type === 'phase_start' && payload.agents && payload.agents.length > 0) {
            const agent = payload.agents[0];
            const idx = nextNodes.findIndex(n => n.id === agent);
            if (idx !== -1) setTourIndex(idx);
          } else if (payload.type === 'pipeline_complete') {
             setTourIndex(nextNodes.findIndex(n => n.id === 'scorecard'));
          } else if (payload.type === 'agent_result') {
            const idx = nextNodes.findIndex(n => n.id === payload.agent);
            if (idx !== -1 && payload.data) {
              const node = { ...nextNodes[idx] };
              node.branches = node.branches.map(b => {
                if (payload.agent === 'security') {
                  if (b.id === 'sec-v') return { ...b, value: `${payload.data.patches_committed || 0} Patched` };
                  if (b.id === 'sec-s') return { ...b, value: `${payload.data.score || 0}/100` };
                } else if (payload.agent === 'greenops') {
                  if (b.id === 'grn-c') return { ...b, value: `${payload.data.co2_saved || 0} kg` };
                  if (b.id === 'grn-e') return { ...b, value: `${payload.data.eco_score || 0}/100` };
                  if (b.id === 'grn-r') return { ...b, value: `${payload.data.old_region || 'us-central1'} → ${payload.data.new_region || 'eu-north1'}` };
                } else if (payload.agent === 'validation') {
                  if (b.id === 'val-t') return { ...b, value: payload.data.passed ? 'Passed ✅' : 'Failed ❌' };
                } else if (payload.agent === 'risk') {
                  if (b.id === 'rsk-d') return { ...b, value: payload.data.decision || 'UNKNOWN' };
                  if (b.id === 'rsk-c') return { ...b, value: `${payload.data.confidence || 0}%` };
                } else if (payload.agent === 'compliance') {
                  if (b.id === 'cmp-s') return { ...b, value: `${payload.data.soc2_score || 0}/100` };
                  if (b.id === 'cmp-k') return { ...b, value: payload.data.overall || 'UNKNOWN' };
                } else if (payload.agent === 'deploy') {
                  if (b.id === 'dep-u') return { ...b, value: payload.data.deploy_url || "Failed" };
                }
                return b;
              });
              nextNodes[idx] = node;
            }
          }
          return nextNodes;
        });

      } catch (err) {}
    };
    return () => source.close();
  }, []);

  const handleNext = () => setTourIndex(i => Math.min(nodes.length - 1, i + 1));
  const handleBack = () => setTourIndex(i => Math.max(0, i - 1));

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-black">
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 pointer-events-none">
        <h1 className="text-xl md:text-3xl font-bold tracking-[6px] text-white font-['Space_Grotesk','Inter',sans-serif] drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" style={{ textShadow: '0 0 5px #06b6d4, 0 0 15px #06b6d4' }}>AURAOPS</h1>
        <p className="text-[8px] md:text-[10px] tracking-[2px] text-cyan-300 mt-1 uppercase font-['Space_Grotesk','Inter',sans-serif] hidden sm:block drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">Autonomous Unified Release Authority for Operations</p>
        <button 
          onClick={() => setShowTriggerModal(true)}
          className="pointer-events-auto mt-3 px-4 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/50 rounded-full text-violet-200 text-[10px] uppercase font-bold tracking-[2px] transition-all"
        >
          + Manual Trigger
        </button>
      </div>

      {showTriggerModal && (
        <TriggerModal 
          onClose={() => setShowTriggerModal(false)}
          mriid={mriid} setMriid={setMriid}
          projectId={projectId} setProjectId={setProjectId}
        />
      )}

      <HistoryWindow />

      <Canvas camera={{ position: [0, 0, 30], fov: 45 }} gl={{ antialias: true }}>
        <AuraUniverse nodes={nodes} tourIndex={tourIndex} onTourIndexChange={setTourIndex} />
      </Canvas>

      {/* Detailed Process Window Overlay Escaping 3D Projection */}
      <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-auto md:w-[28rem] pointer-events-auto z-[1000]">
        <div className="bg-gradient-to-br from-slate-900/30 to-black/40 backdrop-blur-xl p-4 md:p-6 rounded-2xl border flex flex-col gap-3 md:gap-5 max-h-[45vh] md:max-h-none animate-[border-glow_4s_ease-in-out_infinite]">
          
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="text-xl md:text-2xl bg-white/10 backdrop-blur-sm w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg border border-white/5 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              {nodes[tourIndex].icon || '⚙️'}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-bold tracking-[2px] md:tracking-[3px] text-white flex items-center gap-2 md:gap-3 uppercase font-['Space_Grotesk','Inter',sans-serif] drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                {nodes[tourIndex].label}
                <span className="text-[9px] md:text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap shadow-[0_0_10px_rgba(16,185,129,0.2)]">LIVE</span>
              </h2>
              <div className="text-slate-400 text-[10px] md:text-xs font-medium tracking-[1px] font-mono mt-0.5 uppercase truncate">
                {nodes[tourIndex].sublabel}
              </div>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-slate-300 text-[11px] md:text-[13px] leading-relaxed font-['Inter',sans-serif]">
            {nodes[tourIndex].processDesc}
          </p>
          
          {/* Terminal / Logs with Typewriter Effect */}
          <TypewriterTerminal logs={nodes[tourIndex].logs || []} tourIndex={tourIndex} />

          {/* Navigation */}
          <div className="flex gap-2 md:gap-3 mt-1 md:mt-2">
            <button 
              onClick={handleBack} 
              disabled={tourIndex === 0} 
              className="flex-1 py-2 md:py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white/70 text-[11px] md:text-[13px] font-bold tracking-widest uppercase transition-all"
            >
              PREV
            </button>
            <button 
              onClick={handleNext} 
              disabled={tourIndex === nodes.length - 1} 
              className={`flex-1 py-2 md:py-2.5 rounded-lg border text-[11px] md:text-[13px] font-bold tracking-widest uppercase transition-all ${
                tourIndex === nodes.length - 1 
                  ? 'bg-white/5 border-white/10 text-white/30 cursor-default' 
                  : 'bg-cyan-500 hover:bg-cyan-400 border-cyan-400/50 text-black shadow-[0_0_15px_rgba(6,182,212,0.6)]'
              }`}
            >
              NEXT &rarr;
            </button>
          </div>
          
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 0.35; } 50% { opacity: 0.8; } }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        @keyframes border-glow { 0%, 100% { box-shadow: 0 0 10px rgba(6, 182, 212, 0.05); border-color: rgba(255, 255, 255, 0.05); } 50% { box-shadow: 0 0 25px rgba(6, 182, 212, 0.25); border-color: rgba(34, 211, 238, 0.2); } }
      `}</style>
    </div>
  );
}
