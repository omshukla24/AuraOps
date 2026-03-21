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
    <div style={{ background: '#020617', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: '13px', color: '#10b981', minHeight: '180px', whiteSpace: 'pre-wrap' }}>
      <div style={{ opacity: 0.9, lineHeight: '1.6' }}>
        {displayedText}
        <span style={{ display: 'inline-block', width: '8px', height: '14px', background: '#10b981', marginLeft: '4px', verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }}></span>
      </div>
    </div>
  );
}

export default function App() {
  const [tourIndex, setTourIndex] = useState(0);

  const handleNext = () => setTourIndex(i => Math.min(TOUR_NODES.length - 1, i + 1));
  const handleBack = () => setTourIndex(i => Math.max(0, i - 1));

  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: '#000000' }}>
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold tracking-[4px] bg-gradient-to-r from-cyan-400 to-cyan-100 bg-clip-text text-transparent" style={{ fontFamily: "'Space Grotesk','Inter',sans-serif" }}>AuraOps</h1>
        <p className="text-[10px] tracking-[2px] text-cyan-700/50 mt-1 uppercase" style={{ fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Autonomous Unified Release Authority for Operations</p>
      </div>

      <Canvas camera={{ position: [0, 0, 30], fov: 45 }} gl={{ antialias: true }}>
        <AuraUniverse tourIndex={tourIndex} />
      </Canvas>

      {/* Detailed Process Window Overlay Escaping 3D Projection */}
      <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', width: '28rem', pointerEvents: 'auto', zIndex: 1000 }}>
        <div style={{ background: 'rgba(5, 8, 15, 0.85)', backdropFilter: 'blur(20px)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px', background: 'rgba(255,255,255,0.1)', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
              {TOUR_NODES[tourIndex].icon || '⚙️'}
            </div>
            <div>
              <h2 style={{ color: '#fff', margin: 0, fontSize: '20px', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                {TOUR_NODES[tourIndex].label}
              </h2>
            </div>
          </div>
          
          {/* Description */}
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: 0, fontFamily: "'Inter', sans-serif" }}>
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
