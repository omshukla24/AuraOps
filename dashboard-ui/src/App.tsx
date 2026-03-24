import { useState, useEffect, useRef, useCallback } from 'react';
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

function _formatAgo(ts: string): string {
  if (!ts) return '—';
  const now = Date.now();
  const then = new Date(ts).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function HistoryWindow() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const resp = await fetch('/api/history');
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.slice(-5).reverse().map((h: any) => {
            const decision = h.decision || 'UNKNOWN';
            const isMerged = decision === 'APPROVE';
            const isBlocked = decision === 'BLOCK';
            const patches = h.patches_committed || 0;
            const elapsed = h.elapsed || 0;
            const ago = _formatAgo(h.timestamp);
            const desc = patches > 0
              ? `Auto-patched ${patches} vulns (MR !${h.mr_iid || '?'})`
              : isBlocked
              ? `Release Blocked — ${h.vuln_count || 0} vulns (MR !${h.mr_iid || '?'})`
              : `Analysis complete in ${elapsed}s (MR !${h.mr_iid || '?'})`;
            return {
              tag: isMerged ? 'MERGED' : isBlocked ? 'REJECTED' : 'ANALYSIS',
              time: ago,
              desc,
              color: isMerged ? 'text-emerald-400' : isBlocked ? 'text-rose-400' : 'text-cyan-400',
              border: isMerged ? '#10B981' : isBlocked ? '#F43F5E' : '#38BDF8',
            };
          });
          setEvents(mapped);
        }
      } catch { /* fallback to empty */ }
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 15000);
    return () => clearInterval(interval);
  }, []);

  if (events.length === 0) {
    events.push(
      { tag: 'SYSTEM', time: 'now', desc: 'AuraOps Control Plane ready', color: 'text-slate-400', border: 'rgba(255,255,255,0.1)' },
      { tag: 'ANALYSIS', time: '—', desc: 'Awaiting first trigger...', color: 'text-cyan-400', border: '#38BDF8' },
    );
  }

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

