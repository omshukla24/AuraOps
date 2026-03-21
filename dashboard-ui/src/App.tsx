import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import AuraUniverse from './components/AuraUniverse';
import './index.css';

export default function App() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: '#000000' }}>
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold tracking-[4px] bg-gradient-to-r from-cyan-400 to-cyan-100 bg-clip-text text-transparent" style={{ fontFamily: "'Space Grotesk','Inter',sans-serif" }}>AuraOps</h1>
        <p className="text-[10px] tracking-[2px] text-cyan-700/50 mt-1 uppercase" style={{ fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Autonomous Unified Release Authority for Operations</p>
      </div>

      <Canvas camera={{ position: [0, 0, 30], fov: 45 }} gl={{ antialias: true }}>
        <AuraUniverse />
      </Canvas>

      <style>{`@keyframes pulse { 0%,100% { opacity: 0.35; } 50% { opacity: 0.8; } }`}</style>
    </div>
  );
}
