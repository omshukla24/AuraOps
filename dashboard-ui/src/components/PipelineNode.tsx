import { useRef, useState, useMemo } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html, RoundedBox, MeshDistortMaterial, Float, Edges } from '@react-three/drei';
import * as THREE from 'three';

export interface SubBranch {
  id: string;
  label: string;
  value: string;
  details?: string[];
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
  onNodeClick?: () => void;
  showClickHint?: boolean;
  isScorecard?: boolean;
  isProcessing?: boolean;
  scorecardData?: any;
}

export default function PipelineNode({
  label, sublabel, position, color, isTrigger, isVisible,
  branches, expandedBubbles, onToggleBubble, onTriggerClick, onNodeClick, showClickHint, isScorecard, isProcessing,
  scorecardData
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
        // High visibility pulse for the fluid
        const pulse = 0.8 + Math.abs(Math.sin(clock.getElapsedTime() * 4)) * 1.2;
        fluidMatRef.current.emissiveIntensity = hovered ? 2.5 : pulse;
      } else {
        fluidMatRef.current.emissiveIntensity = hovered ? 1.5 : 0.6;
      }
    }
    if (meteorRef.current && isVisible) {
      meteorRef.current.rotation.y += dt * 0.8;
      meteorRef.current.rotation.z = Math.sin(clock.getElapsedTime()) * 0.1;
      meteorRef.current.rotation.x = Math.cos(clock.getElapsedTime() * 0.8) * 0.1;
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (isTrigger && onTriggerClick) onTriggerClick(); if (onNodeClick) onNodeClick(); };

  return (
    <group position={position}>
      {/* Restore pointLight to give 3D volume to the sphere and box */}
      {isVisible && <pointLight color={color} intensity={2} distance={8} decay={2} />}

      <Float speed={1.5} rotationIntensity={0.6} floatIntensity={0.8} floatingRange={[-0.15, 0.15]}>
        <group ref={meshRef} onClick={click} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
          {/* Faintly Glowing Jelly Fluid Sphere */}
          <mesh>
            <sphereGeometry args={[r * 0.8, 32, 32]} />
            <MeshDistortMaterial ref={fluidMatRef} color={col} emissive={col} emissiveIntensity={0.5} distort={0.5} speed={3} roughness={0.3} transparent opacity={0.8} />
          </mesh>

          {/* Reflective Crystal Glass Box */}
          <RoundedBox args={[r * 2.2, r * 2.2, r * 2.2]} radius={0.1} smoothness={4}>
            <meshPhysicalMaterial
              color={col}
              transparent
              opacity={hovered ? 0.3 : 0.4}
              depthWrite={false}
              roughness={0.1}
              metalness={0.2}
              clearcoat={1.0}
              clearcoatRoughness={0.1}
            />
            <Edges color={color} />
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
        <Html position={[0, -(r + 0.8), 0]} center distanceFactor={15} zIndexRange={[0, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', border: `1px solid ${color}40`, borderRadius: '8px', padding: '0.5vw 1vw', textAlign: 'center', fontFamily: "'Inter',sans-serif", whiteSpace: 'nowrap', boxShadow: `0 0 15px ${color}30` }}>
            <div style={{ color: '#fff', fontSize: 'clamp(14px, 1.2vw, 24px)', fontWeight: 700, textShadow: `0 0 8px ${color}80` }}>{label}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(11px, 0.9vw, 18px)' }}>{sublabel}</div>
          </div>
        </Html>
      )}

      {isTrigger && showClickHint && (
        <Html position={[0, -2.5, 0]} center distanceFactor={15} zIndexRange={[0, 0]}>
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
              <Html position={[off[0], off[1] + 1.2, off[2]]} center distanceFactor={15} zIndexRange={[0, 0]} style={{ pointerEvents: 'none' }}>
                <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(24px)', border: `1px solid ${color}60`, borderRadius: '12px', boxShadow: `0 0 35px ${color}40`, padding: '0.8vw 1.2vw', fontFamily: "'Space Grotesk','Inter',sans-serif", minWidth: 'clamp(180px, 15vw, 250px)' }}>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(10px, 0.8vw, 16px)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>{b.label}</div>
                  <div style={{ color, fontSize: 'clamp(16px, 1.4vw, 26px)', fontWeight: 700, marginBottom: b.details ? '10px' : '0', textShadow: `0 0 15px ${color}` }}>{b.value}</div>

                  {b.details && (
                    <div style={{ borderTop: `1px solid ${color}30`, paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {b.details.map((desc, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: 'clamp(10px, 0.8vw, 14px)', color: 'rgba(255,255,255,0.85)' }}>
                          <span style={{ color, marginTop: '2px', fontSize: '10px' }}>▶</span>
                          <span style={{ lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'normal', fontFamily: "'Inter', sans-serif" }}>{desc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {isScorecard && isVisible && (
        <Html position={[r + 1, 0, 0]} distanceFactor={15} zIndexRange={[0, 0]} style={{ pointerEvents: 'none', transform: 'translate3d(0, -50%, 0)' }}>
          <div style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(30px)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '16px', boxShadow: '0 0 50px rgba(251,191,36,0.1)', padding: '1.8vw 2vw', fontFamily: "'Inter',sans-serif", width: 'clamp(340px, 32vw, 470px)', whiteSpace: 'nowrap' }}>
            <div style={{ color: '#FBBf24', fontSize: 'clamp(14px, 1.2vw, 20px)', fontWeight: 800, letterSpacing: '2.5px', borderBottom: '1px solid rgba(251,191,36,0.2)', paddingBottom: '10px', marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <span>🏆 AURAOPS SCORECARD</span>
            </div>

            <div style={{ color: scorecardData?.decision === 'APPROVE' ? '#50ffb0' : scorecardData?.decision === 'BLOCK' ? '#F97066' : '#FBBf24', fontSize: 'clamp(18px, 1.5vw, 28px)', fontWeight: 800, marginBottom: '8px', textShadow: `0 0 20px ${scorecardData?.decision === 'APPROVE' ? 'rgba(80,255,176,0.4)' : scorecardData?.decision === 'BLOCK' ? 'rgba(249,112,102,0.4)' : 'rgba(251,191,36,0.4)'}` }}>
              {scorecardData?.decision === 'APPROVE' ? '✅ RELEASE APPROVED' : scorecardData?.decision === 'BLOCK' ? '❌ RELEASE BLOCKED' : '⚠️ RELEASE FLAGGED'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(12px, 1vw, 16px)', marginBottom: '16px', lineHeight: 1.5, whiteSpace: 'normal', fontFamily: "'Space Grotesk', sans-serif" }}>
              {scorecardData?.decision === 'APPROVE' 
                ? 'Autonomous remediation complete. All high-severity metrics fall within acceptable regulatory and risk thresholds. Zero regressions introduced.' 
                : 'CRITICAL FAILURE: AuraOps has intercepted the pipeline and permanently blocked this release. Safety thresholds were severely violated by the proposed codebase changes.'}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><div style={{ color: '#8899aa', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Time Saved</div><div style={{ color: '#fff', fontSize: 'clamp(14px, 1.2vw, 20px)', fontWeight: 700 }}>{scorecardData?.time_saved || 0} min</div></div>
              <div><div style={{ color: '#8899aa', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Agent Cost</div><div style={{ color: '#fff', fontSize: 'clamp(14px, 1.2vw, 20px)', fontWeight: 700 }}>${scorecardData?.cost?.toFixed(3) || '0.000'}</div></div>
              <div><div style={{ color: '#8899aa', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Code Patches</div><div style={{ color: '#F97066', fontSize: 'clamp(14px, 1.2vw, 20px)', fontWeight: 700 }}>{scorecardData?.patches || 0} Critical</div></div>
              <div><div style={{ color: '#8899aa', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>CO₂ Avoided</div><div style={{ color: '#10B981', fontSize: 'clamp(14px, 1.2vw, 20px)', fontWeight: 700 }}>{scorecardData?.co2_saved?.toFixed(1) || '0.0'} kg/yr</div></div>
            </div>

            {[{ l: '🛡️ Security Tolerance', v: scorecardData?.sec_score ?? 0, c: '#F97066' }, { l: '🌱 Sustainability Index', v: scorecardData?.eco_score ?? 0, c: '#10B981' }].map(x => (
              <div key={x.l} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ color: '#aab', fontSize: 'clamp(12px, 1vw, 16px)' }}>{x.l}</span><span style={{ color: x.c, fontSize: 'clamp(14px, 1.2vw, 20px)', fontWeight: 700, textShadow: `0 0 10px ${x.c}40` }}>{x.v}/100</span></div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: `${x.v}%`, height: '100%', background: x.c, borderRadius: '3px', boxShadow: `0 0 15px ${x.c}` }} /></div>
              </div>
            ))}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginTop: '12px', fontSize: 'clamp(11px, 0.9vw, 14px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ color: '#8899aa' }}>🤖 Model Reasoning</span><span style={{ color: '#38BDF8', fontWeight: 700 }}>Claude 4.6 Sonnet</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ color: '#8899aa' }}>🧪 Integration Tests</span><span style={{ color: scorecardData?.tests_passed ? '#50ffb0' : '#F97066', fontWeight: 700 }}>{scorecardData?.tests_passed ? 'Passed ✅' : 'Failed ❌'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ color: '#8899aa' }}>🚦 AI Decision</span><span style={{ color: scorecardData?.decision === 'APPROVE' ? '#50ffb0' : scorecardData?.decision === 'BLOCK' ? '#F97066' : '#FBBf24', fontWeight: 700 }}>{scorecardData?.decision || 'PENDING'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8899aa' }}>⚖️ Confidence Score</span><span style={{ color: '#FBBf24', fontWeight: 700 }}>{scorecardData?.confidence || 0}%</span></div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
