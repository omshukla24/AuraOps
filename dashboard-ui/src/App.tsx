import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import UniverseCluster from './components/UniverseCluster';
import './index.css';

export default function App() {
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {/* Floating title overlay — completely independent of 3D space */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h1
          className="text-2xl font-bold tracking-[4px] bg-gradient-to-r from-cyan-400 to-cyan-100 bg-clip-text text-transparent"
          style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
        >
          AURA Ops
        </h1>
        <p
          className="text-[10px] tracking-[2px] text-cyan-700/60 mt-1 uppercase"
          style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
        >
          Autonomous Unified Release Authority for Operations
        </p>
      </div>

      {/* Full-screen immersive 3D Canvas */}
      <Canvas camera={{ position: [0, 2, 20], fov: 55 }}>
        <UniverseCluster />
        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          enableZoom
          enablePan={false}
          maxDistance={50}
          minDistance={8}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}
