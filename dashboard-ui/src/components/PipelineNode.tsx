import { useRef, useState, useMemo } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html, RoundedBox, MeshDistortMaterial, MeshTransmissionMaterial, Float } from '@react-three/drei';
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
  isProcessing?: boolean;
}

export default function PipelineNode({
  label, sublabel, position, color, isTrigger, isVisible,
  branches, expandedBubbles, onToggleBubble, onTriggerClick, showClickHint, isScorecard, isProcessing
}: Props) {
  const meshRef = useRef<THREE.Group>(null);
  const fluidMatRef = useRef<any>(null);
  const meteorRef = useRef<THREE.Group>(null);
  const scaleVal = useRef(isTrigger ? 1 : 0);
  const [hovered, setHovered] = useState(false);
  const col = useMemo(() => new THREE.Color(color), [color]);
  const r = isTrigger ? 0.5 : 0.45;

  const meteors = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => {
      const angle = (i / 15) * Math.PI * 2;
      const dist = r * 3;
      const yOff = Math.sin(angle * 3) * 0.3;
      return { pos: [Math.cos(angle) * dist, yOff, Math.sin(angle) * dist] as [number, number, number], scale: 0.05 + Math.random() * 0.05 };
    });
  }, [r]);

  useFrame(({ clock }, dt) => {
    const target = isVisible ? 1 : 0;
    scaleVal.current += (target - scaleVal.current) * Math.min(1, 1.5 * dt);
    
    if (meshRef.current) meshRef.current.scale.setScalar(Math.max(0.001, scaleVal.current));
    
    if (fluidMatRef.current && isVisible) {
      if (isProcessing) {
        const pulse = 0.5 + Math.abs(Math.sin(clock.getElapsedTime() * 4)) * 1.5;
        fluidMatRef.current.emissiveIntensity = hovered ? 2.5 : pulse;
      } else {
        fluidMatRef.current.emissiveIntensity = hovered ? 1.5 : 0.8;
      }
    }
    if (meteorRef.current && isVisible) {
      meteorRef.current.rotation.y += dt * 0.8;
      meteorRef.current.rotation.z = Math.sin(clock.getElapsedTime()) * 0.1;
      meteorRef.current.rotation.x = Math.cos(clock.getElapsedTime() * 0.8) * 0.1;
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (isTrigger && onTriggerClick) onTriggerClick(); };

  return (
    <group position={position}>
      <Float speed={1.5} rotationIntensity={0.6} floatIntensity={0.8} floatingRange={[-0.15, 0.15]}>
        <group ref={meshRef} onClick={click} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
          {/* Jelly Fluid Sphere */}
          <mesh>
            <sphereGeometry args={[r * 0.8, 32, 32]} />
            <MeshDistortMaterial ref={fluidMatRef} color={col} emissive={col} emissiveIntensity={0.8} distort={0.5} speed={3} roughness={0.2} transparent opacity={scaleVal.current} />
          </mesh>
          {/* Glass Trapping Box */}
          <RoundedBox args={[r * 2.2, r * 2.2, r * 2.2]} radius={0.1} smoothness={4}>
            <MeshTransmissionMaterial color={col} transmission={0.9} opacity={1} transparent thickness={0.5} roughness={0.1} />
          </RoundedBox>
        </group>
      </Float>
      
      {/* Meteor Rings */}
      {isTrigger && isVisible && (
        <group ref={meteorRef}>
          {meteors.map((m, i) => (
            <mesh key={i} position={m.pos}>
              <dodecahedronGeometry args={[m.scale]} />
              <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.5} roughness={0.4} />
            </mesh>
          ))}
        </group>
      )}



      {isVisible && !isScorecard && (
        <Html position={[0, -(r + 0.8), 0]} center distanceFactor={15} style={{ pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', border: `1px solid ${color}40`, borderRadius: '8px', padding: '0.5vw 1vw', textAlign: 'center', fontFamily: "'Inter',sans-serif", whiteSpace: 'nowrap', boxShadow: `0 0 15px ${color}30` }}>
            <div style={{ color: '#fff', fontSize: 'clamp(14px, 1.2vw, 24px)', fontWeight: 700, textShadow: `0 0 8px ${color}80` }}>{label}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(11px, 0.9vw, 18px)' }}>{sublabel}</div>
          </div>
        </Html>
      )}

      {isTrigger && showClickHint && (
        <Html position={[0, -2.5, 0]} center distanceFactor={15}>
          <div style={{ color: '#22d3ee', fontSize: 'clamp(12px, 1vw, 20px)', letterSpacing: '2px', fontWeight: 600, fontFamily: "'Inter',sans-serif", animation: 'pulse-glow 2s infinite', whiteSpace: 'nowrap', textShadow: '0 0 10px #22d3ee, 0 0 20px #06b6d4' }}>CLICK TO RECORD EVENT</div>
          <style>{`@keyframes pulse-glow { 0%, 100% { opacity: 0.4; text-shadow: 0 0 5px #22d3ee; } 50% { opacity: 1; text-shadow: 0 0 15px #22d3ee, 0 0 30px #06b6d4; } }`}</style>
        </Html>
      )}

      {isVisible && !isTrigger && !isScorecard && branches.map(b => {
        const isExp = expandedBubbles.includes(b.id);
        const off = isExp ? b.expanded : b.dormant;
        return (
          <group key={b.id}>
            <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5} floatingRange={[-0.08, 0.08]}>
              <mesh position={off} onClick={(e) => { e.stopPropagation(); onToggleBubble(b.id); }} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = 'auto'; }}>
                <sphereGeometry args={[isExp ? 0.6 : 0.2, 32, 32]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isExp ? 2.0 : 0.6} roughness={0.2} metalness={0.7} />
              </mesh>
            </Float>
            {isExp && (
              <Html position={[off[0], off[1] + 1.2, off[2]]} center distanceFactor={15} style={{ pointerEvents: 'none' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)', border: `1px solid ${color}50`, borderRadius: '10px', boxShadow: `0 0 25px ${color}30`, padding: '0.6vw 1vw', fontFamily: "'Inter',sans-serif", minWidth: 'clamp(120px, 10vw, 200px)', whiteSpace: 'nowrap' }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(10px, 0.8vw, 16px)', letterSpacing: '1px', textTransform: 'uppercase' }}>{b.label}</div>
                  <div style={{ color, fontSize: 'clamp(15px, 1.2vw, 24px)', fontWeight: 700, marginTop: '2px', textShadow: `0 0 10px ${color}` }}>{b.value}</div>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {isScorecard && isVisible && (
        <Html position={[r + 1, 0, 0]} distanceFactor={15} style={{ pointerEvents: 'none', transform: 'translate3d(0, -50%, 0)' }}>
          <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '14px', boxShadow: '0 0 40px rgba(251,191,36,0.08)', padding: '1.2vw 1.5vw', fontFamily: "'Inter',sans-serif", width: 'clamp(280px, 25vw, 400px)', whiteSpace: 'nowrap' }}>
            <div style={{ color: '#FBBf24', fontSize: 'clamp(12px, 1vw, 18px)', fontWeight: 700, letterSpacing: '2px', borderBottom: '1px solid rgba(251,191,36,0.12)', paddingBottom: '6px', marginBottom: '8px' }}>🤖 AURAOPS — RELEASE REPORT</div>
            <div style={{ color: '#50ffb0', fontSize: 'clamp(15px, 1.2vw, 24px)', fontWeight: 700, marginBottom: '6px' }}>✅ APPROVED — 91% confidence</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(12px, 1vw, 18px)', marginBottom: '12px', lineHeight: 1.4, whiteSpace: 'normal' }}>All vulnerabilities patched. Infrastructure optimized. Tests passed.</div>
            {[{ l: '🔐 Security', v: 84, c: '#F97066' }, { l: '🌱 Sustainability', v: 82, c: '#10B981' }].map(x => (
              <div key={x.l} style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}><span style={{ color: '#8899aa', fontSize: 'clamp(11px, 0.9vw, 16px)' }}>{x.l}</span><span style={{ color: x.c, fontSize: 'clamp(13px, 1.1vw, 20px)', fontWeight: 700 }}>{x.v}/100</span></div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}><div style={{ width: `${x.v}%`, height: '100%', background: x.c, borderRadius: '2px' }} /></div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '8px', fontSize: 'clamp(11px, 0.9vw, 16px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8899aa' }}>🧪 Tests</span><span style={{ color: '#50ffb0', fontWeight: 700 }}>Passed ✅</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}><span style={{ color: '#8899aa' }}>🚀 Deploy</span><span style={{ color: '#06B6D4', fontWeight: 700 }}>auraops-demo.run.app</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}><span style={{ color: '#8899aa' }}>📋 Compliance</span><span style={{ color: '#8B5CF6', fontWeight: 700 }}>8/9 passed</span></div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
