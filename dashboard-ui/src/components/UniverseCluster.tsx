import { useRef, useMemo, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';

// ── Agent Node Definition ──
interface AgentNode {
  id: string;
  label: string;
  type: 'core' | 'security' | 'greenops' | 'validation' | 'risk' | 'compliance' | 'deploy';
  color: string;
  emissive: string;
  orbitRadius: number;
  orbitSpeed: number;
  startAngle: number;
  yOffset: number;
  radius: number;
  description: string;
}

const AGENTS: AgentNode[] = [
  { id: 'core', label: 'AURA Core', type: 'core', color: '#00a0b0', emissive: '#00f0ff', orbitRadius: 0, orbitSpeed: 0, startAngle: 0, yOffset: 0, radius: 1.8, description: 'Central Intelligence Hub' },
  { id: 'security', label: 'SecurityAgent', type: 'security', color: '#f97066', emissive: '#ff4444', orbitRadius: 5.5, orbitSpeed: 0.12, startAngle: 0, yOffset: 0.4, radius: 0.55, description: 'Vulnerability Scanner & Auto-Patcher' },
  { id: 'greenops', label: 'GreenOpsAgent', type: 'greenops', color: '#10b981', emissive: '#50ffb0', orbitRadius: 6.0, orbitSpeed: 0.09, startAngle: Math.PI * 0.4, yOffset: -0.3, radius: 0.5, description: 'Carbon-Aware Deployment Optimizer' },
  { id: 'validation', label: 'ValidationAgent', type: 'validation', color: '#f59e0b', emissive: '#ffc107', orbitRadius: 5.0, orbitSpeed: 0.15, startAngle: Math.PI * 0.8, yOffset: 0.8, radius: 0.45, description: 'Code Quality & Lint Enforcer' },
  { id: 'risk', label: 'RiskEngine', type: 'risk', color: '#8b5cf6', emissive: '#9d05ff', orbitRadius: 5.8, orbitSpeed: 0.07, startAngle: Math.PI * 1.2, yOffset: -0.6, radius: 0.6, description: 'AI Risk Scoring & Decision Engine' },
  { id: 'compliance', label: 'ComplianceAgent', type: 'compliance', color: '#3b82f6', emissive: '#00aaff', orbitRadius: 4.8, orbitSpeed: 0.13, startAngle: Math.PI * 1.6, yOffset: 0.2, radius: 0.5, description: 'Policy & Regulatory Gate' },
];

// ── Planetary Body ──
interface PlanetaryBodyProps {
  agent: AgentNode;
  onSelect: (agent: AgentNode) => void;
  isSelected: boolean;
}

function PlanetaryBody({ agent, onSelect, isSelected }: PlanetaryBodyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef(agent.startAngle);
  const [hovered, setHovered] = useState(false);

  const color = useMemo(() => new THREE.Color(agent.color), [agent.color]);
  const emissiveColor = useMemo(() => new THREE.Color(agent.emissive), [agent.emissive]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Self-rotation
    if (meshRef.current) {
      meshRef.current.rotation.y = t * (agent.type === 'core' ? 0.15 : 0.4);
      meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
    }

    // Atmospheric glow pulse
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const base = hovered || isSelected ? 0.15 : 0.06;
      mat.opacity = base + Math.sin(t * 2 + agent.startAngle) * 0.04;
    }

    // Core breathing
    if (groupRef.current && agent.type === 'core') {
      groupRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.03);
    }

    // Orbital motion for satellites
    if (groupRef.current && agent.type !== 'core') {
      angleRef.current += agent.orbitSpeed * 0.004;
      const a = angleRef.current;
      groupRef.current.position.set(
        Math.cos(a) * agent.orbitRadius,
        agent.yOffset + Math.sin(t * 0.6 + agent.startAngle) * 0.4,
        Math.sin(a) * agent.orbitRadius * 0.7
      );
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(agent);
  };

  return (
    <group
      ref={groupRef}
      position={agent.type === 'core' ? [0, 0, 0] : [agent.orbitRadius, agent.yOffset, 0]}
    >
      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        <sphereGeometry args={[agent.radius, 64, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={hovered || isSelected ? 1.0 : 0.5}
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>

      {/* Atmospheric glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[agent.radius * 1.5, 48, 48]} />
        <meshBasicMaterial color={emissiveColor} transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>

      {/* Inner ring for core */}
      {agent.type === 'core' && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[agent.radius * 1.8, 0.02, 16, 100]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.3} />
        </mesh>
      )}

      {/* Label */}
      <Html
        position={[0, -(agent.radius + 0.5), 0]}
        center
        style={{
          color: hovered || isSelected ? agent.emissive : '#c8d8e8',
          fontSize: agent.type === 'core' ? '14px' : '10px',
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          fontWeight: agent.type === 'core' ? 700 : 600,
          whiteSpace: 'nowrap',
          textShadow: `0 0 12px ${agent.emissive}88`,
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: agent.type === 'core' ? '3px' : '1px',
          textTransform: 'uppercase' as const,
          transition: 'color 0.3s ease',
        }}
      >
        {agent.label}
      </Html>
    </group>
  );
}

