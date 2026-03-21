import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import AuraUniverse, { TOUR_NODES } from './components/AuraUniverse';
import './index.css';

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

      {/* Persistent 2D Overlay Escaping 3D Projection */}
      <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto', zIndex: 1000 }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)', padding: '12px 24px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={handleBack} disabled={tourIndex === 0} style={{ color: tourIndex === 0 ? '#555' : '#fff', cursor: tourIndex === 0 ? 'default' : 'pointer', background: 'none', border: 'none', fontSize: '14px', fontWeight: 600 }}>
            &larr; BACK
          </button>
          <div style={{ color: '#06B6D4', fontSize: '13px', fontWeight: 700, minWidth: '150px', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>
            {TOUR_NODES[tourIndex].label}
          </div>
          <button onClick={handleNext} disabled={tourIndex === TOUR_NODES.length - 1} style={{ color: tourIndex === TOUR_NODES.length - 1 ? '#555' : '#fff', cursor: tourIndex === TOUR_NODES.length - 1 ? 'default' : 'pointer', background: 'none', border: 'none', fontSize: '14px', fontWeight: 600 }}>
            NEXT &rarr;
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity: 0.35; } 50% { opacity: 0.8; } }`}</style>
    </div>
  );
}
