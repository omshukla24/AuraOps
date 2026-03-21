import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import AuraUniverse, { TOUR_NODES } from './components/AuraUniverse';
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

export default function App() {
  const [tourIndex, setTourIndex] = useState(0);

  const handleNext = () => setTourIndex(i => Math.min(TOUR_NODES.length - 1, i + 1));
  const handleBack = () => setTourIndex(i => Math.max(0, i - 1));

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-black">
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 pointer-events-none">
        <h1 className="text-xl md:text-2xl font-bold tracking-[4px] bg-gradient-to-r from-cyan-400 to-cyan-100 bg-clip-text text-transparent font-['Space_Grotesk','Inter',sans-serif]">AuraOps</h1>
        <p className="text-[8px] md:text-[10px] tracking-[2px] text-cyan-700/50 mt-1 uppercase font-['Space_Grotesk','Inter',sans-serif] hidden sm:block">Autonomous Unified Release Authority for Operations</p>
      </div>

      <Canvas camera={{ position: [0, 0, 30], fov: 45 }} gl={{ antialias: true }}>
        <AuraUniverse tourIndex={tourIndex} />
      </Canvas>

      {/* Detailed Process Window Overlay Escaping 3D Projection */}
      <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-auto md:w-[28rem] pointer-events-auto z-[1000]">
        <div className="bg-gradient-to-br from-slate-900/30 to-black/40 backdrop-blur-xl p-4 md:p-6 rounded-2xl border border-white/10 flex flex-col gap-3 md:gap-5 shadow-[0_8px_32px_0_rgba(0,255,255,0.05)] max-h-[45vh] md:max-h-none">
          
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="text-xl md:text-2xl bg-white/10 backdrop-blur-sm w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg border border-white/5 shrink-0">
              {TOUR_NODES[tourIndex].icon || '⚙️'}
            </div>
            <div className="min-w-0">
              <h2 className="text-white m-0 text-base md:text-xl font-semibold font-['Inter',sans-serif] truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {TOUR_NODES[tourIndex].label}
              </h2>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed m-0 font-['Inter',sans-serif] hidden sm:block drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {TOUR_NODES[tourIndex].processDesc || "Processing metadata..."}
          </p>
          
          {/* Terminal / Logs with Typewriter Effect */}
          <TypewriterTerminal logs={TOUR_NODES[tourIndex].logs || []} tourIndex={tourIndex} />

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button 
              onClick={handleBack} 
              disabled={tourIndex === 0} 
              style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: tourIndex === 0 ? '#475569' : '#fff', cursor: tourIndex === 0 ? 'default' : 'pointer', border: 'none', fontSize: '13px', fontWeight: 600, fontFamily: "'Inter', sans-serif", transition: 'all 0.2s' }}>
              &larr; PREV
            </button>
            <button 
              onClick={handleNext} 
              disabled={tourIndex === TOUR_NODES.length - 1} 
              style={{ flex: 1, padding: '12px', borderRadius: '8px', background: tourIndex === TOUR_NODES.length - 1 ? 'rgba(255,255,255,0.05)' : '#06B6D4', color: tourIndex === TOUR_NODES.length - 1 ? '#475569' : '#000', cursor: tourIndex === TOUR_NODES.length - 1 ? 'default' : 'pointer', border: 'none', fontSize: '13px', fontWeight: 700, fontFamily: "'Inter', sans-serif", transition: 'all 0.2s' }}>
              NEXT &rarr;
            </button>
          </div>
          
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 0.35; } 50% { opacity: 0.8; } }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
      `}</style>
    </div>
  );
}