// ── Orbital Ring ──
function OrbitalRing({ radius, color = '#00f0ff', opacity = 0.05 }: { radius: number; color?: string; opacity?: number }) {
  const points = useMemo((): [number, number, number][] => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push([Math.cos(a) * radius, 0, Math.sin(a) * radius * 0.7]);
    }
    return pts;
  }, [radius]);

  return <Line points={points} color={color} transparent opacity={opacity} lineWidth={0.8} />;
}


// ── Info Tooltip (appears when a planet is selected) ──
function AgentInfoPanel({ agent, onClose }: { agent: AgentNode; onClose: () => void }) {
  return (
    <Html center position={[0, 3.5, 0]} style={{ pointerEvents: 'auto' }}>
      <div
        onClick={onClose}
        style={{
          background: 'rgba(5, 5, 20, 0.85)',
          border: `1px solid ${agent.emissive}44`,
          borderRadius: '12px',
          padding: '16px 24px',
          minWidth: '220px',
          backdropFilter: 'blur(16px)',
          cursor: 'pointer',
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
        }}
      >
        <div style={{ color: agent.emissive, fontSize: '13px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, marginBottom: '6px' }}>
          {agent.label}
        </div>
        <div style={{ color: '#8899aa', fontSize: '11px', lineHeight: '1.5' }}>
          {agent.description}
        </div>
        <div style={{ color: '#445566', fontSize: '9px', marginTop: '8px', letterSpacing: '1px' }}>
          CLICK TO DISMISS
        </div>
      </div>
    </Html>
  );
}

// ── Main UniverseCluster Export ──
export default function UniverseCluster() {
  const [selectedAgent, setSelectedAgent] = useState<AgentNode | null>(null);
  const core = AGENTS.find(a => a.type === 'core')!;
  const satellites = AGENTS.filter(a => a.type !== 'core');

  return (
    <>
      {/* Deep-space starfield */}
      <Stars radius={200} depth={80} count={4000} factor={4} saturation={0} fade speed={0.8} />

      {/* Lighting rig */}
      <ambientLight intensity={0.2} color="#1a2040" />
      <pointLight position={[0, 4, 6]} intensity={1.5} color="#00f0ff" distance={40} decay={2} />
      <pointLight position={[-6, -3, -4]} intensity={0.6} color="#9d05ff" distance={30} decay={2} />
      <pointLight position={[6, 2, -5]} intensity={0.4} color="#50ffb0" distance={25} decay={2} />
      <pointLight position={[0, -5, 3]} intensity={0.3} color="#ff4444" distance={20} decay={2} />

      {/* Orbital rings */}
      {satellites.map(s => (
        <OrbitalRing key={`ring-${s.id}`} radius={s.orbitRadius} color={s.emissive} opacity={0.04} />
      ))}

      {/* Core planet */}
      <PlanetaryBody
        agent={core}
        onSelect={setSelectedAgent}
        isSelected={selectedAgent?.id === core.id}
      />

      {/* Satellite planets */}
      {satellites.map(s => (
        <PlanetaryBody
          key={s.id}
          agent={s}
          onSelect={setSelectedAgent}
          isSelected={selectedAgent?.id === s.id}
        />
      ))}

      {/* Info panel for selected agent */}
      {selectedAgent && (
        <AgentInfoPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </>
  );
}