function DiffsPanel({ onClose }: { onClose: () => void }) {
  const [diffs, setDiffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/diffs')
      .then(r => r.json())
      .then(d => { setDiffs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
      <div className="bg-slate-900 border border-white/20 p-5 rounded-2xl w-[95%] max-w-2xl max-h-[80vh] flex flex-col gap-3 shadow-[0_0_50px_rgba(139,92,246,0.2)] overflow-hidden">
        <div className="flex justify-between items-center">
          <h2 className="text-white font-bold tracking-[2px] uppercase text-sm">🔬 Code Diffs — Before / After</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-lg">✕</button>
        </div>
        <div className="overflow-y-auto flex flex-col gap-3 pr-1">
          {loading && <p className="text-slate-400 text-sm">Loading diffs...</p>}
          {!loading && diffs.length === 0 && <p className="text-slate-400 text-sm">No diffs available. Run an analysis first.</p>}
          {diffs.map((d, i) => (
            <div key={i} className="bg-black/40 rounded-lg border border-white/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  d.patched ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>{d.patched ? 'PATCHED' : 'UNPATCHED'}</span>
                <span className="text-cyan-400 text-[11px] font-mono">{d.file}:{d.line}</span>
                <span className="text-slate-500 text-[10px]"> • {d.type} (sev: {d.severity})</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-rose-400 font-bold uppercase tracking-widest">Before</span>
                  <pre className="mt-1 text-[11px] text-rose-300/80 bg-rose-950/30 rounded p-2 overflow-x-auto border border-rose-500/10 whitespace-pre-wrap">{d.original_code}</pre>
                </div>
                <div>
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">After</span>
                  <pre className="mt-1 text-[11px] text-emerald-300/80 bg-emerald-950/30 rounded p-2 overflow-x-auto border border-emerald-500/10 whitespace-pre-wrap">{d.patched_code}</pre>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">{d.description}</p>
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

// ═══════════════════════════════════════════════════════════════════
// VOICE BUTTON — Always-on mic, barge-in, bottom-center
// ═══════════════════════════════════════════════════════════════════

function VoiceButton() {
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  // Play queued audio chunks at 24kHz
  const playNext = useCallback(() => {
    if (!audioCtxRef.current || playQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    const chunk = playQueueRef.current.shift()!;
    const buffer = audioCtxRef.current.createBuffer(1, chunk.length, 24000);
    buffer.getChannelData(0).set(chunk);
    const src = audioCtxRef.current.createBufferSource();
    src.buffer = buffer;
    src.connect(audioCtxRef.current.destination);
    src.onended = () => playNext();
    src.start();
  }, []);

  const startVoice = useCallback(async () => {
    try {
      const actx = new AudioContext({ sampleRate: 24000 });
      audioCtxRef.current = actx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const capCtx = new AudioContext({ sampleRate: 16000 });
      const source = capCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = capCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/voice`);
      wsRef.current = ws;

      ws.onopen = () => {
        setVoiceState('listening');
        source.connect(processor);
        processor.connect(capCtx.destination);
      };

      // Always send audio — never mute (barge-in support)
      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const bytes = new Uint8Array(int16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        ws.send(JSON.stringify({ type: 'audio', data: btoa(binary) }));
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'speaking_start') {
          setVoiceState('speaking');
        } else if (msg.type === 'speaking_end') {
          setVoiceState('listening');
        } else if (msg.type === 'clear_audio') {
          // Barge-in: flush playback queue so stale audio stops
          playQueueRef.current = [];
          isPlayingRef.current = false;
        } else if (msg.type === 'audio') {
          const raw = atob(msg.data);
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
          const int16 = new Int16Array(bytes.buffer);
          const float32 = new Float32Array(int16.length);
          for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;
          playQueueRef.current.push(float32);
          if (!isPlayingRef.current) playNext();
        } else if (msg.type === 'error') {
          console.error('[Voice] Error:', msg.message);
          stopVoice();
        }
        // 'connected' type — session ready, no action needed
      };

      ws.onclose = () => stopVoice();
      ws.onerror = () => stopVoice();
    } catch (err) {
      console.error('[Voice] Failed to start:', err);
      setVoiceState('idle');
    }
  }, [playNext]);

  const stopVoice = useCallback(() => {
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'close' }));
      wsRef.current.close();
    }
    wsRef.current = null;
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    playQueueRef.current = [];
    isPlayingRef.current = false;
    setVoiceState('idle');
  }, []);

  const toggle = useCallback(() => {
    if (voiceState === 'idle') startVoice();
    else stopVoice();
  }, [voiceState, startVoice, stopVoice]);

  const isActive = voiceState !== 'idle';
  const isSpeaking = voiceState === 'speaking';
  const ringColor = isSpeaking ? 'rgba(239,68,68,0.6)' : 'rgba(6,182,212,0.6)';
  const btnBg = voiceState === 'idle' ? 'rgba(15,23,42,0.7)' : isSpeaking ? 'rgba(239,68,68,0.2)' : 'rgba(6,182,212,0.2)';
  const borderCol = voiceState === 'idle' ? 'rgba(148,163,184,0.3)' : isSpeaking ? 'rgba(248,113,113,0.5)' : 'rgba(34,211,238,0.5)';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3000] flex flex-col items-center gap-2">
      {/* Status label */}
      {isActive && (
        <div className="px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[2px] uppercase" style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${borderCol}`,
          color: isSpeaking ? '#f87171' : '#22d3ee',
          animation: 'voice-label-pulse 2s ease-in-out infinite',
        }}>
          {isSpeaking ? '🔊 AI Speaking...' : '🎙️ Listening...'}
        </div>
      )}

      {/* Mic button with ring */}
      <div className="relative">
        {/* Pulse ring */}
        {isActive && (
          <div className="absolute inset-0 rounded-full" style={{
            border: `2px solid ${ringColor}`,
            animation: 'voice-ring 2s ease-out infinite',
          }} />
        )}
        <button
          onClick={toggle}
          className="relative w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-300 hover:scale-110 cursor-pointer"
          style={{
            background: btnBg,
            border: `2px solid ${borderCol}`,
            boxShadow: isActive ? `0 0 20px ${ringColor}, 0 0 40px ${ringColor}` : 'none',
            backdropFilter: 'blur(12px)',
          }}
          title={voiceState === 'idle' ? 'Start voice chat' : 'Stop voice chat'}
        >
          {voiceState === 'idle' ? '🎙️' : isSpeaking ? '🔊' : '🎙️'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CHATBOX — Text chat with Gemini via /api/chat
// ═══════════════════════════════════════════════════════════════════

function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply || 'No response.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Connection error.' }]);
    }
    setLoading(false);
  }, [input, loading]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[3000] w-14 h-14 rounded-full flex items-center justify-center text-2xl cursor-pointer hover:scale-110 transition-all"
        style={{
          background: 'rgba(15,23,42,0.7)',
          border: '2px solid rgba(139,92,246,0.4)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 0 15px rgba(139,92,246,0.15)',
        }}
        title="Open chat"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[3000] w-[340px] flex flex-col" style={{
      height: '420px',
      background: 'rgba(10,14,26,0.92)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(139,92,246,0.25)',
      borderRadius: '16px',
      boxShadow: '0 0 40px rgba(139,92,246,0.1)',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="text-[13px] font-bold tracking-[1px] text-white/90" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AURAOPS CHAT</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white/80 text-lg cursor-pointer">✕</button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5" style={{ scrollBehavior: 'smooth' }}>
        {messages.length === 0 && (
          <div className="text-white/30 text-[12px] text-center mt-8" style={{ fontFamily: "'Inter', sans-serif" }}>
            Ask AuraOps anything about your pipeline, vulnerabilities, or deployment status.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-relaxed" style={{
              background: m.role === 'user' ? 'rgba(6,182,212,0.15)' : 'rgba(139,92,246,0.12)',
              border: `1px solid ${m.role === 'user' ? 'rgba(6,182,212,0.2)' : 'rgba(139,92,246,0.15)'}`,
              color: m.role === 'user' ? '#e0f2fe' : '#e9d5ff',
              fontFamily: "'Inter', sans-serif",
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-xl text-[12px]" style={{
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.15)',
              color: '#c4b5fd',
              animation: 'pulse 1.5s infinite',
            }}>
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 rounded-lg text-[12px] text-white/90 outline-none"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontFamily: "'Inter', sans-serif",
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-3 py-2 rounded-lg text-[12px] font-bold cursor-pointer disabled:opacity-30 disabled:cursor-default transition-all hover:scale-105"
          style={{
            background: 'rgba(139,92,246,0.3)',
            border: '1px solid rgba(139,92,246,0.4)',
            color: '#c4b5fd',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tourIndex, setTourIndex] = useState(0);
  const [nodes, setNodes] = useState<NodeDef[]>(INITIAL_NODES);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [showDiffs, setShowDiffs] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [mriid, setMriid] = useState('42');
  const [projectId, setProjectId] = useState('omshukla24/AuraOps');
  const [scorecardData, setScorecardData] = useState<any>(null);
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set());

  useEffect(() => {
    const source = new EventSource('/api/events');
    source.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        
        setNodes((prevNodes) => {
          const nextNodes = [...prevNodes];
          
          if (payload.type === 'pipeline_start') {
            setTourIndex(1); // Jump to Security
            setCompletedAgents(new Set()); // Reset on new pipeline
          } else if (payload.type === 'phase_start' && payload.agents && payload.agents.length > 0) {
            const agent = payload.agents[0];
            const idx = nextNodes.findIndex(n => n.id === agent);
            if (idx !== -1) setTourIndex(idx);
          } else if (payload.type === 'pipeline_complete') {
             setScorecardData(payload.data || {});
             setTourIndex(nextNodes.findIndex(n => n.id === 'scorecard'));
             setCompletedAgents(prev => new Set([...prev, 'scorecard']));
          } else if (payload.type === 'agent_result') {
            const idx = nextNodes.findIndex(n => n.id === payload.agent);
            if (idx !== -1 && payload.data) {
              // Track completed agents for animation
              setCompletedAgents(prev => new Set([...prev, payload.agent]));
              const node = { ...nextNodes[idx] };
              if (payload.agent === 'security') {
                node.logs = [
                  '> AST Scan completed seamlessly.',
                  `> Overall Security Rating: ${payload.data.score ?? 100}/100`,
                  `> Detected Issues: ${payload.data.count || 0} vulnerabilities`,
                  ...(payload.data.vulns?.map((v: any) => `[DETECTED] ${v.type} | Severity: ${v.severity}`) || []),
                  `> Auto-Remediation: ${payload.data.patches_committed || 0} patches generated and validated.`
                ];
              } else if (payload.agent === 'greenops') {
                node.logs = [
                  '> Carbon allocation profiling complete.',
                  `> Infrastructure adjusted to region: ${payload.data.new_region || 'standard'}`,
                  `> Avoided emissions: ${payload.data.co2_saved || 0} kg CO₂ / yr`,
                  ...(payload.data.changes_made?.map((c: any) => `[OPTIMIZED] ${c}`) || []),
                  `> Final Eco-Score rating: ${payload.data.eco_score || 0}/100`
                ];
              } else if (payload.agent === 'validation') {
                node.logs = [
                  '> Post-patch CI/CD pipeline triggered manually.',
                  `> Status: ${payload.data.passed ? 'SUCCESS' : 'FAILURE'}`,
                  `> Build artifact verified against master branch.`
                ];
              } else if (payload.agent === 'risk') {
                node.logs = [
                  '> Global risk synthesis matrix evaluated.',
                  `> Neural Model Confidence: ${payload.data.confidence || 0}%`,
                  `> Final Release Decision: ${payload.data.decision || 'N/A'}`
                ];
              } else if (payload.agent === 'compliance') {
                node.logs = [
                  '> SOC2 & GDPR heuristic sweep complete.',
                  ...(payload.data.items?.filter((i: any) => i.status === 'FAIL').map((i: any) => `[VIOLATION] ${i.category}: ${i.check}`) || []),
                  `> ${payload.data.audit_notes || 'Regulatory footprint is clean.'}`
                ];
              } else if (payload.agent === 'deploy') {
                node.logs = [
                  '> Google Cloud Run push initiated.',
                  `> Active Revision: ${payload.data.deploy_url || ''}`,
                  '> All systems nominal. Traffic shifting complete.'
                ];
              }

              node.branches = node.branches.map(b => {
                if (payload.agent === 'security') {
                  if (b.id === 'sec-v') return { ...b, value: `${payload.data.patches_committed || 0} Patched`, details: payload.data.vulns?.length ? payload.data.vulns.slice(0, 3).map((v: any) => `▶ ${v.type}`) : ['No vulnerabilities found'] };
                  if (b.id === 'sec-s') return { ...b, value: `${payload.data.score ?? 100}/100`, details: [`${payload.data.critical_count || 0} Critical`, `${payload.data.high_count || 0} High`] };
                  if (b.id === 'sec-m') return { ...b, value: 'Complete', details: ['AST Scan finished', 'Secrets evaluated'] };
                } else if (payload.agent === 'greenops') {
                  if (b.id === 'grn-c') return { ...b, value: `${payload.data.co2_saved || 0} kg`, details: ['Estimated yearly savings'] };
                  if (b.id === 'grn-e') return { ...b, value: `${payload.data.eco_score || 0}/100`, details: payload.data.changes_made?.length ? payload.data.changes_made.slice(0, 2) : ['Optimal baseline'] };
                  if (b.id === 'grn-r') return { ...b, value: `${payload.data.old_region || 'auto'} → ${payload.data.new_region || 'auto'}`, details: ['Traffic routed based on grid intensity'] };
                } else if (payload.agent === 'validation') {
                  if (b.id === 'val-t') return { ...b, value: payload.data.passed ? 'Passed ✅' : 'Failed ❌', details: ['Integration suite executed'] };
                  if (b.id === 'val-d') return { ...b, value: 'Complete', details: [payload.data.pipeline_url || 'Pipeline synchronized'] };
                } else if (payload.agent === 'risk') {
                  if (b.id === 'rsk-d') return { ...b, value: payload.data.decision || 'UNKNOWN', details: payload.data.decision === 'APPROVE' ? ['Auto-deploy engaged'] : ['Human review requested'] };
                  if (b.id === 'rsk-c') return { ...b, value: `${payload.data.confidence || 0}%`, details: ['Derived from LLM certainty and test coverage'] };
                } else if (payload.agent === 'compliance') {
                  if (b.id === 'cmp-s') return { ...b, value: `${payload.data.soc2_score || 0}/100`, details: [payload.data.audit_notes || 'All schemas validated'] };
                  if (b.id === 'cmp-k') return { ...b, value: payload.data.overall || 'UNKNOWN', details: ['Checklist synchronized'] };
                } else if (payload.agent === 'deploy') {
                  if (b.id === 'dep-u') return { ...b, value: 'Live 🚀', details: [payload.data.deploy_url || "Service activated"] };
                  if (b.id === 'dep-r') return { ...b, value: payload.data.region || 'us-central1', details: ['Target deployment zone'] };
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
      {/* Logo — top left, bigger */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 pointer-events-none">
        <h1 className="text-3xl md:text-5xl font-bold tracking-[8px] text-white font-['Space_Grotesk','Inter',sans-serif] drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]" style={{ textShadow: '0 0 8px #06b6d4, 0 0 20px #06b6d4, 0 0 40px #06b6d4' }}>AURAOPS</h1>
        <p className="text-[10px] md:text-[13px] tracking-[3px] text-cyan-300 mt-1.5 uppercase font-['Space_Grotesk','Inter',sans-serif] hidden sm:block drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]">Autonomous Unified Release Authority for Operations</p>
      </div>

      {/* Action Buttons — top center, horizontal */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 items-center">
        <button 
          onClick={() => setShowTriggerModal(true)}
          className="pointer-events-auto px-5 py-2 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/50 rounded-full text-violet-200 text-[11px] uppercase font-bold tracking-[2px] transition-all hover:scale-105 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
        >
          + Manual Trigger
        </button>
        <button 
          onClick={async () => {
            setRescanning(true);
            try { await fetch('/api/rescan', { method: 'POST' }); } catch {}
            setTimeout(() => setRescanning(false), 2000);
          }}
          disabled={rescanning}
          className="pointer-events-auto px-5 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 rounded-full text-cyan-200 text-[11px] uppercase font-bold tracking-[2px] transition-all disabled:opacity-50 hover:scale-105 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
        >
          {rescanning ? '↻ Rescanning...' : '↻ Rescan'}
        </button>
        <button 
          onClick={() => setShowDiffs(true)}
          className="pointer-events-auto px-5 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 rounded-full text-emerald-200 text-[11px] uppercase font-bold tracking-[2px] transition-all hover:scale-105 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
        >
          🔬 View Diffs
        </button>
      </div>

      {showTriggerModal && (
        <TriggerModal 
          onClose={() => setShowTriggerModal(false)}
          mriid={mriid} setMriid={setMriid}
          projectId={projectId} setProjectId={setProjectId}
        />
      )}

      {showDiffs && <DiffsPanel onClose={() => setShowDiffs(false)} />}

      <HistoryWindow />

      <Canvas camera={{ position: [0, 0, 30], fov: 45 }} gl={{ antialias: true }}>
        <AuraUniverse nodes={nodes} tourIndex={tourIndex} onTourIndexChange={setTourIndex} scorecardData={scorecardData} completedAgents={completedAgents} />
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
        @keyframes voice-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes voice-ring { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.8); opacity: 0; } }
        @keyframes voice-label-pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
      `}</style>

      <VoiceButton />
      <ChatBox />
    </div>
  );
}
