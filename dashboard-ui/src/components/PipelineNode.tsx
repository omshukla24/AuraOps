import { useRef, useState, useMemo } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface SubBranch {
  id: string;
  label: string;
  value: string;
  dormant: [number, number, number];
  expanded: [number, number, number];
}

interface Props {
  id: string;
  label: string;
  sublabel: string;
  position: [number, number, number];
  color: string;
  isTrigger?: boolean;
  isVisible: boolean;
  branches: SubBranch[];
  expandedBubbles: string[];
  onToggleBubble: (id: string) => void;
  onTriggerClick?: () => void;
  showClickHint?: boolean;
  isScorecard?: boolean;
}

export default function PipelineNode({
  label, sublabel, position, color, isTrigger, isVisible,
  branches, expandedBubbles, onToggleBubble, onTriggerClick, showClickHint, isScorecard,
}: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const scaleVal = useRef(isTrigger ? 1 : 0);
  const [hovered, setHovered] = useState(false);
  const col = useMemo(() => new THREE.Color(color), [color]);
  const r = isTrigger ? 0.5 : 0.35;

  useFrame(({ clock }, dt) => {
    const target = isVisible ? 1 : 0;
    scaleVal.current += (target - scaleVal.current) * Math.min(1, 1.5 * dt);
    if (meshRef.current) meshRef.current.scale.setScalar(Math.max(0.001, scaleVal.current));
    if (glowRef.current) {
      const m = glowRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = scaleVal.current * (0.06 + Math.sin(clock.getElapsedTime() * 1.5) * 0.03);
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (isTrigger && onTriggerClick) onTriggerClick(); };

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={click} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        <sphereGeometry args={[r, 48, 48]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={hovered ? 1.5 : 0.6} roughness={0.1} metalness={0.8} transparent opacity={scaleVal.current} />
      </mesh>
      <mesh ref={glowRef}><sphereGeometry args={[r * 2, 32, 32]} /><meshBasicMaterial color={col} transparent opacity={0.04} side={THREE.BackSide} /></mesh>
      {isVisible && <pointLight color={color} intensity={0.6} distance={6} decay={2} />}

      {isVisible && (
        <Html position={[0, -(r + 0.5), 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '5px 12px', textAlign: 'center', fontFamily: "'Inter',sans-serif" }}>
            <div style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>{label}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}>{sublabel}</div>
          </div>
        </Html>
      )}

      {isTrigger && showClickHint && (
        <Html position={[0, -1.8, 0]} center><div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', letterSpacing: '2px', fontFamily: "'Inter',sans-serif", animation: 'pulse 2s infinite' }}>CLICK TO BEGIN ANALYSIS</div></Html>
      )}

      {isVisible && !isTrigger && !isScorecard && branches.map(b => {
        const isExp = expandedBubbles.includes(b.id);
        const off = isExp ? b.expanded : b.dormant;
        return (
          <group key={b.id}>
            <mesh position={off} onClick={(e) => { e.stopPropagation(); onToggleBubble(b.id); }} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = 'auto'; }}>
              <sphereGeometry args={[isExp ? 0.12 : 0.07, 20, 20]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isExp ? 1.5 : 0.4} roughness={0.2} metalness={0.7} />
            </mesh>
            {isExp && (
              <Html position={[off[0], off[1] + 0.35, off[2]]} center style={{ pointerEvents: 'none' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', boxShadow: '0 0 20px rgba(0,255,255,0.08)', padding: '8px 14px', fontFamily: "'Inter',sans-serif", minWidth: '120px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>{b.label}</div>
                  <div style={{ color, fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>{b.value}</div>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {isScorecard && isVisible && (
        <Html position={[0, -1.8, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '14px', boxShadow: '0 0 40px rgba(251,191,36,0.08)', padding: '16px 22px', fontFamily: "'Inter',sans-serif", width: '280px' }}>
            <div style={{ color: '#FBBf24', fontSize: '9px', fontWeight: 700, letterSpacing: '2px', borderBottom: '1px solid rgba(251,191,36,0.12)', paddingBottom: '6px', marginBottom: '8px' }}>🤖 AURAOPS — RELEASE REPORT</div>
            <div style={{ color: '#50ffb0', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>✅ APPROVED — 91% confidence</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '8px', marginBottom: '10px', lineHeight: 1.4 }}>All vulnerabilities patched. Carbon optimized. Tests passed.</div>
            {[{ l: '🔐 Security', v: 84, c: '#F97066' }, { l: '🌱 Eco', v: 82, c: '#10B981' }].map(x => (
              <div key={x.l} style={{ marginBottom: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#667', fontSize: '8px' }}>{x.l}</span><span style={{ color: x.c, fontSize: '10px', fontWeight: 700 }}>{x.v}/100</span></div>
                <div style={{ height: '2px', background: 'rgba(255,255,255,0.04)', borderRadius: '1px' }}><div style={{ width: `${x.v}%`, height: '100%', background: x.c, borderRadius: '1px' }} /></div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '6px', fontSize: '9px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#667' }}>🧪 Tests</span><span style={{ color: '#50ffb0', fontWeight: 700 }}>Passed</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}><span style={{ color: '#667' }}>🚀 Deploy</span><span style={{ color: '#06B6D4', fontWeight: 700 }}>auraops-demo.run.app</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}><span style={{ color: '#667' }}>📋 Compliance</span><span style={{ color: '#8B5CF6', fontWeight: 700 }}>8/9 passed</span></div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
