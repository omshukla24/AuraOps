import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PipelineNode } from '../types';

// ── Spherical Planet ──
interface PlanetProps {
  node: PipelineNode;
  onClick?: () => void;
}

function Planet({ node, onClick }: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const radius = node.type === 'core' ? 1.6 : 0.5;
  const color = useMemo(() => new THREE.Color(node.color), [node.color]);
  const emissive = useMemo(() => new THREE.Color(node.emissive), [node.emissive]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) meshRef.current.rotation.y = t * 0.3;
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = node.type === 'core'
        ? 0.06 + Math.sin(t * 1.5) * 0.04
        : node.status === 'running' ? 0.12 + Math.sin(t * 3) * 0.06 : 0.06;
    }
    if (groupRef.current && node.type === 'core') {
      groupRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
    }
    if (groupRef.current && node.type !== 'core' && node.orbitRadius > 0) {
      node.angle += node.orbitSpeed * 0.005;
      groupRef.current.position.set(
        Math.cos(node.angle) * node.orbitRadius,
        node.position[1] + Math.sin(t * 0.5 + node.angle) * 0.3,
        Math.sin(node.angle) * node.orbitRadius * 0.7
      );
    }
  });

  return (
    <group ref={groupRef} position={node.position}>
      <mesh ref={meshRef} onClick={onClick} castShadow>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={node.status === 'running' ? 0.8 : 0.4}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[radius * 1.4, 48, 48]} />
        <meshBasicMaterial color={emissive} transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
      <Html
        position={[0, node.type === 'core' ? -(radius + 0.8) : radius + 0.6, 0]}
        center
        style={{
          color: node.type === 'core' ? '#00f0ff' : '#e0e8f0',
          fontSize: node.type === 'core' ? '13px' : '10px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: node.type === 'core' ? 700 : 600,
          whiteSpace: 'nowrap',
          textShadow: '0 0 8px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: node.type === 'core' ? '2px' : undefined,
        }}
      >
        {node.type === 'core' ? 'CORE API' : node.label}
      </Html>
    </group>
  );
}

// ── Orbital Ring ──
function OrbitalRing({ radius }: { radius: number }) {
  const points = useMemo((): [number, number, number][] => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 100; i++) {
      const a = (i / 100) * Math.PI * 2;
      pts.push([Math.cos(a) * radius, 0, Math.sin(a) * radius * 0.7]);
    }
    return pts;
  }, [radius]);

  return <Line points={points} color="#00f0ff" transparent opacity={0.06} lineWidth={1} />;
}

// ── Inner Scene Content (must be inside Canvas) ──
interface SceneContentProps {
  nodes: PipelineNode[];
  onCoreClick: () => void;
}

function SceneContent({ nodes, onCoreClick }: SceneContentProps) {
  const core = nodes.find(n => n.type === 'core');
  const orbiters = nodes.filter(n => n.type !== 'core');

  return (
    <>
      <Stars radius={100} depth={50} count={2500} factor={3} saturation={0} fade speed={1} />
      <ambientLight intensity={0.3} color="#334466" />
      <pointLight position={[0, 3, 5]} intensity={1.2} color="#00f0ff" distance={30} />
      <pointLight position={[-5, -2, -3]} intensity={0.5} color="#9d05ff" distance={25} />
      <pointLight position={[5, 2, -4]} intensity={0.3} color="#50ffb0" distance={20} />

      {orbiters.map(n => <OrbitalRing key={`ring-${n.id}`} radius={n.orbitRadius} />)}
      {core && <Planet node={core} onClick={onCoreClick} />}
      {orbiters.map(n => <Planet key={n.id} node={n} />)}

      <OrbitControls enableDamping dampingFactor={0.05} enableZoom enablePan={false} maxDistance={40} minDistance={8} />
    </>
  );
}

// ── Main Scene Export ──
interface SceneProps {
  nodes: PipelineNode[];
  onCoreClick: () => void;
}

export default function Scene({ nodes, onCoreClick }: SceneProps) {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 18], fov: 60 }}>
        <SceneContent nodes={nodes} onCoreClick={onCoreClick} />
      </Canvas>
    </div>
  );
}
