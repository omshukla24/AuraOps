import { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Stars } from '@react-three/drei';
import * as THREE from 'three';

// ════════════════════════════════════════
// TYPES
// ════════════════════════════════════════

interface PipeNode {
  id: string;
  label: string;
  sublabel: string;
  position: [number, number, number];
  color: string;
  glow: string;
  radius: number;
  litAt: number; // ms, -1 = always visible
}

interface PipeEdge {
  from: string;
  to: string;
  points: [number, number, number][];
  orbStart: number;
  orbEnd: number;
  tubeR: number;
}

interface MRRow {
  iid: number;
  decision: 'APPROVE' | 'NEEDS_FIX' | 'BLOCK';
  sec: number;
  eco: number;
}

type AnimState = 'idle' | 'flowing' | 'complete';

// ════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════

const NODES: PipeNode[] = [
  { id: 'trigger',    label: 'GitLab MR Opened',  sublabel: 'Webhook received',   position: [0, 4, 0],        color: '#ffffff', glow: '#ffffff',  radius: 0.35, litAt: -1 },
  { id: 'security',   label: 'SecurityAgent',      sublabel: 'Claude Sonnet',      position: [-2.5, 1.5, -1],  color: '#F97066', glow: '#F97066',  radius: 0.35, litAt: 800 },
  { id: 'greenops',   label: 'GreenOpsAgent',      sublabel: 'Carbon API',         position: [2.5, 1.5, -1],   color: '#10B981', glow: '#10B981',  radius: 0.35, litAt: 800 },
  { id: 'validation', label: 'ValidationAgent',    sublabel: 'GitLab CI',          position: [0, -1, -0.5],    color: '#38BDF8', glow: '#38BDF8',  radius: 0.35, litAt: 2400 },
  { id: 'risk',       label: 'RiskEngine',         sublabel: 'Release Authority',  position: [0, -3, 0],       color: '#F59E0B', glow: '#F59E0B',  radius: 0.35, litAt: 3200 },
  { id: 'compliance', label: 'ComplianceAgent',    sublabel: 'SOC2 / GDPR',        position: [-1.5, -5, 0.5],  color: '#8B5CF6', glow: '#8B5CF6',  radius: 0.35, litAt: 4800 },
  { id: 'deploy',     label: 'DeployAgent',        sublabel: 'Cloud Run',          position: [1.5, -5, 0.5],   color: '#06B6D4', glow: '#06B6D4',  radius: 0.35, litAt: 4800 },
  { id: 'scorecard',  label: 'AuraOps Scorecard',  sublabel: 'Release Complete',   position: [0, -8, 1],       color: '#FBBf24', glow: '#FBBf24',  radius: 0.35, litAt: 5600 },
];

const EDGES: PipeEdge[] = [
  { from: 'trigger',    to: 'security',   points: [[0,4,0],[-1,3,-0.3],[-2,2.2,-0.7],[-2.5,1.5,-1]],             orbStart: 0,    orbEnd: 800,  tubeR: 0.03 },
  { from: 'trigger',    to: 'greenops',   points: [[0,4,0],[1,3,-0.3],[2,2.2,-0.7],[2.5,1.5,-1]],                 orbStart: 0,    orbEnd: 800,  tubeR: 0.03 },
  { from: 'security',   to: 'validation', points: [[-2.5,1.5,-1],[-1.5,0.5,-0.8],[-0.5,-0.3,-0.6],[0,-1,-0.5]],  orbStart: 1600, orbEnd: 2400, tubeR: 0.03 },
  { from: 'greenops',   to: 'validation', points: [[2.5,1.5,-1],[1.5,0.5,-0.8],[0.5,-0.3,-0.6],[0,-1,-0.5]],     orbStart: 1600, orbEnd: 2400, tubeR: 0.03 },
  { from: 'validation', to: 'risk',       points: [[0,-1,-0.5],[0,-1.8,-0.3],[0,-2.5,-0.1],[0,-3,0]],             orbStart: 2400, orbEnd: 3200, tubeR: 0.03 },
  { from: 'risk',       to: 'compliance', points: [[0,-3,0],[-0.5,-3.6,0.15],[-1,-4.3,0.35],[-1.5,-5,0.5]],      orbStart: 4000, orbEnd: 4800, tubeR: 0.025 },
  { from: 'risk',       to: 'deploy',     points: [[0,-3,0],[0.5,-3.6,0.15],[1,-4.3,0.35],[1.5,-5,0.5]],          orbStart: 4000, orbEnd: 4800, tubeR: 0.025 },
  { from: 'compliance', to: 'scorecard',  points: [[-1.5,-5,0.5],[-1,-6,0.65],[-0.4,-7,0.85],[0,-8,1]],           orbStart: 4800, orbEnd: 5600, tubeR: 0.025 },
  { from: 'deploy',     to: 'scorecard',  points: [[1.5,-5,0.5],[1,-6,0.65],[0.4,-7,0.85],[0,-8,1]],              orbStart: 4800, orbEnd: 5600, tubeR: 0.025 },
];

const MR_DATA: MRRow[] = [
  { iid: 38, decision: 'BLOCK',     sec: 22,  eco: 65 },
  { iid: 39, decision: 'NEEDS_FIX', sec: 44,  eco: 58 },
  { iid: 40, decision: 'APPROVE',   sec: 96,  eco: 88 },
  { iid: 41, decision: 'APPROVE',   sec: 82,  eco: 76 },
  { iid: 42, decision: 'APPROVE',   sec: 84,  eco: 82 },
  { iid: 43, decision: 'APPROVE',   sec: 100, eco: 95 },
];

const NODE_METRICS: Record<string, { label: string; value: string }[]> = {
  security: [
    { label: 'Vulnerabilities Found', value: '3' },
    { label: 'Auto-Patched', value: '3' },
    { label: 'Security Score', value: '84/100' },
  ],
  greenops: [
    { label: 'Region', value: 'us-central1 → europe-north1' },
    { label: 'CO₂ Saved', value: '2.4 kg/month' },
    { label: 'Eco Score', value: '82/100' },
  ],
  validation: [
    { label: 'Pipeline Status', value: 'Passed ✅' },
    { label: 'Duration', value: '47s' },
    { label: 'Tests', value: '142 passed, 0 failed' },
  ],
  risk: [
    { label: 'Decision', value: 'APPROVED' },
    { label: 'Confidence', value: '91%' },
    { label: 'Reason', value: 'All vulns patched. Tests green.' },
  ],
  compliance: [
    { label: 'SOC2 Score', value: '88/100' },
    { label: 'Checks Passed', value: '8/9' },
    { label: 'Audit Log', value: 'Generated ✅' },
  ],
  deploy: [
    { label: 'Region', value: 'europe-north1' },
    { label: 'URL', value: 'auraops-demo.run.app' },
    { label: 'Smoke Test', value: 'Passed ✅' },
  ],
};

const PANEL_STYLE: React.CSSProperties = {
  background: 'rgba(10, 14, 26, 0.88)',
  backdropFilter: 'blur(12px)',
  borderRadius: '10px',
  padding: '12px 16px',
  fontFamily: "'Inter', 'Space Grotesk', sans-serif",
  minWidth: '180px',
  pointerEvents: 'none' as const,
};

// ════════════════════════════════════════
// CURVED TUBE PIPE
// ════════════════════════════════════════

function CurvedPipe({ edge, opacity }: { edge: PipeEdge; opacity: number }) {
  const { geometry, destColor } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(edge.points.map(p => new THREE.Vector3(...p)));
    const geo = new THREE.TubeGeometry(curve, 64, edge.tubeR, 8, false);
    const dest = NODES.find(n => n.id === edge.to);
    return { geometry: geo, destColor: new THREE.Color(dest?.color ?? '#00f0ff') };
  }, [edge]);

  if (opacity <= 0.001) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={destColor}
        emissive={destColor}
        emissiveIntensity={0.6}
        transparent
        opacity={opacity}
        roughness={0.3}
        metalness={0.6}
      />
    </mesh>
  );
}

// ════════════════════════════════════════
// TRAVELING ORB
// ════════════════════════════════════════

function TravelingOrb({ edge, progress }: { edge: PipeEdge; progress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(edge.points.map(p => new THREE.Vector3(...p))),
    [edge]
  );
  const dest = NODES.find(n => n.id === edge.to);
  const orbColor = dest?.color ?? '#ffffff';

  useFrame(() => {
    if (groupRef.current && progress > 0 && progress < 1) {
      const pt = curve.getPoint(progress);
      groupRef.current.position.copy(pt);
    }
  });

  if (progress <= 0 || progress >= 1) return null;

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={orbColor} emissive={orbColor} emissiveIntensity={3.0} />
      </mesh>
      <pointLight color={orbColor} intensity={1.5} distance={4} decay={2} />
    </group>
  );
}

// ════════════════════════════════════════
// PIPELINE NODE SPHERE
// ════════════════════════════════════════

interface PipelineNodeProps {
  node: PipeNode;
  isLit: boolean;
  isHovered: boolean;
  showMetrics: boolean;
  isScorecard: boolean;
  scorecardScale: number;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  showClickHint: boolean;
}

function PipelineNodeSphere({
  node, isLit, isHovered, showMetrics, isScorecard,
  scorecardScale, onHover, onClick, showClickHint,
}: PipelineNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const emissiveRef = useRef(isLit ? 0.8 : 0);
  const opacityRef = useRef(isLit ? 1 : 0);
  const scaleRef = useRef(isLit ? 1 : 0.1);

  const color = useMemo(() => new THREE.Color(node.color), [node.color]);
  const glowColor = useMemo(() => new THREE.Color(node.glow), [node.glow]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const targetEmissive = isLit ? (isHovered ? 1.5 : 0.8) : 0;
    const targetOpacity = isLit ? 1 : 0;
    let targetScale = isLit ? 1 : 0.1;

    // Trigger idle pulse
    if (node.id === 'trigger' && !isLit) {
      // Trigger is always "lit" visually
    }

    // Scorecard dramatic scale
    if (isScorecard && isLit) {
      targetScale = scorecardScale;
    }

    // Spring interpolation
    const rate = 5 * delta;
    emissiveRef.current += (targetEmissive - emissiveRef.current) * Math.min(1, rate);
    opacityRef.current += (targetOpacity - opacityRef.current) * Math.min(1, rate);
    scaleRef.current += (targetScale - scaleRef.current) * Math.min(1, rate * 1.5);

    if (matRef.current) {
      matRef.current.emissiveIntensity = emissiveRef.current;
      matRef.current.opacity = opacityRef.current;
    }
    if (glowRef.current) {
      const gm = glowRef.current.material as THREE.MeshBasicMaterial;
      gm.opacity = opacityRef.current * (0.06 + Math.sin(t * 2) * 0.03);
    }
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scaleRef.current);
    }
  });

  // Trigger always visible
  const isVisible = node.id === 'trigger' || isLit;
  const labelOpacity = isVisible ? 1 : 0;

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onPointerOver={() => onHover(node.id)}
        onPointerOut={() => onHover(null)}
        onClick={() => onClick(node.id)}
      >
        <sphereGeometry args={[node.radius, 48, 48]} />
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={glowColor}
          emissiveIntensity={0.4}
          transparent
          opacity={1}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Glow shell */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[node.radius * 1.8, 32, 32]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>

      {/* Point light when lit */}
      {isLit && <pointLight color={node.color} intensity={0.5} distance={3} decay={2} />}

      {/* Label */}
      <Html
        position={[0, -(node.radius + 0.45), 0]}
        center
        style={{
          opacity: labelOpacity,
          transition: 'opacity 0.6s ease',
          pointerEvents: isLit ? 'auto' : 'none',
        }}
      >
        <div style={{
          ...PANEL_STYLE,
          padding: '6px 12px',
          minWidth: 'auto',
          border: `1px solid ${node.color}44`,
          textAlign: 'center',
          cursor: isLit ? 'pointer' : 'default',
        }}>
          <div style={{ color: '#fff', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>
            {node.label}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginTop: '2px' }}>
            {node.sublabel}
          </div>
        </div>
      </Html>

      {/* Click-to-begin hint for trigger */}
      {showClickHint && node.id === 'trigger' && (
        <Html position={[0, -(node.radius + 1.6), 0]} center>
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '11px',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '1px',
            animation: 'pulse 2s infinite',
          }}>
            Click to begin pipeline analysis
          </div>
        </Html>
      )}

      {/* Metrics panel */}
      {showMetrics && NODE_METRICS[node.id] && (
        <Html position={[node.radius + 1.2, 0.3, 0]} center style={{ transition: 'all 0.5s ease' }}>
          <div style={{
            ...PANEL_STYLE,
            border: `1px solid ${node.color}33`,
            transform: showMetrics ? 'translateY(0)' : 'translateY(-20px)',
            opacity: showMetrics ? 1 : 0,
          }}>
            {NODE_METRICS[node.id].map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: i < NODE_METRICS[node.id].length - 1 ? '6px' : 0 }}>
                <span style={{ color: '#667788', fontSize: '9px', letterSpacing: '0.5px' }}>{m.label}</span>
                <span style={{ color: node.color, fontSize: '11px', fontWeight: 700 }}>{m.value}</span>
              </div>
            ))}
          </div>
        </Html>
      )}
    </group>
  );
}

// ════════════════════════════════════════
// SCORECARD RESULT PANEL
// ════════════════════════════════════════

function ScorecardPanel({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <group position={[0, -10.5, 2]}>
      {/* Short connecting tube to scorecard */}
      <mesh>
        <cylinderGeometry args={[0.015, 0.015, 2.5, 8]} />
        <meshStandardMaterial color="#FBBf24" emissive="#FBBf24" emissiveIntensity={0.5} transparent opacity={0.4} />
      </mesh>

      <Html center style={{ transition: 'all 0.8s ease' }}>
        <div style={{
          ...PANEL_STYLE,
          width: '300px',
          border: '1px solid rgba(251,191,36,0.3)',
          boxShadow: '0 0 40px rgba(251,191,36,0.1)',
        }}>
          <div style={{ color: '#FBBf24', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', borderBottom: '1px solid rgba(251,191,36,0.15)', paddingBottom: '8px', marginBottom: '10px' }}>
            🤖 AURAOPS — RELEASE REPORT
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', marginBottom: '10px' }}>Completed in 43s</div>

          <div style={{ color: '#50ffb0', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
            ✅ APPROVED — 91% confidence
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', marginBottom: '12px', lineHeight: '1.4' }}>
            All vulnerabilities patched. Infrastructure optimized. Tests passed.
          </div>

          {[
            { icon: '🔐', label: 'Security', value: 84, color: '#F97066' },
            { icon: '🌱', label: 'Sustainability', value: 82, color: '#10B981' },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ color: '#8899aa', fontSize: '9px' }}>{item.icon} {item.label}</span>
                <span style={{ color: item.color, fontSize: '10px', fontWeight: 700 }}>{item.value}/100</span>
              </div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${item.value}%`, height: '100%', background: item.color, borderRadius: '2px' }} />
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#8899aa', fontSize: '9px' }}>🧪 Tests</span>
            <span style={{ color: '#50ffb0', fontSize: '10px', fontWeight: 700 }}>Passed ✅</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: '#8899aa', fontSize: '9px' }}>🚀 Deployed</span>
            <span style={{ color: '#06B6D4', fontSize: '10px', fontWeight: 700 }}>auraops-demo.run.app</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: '#8899aa', fontSize: '9px' }}>📋 Compliance</span>
            <span style={{ color: '#8B5CF6', fontSize: '10px', fontWeight: 700 }}>8/9 passed</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// ════════════════════════════════════════
// MR HISTORY SIDEBAR
// ════════════════════════════════════════

function MRHistorySidebar({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const decColor = (d: string) => d === 'APPROVE' ? '#50ffb0' : d === 'NEEDS_FIX' ? '#ffc107' : '#ff4444';

  return (
    <group position={[3.5, -4, 1]}>
      {/* Connecting line */}
      <mesh position={[-1.5, 0, -0.5]} rotation={[0, 0, Math.PI * 0.1]}>
        <cylinderGeometry args={[0.01, 0.01, 3, 6]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.15} />
      </mesh>

      <Html center style={{ transition: 'all 0.6s ease' }}>
        <div style={{
          ...PANEL_STYLE,
          width: '260px',
          border: '1px solid rgba(0,240,255,0.12)',
        }}>
          <div style={{ color: '#00f0ff', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', marginBottom: '10px', borderBottom: '1px solid rgba(0,240,255,0.1)', paddingBottom: '6px' }}>
            MR HISTORY
          </div>

          {MR_DATA.map(mr => (
            <div key={mr.iid} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', fontSize: '10px' }}>
              <span style={{ color: '#556677', fontWeight: 600, width: '28px' }}>!{mr.iid}</span>
              <span style={{
                color: decColor(mr.decision),
                fontWeight: 700,
                fontSize: '8px',
                letterSpacing: '0.5px',
                padding: '1px 6px',
                borderRadius: '3px',
                background: `${decColor(mr.decision)}15`,
                border: `1px solid ${decColor(mr.decision)}33`,
                width: '52px',
                textAlign: 'center',
              }}>
                {mr.decision === 'NEEDS_FIX' ? 'FIX' : mr.decision}
              </span>
              <span style={{ color: '#F97066', fontSize: '9px' }}>Sec:{mr.sec}</span>
              <span style={{ color: '#10B981', fontSize: '9px' }}>Eco:{mr.eco}</span>
            </div>
          ))}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '6px', color: '#8899aa', fontSize: '9px' }}>
            5 of 6 MRs Approved · <span style={{ color: '#10B981' }}>12.6 kg CO₂ Saved</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// ════════════════════════════════════════
// NEBULA CLOUDS
// ════════════════════════════════════════

function NebulaCloud({ pos, color, opacity, size }: { pos: [number, number, number]; color: string; opacity: number; size: number }) {
  return (
    <mesh position={pos}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.BackSide} />
    </mesh>
  );
}

// ════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════

export default function AuraOps3D() {
  const [animState, setAnimState] = useState<AnimState>('idle');
  const [litNodes, setLitNodes] = useState<Set<string>>(new Set(['trigger']));
  const [hovered, setHovered] = useState<string | null>(null);
  const [showPanels, setShowPanels] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [scorecardScale, setScorecardScale] = useState(1);

  const animStartRef = useRef<number>(-1);
  const edgeOpacities = useRef<number[]>(EDGES.map(() => 0));
  const orbProgresses = useRef<number[]>(EDGES.map(() => -1));

  const nodeMap = useMemo(() => {
    const m: Record<string, PipeNode> = {};
    NODES.forEach(n => { m[n.id] = n; });
    return m;
  }, []);

  // ── Click trigger to start animation ──
  const handleNodeClick = useCallback((id: string) => {
    if (id === 'trigger' && animState === 'idle') {
      setAnimState('flowing');
      animStartRef.current = -1; // will be set on first frame
    }
  }, [animState]);

  // ── Animation loop ──
  useFrame(({ clock }) => {
    if (animState !== 'flowing') return;

    if (animStartRef.current < 0) {
      animStartRef.current = clock.getElapsedTime();
    }

    const elapsed = (clock.getElapsedTime() - animStartRef.current) * 1000; // ms

    // Light up nodes based on timeline
    const newLit = new Set(['trigger']);
    NODES.forEach(n => {
      if (n.litAt >= 0 && elapsed >= n.litAt) newLit.add(n.id);
    });
    setLitNodes(newLit);

    // Update edge opacities and orb progresses
    EDGES.forEach((edge, i) => {
      if (elapsed >= edge.orbStart) {
        const progress = Math.min(1, (elapsed - edge.orbStart) / (edge.orbEnd - edge.orbStart));
        edgeOpacities.current[i] = progress; // pipe fills as orb travels
        orbProgresses.current[i] = progress;
      } else {
        edgeOpacities.current[i] = 0;
        orbProgresses.current[i] = -1;
      }
      // Keep lit after orb passes
      if (elapsed >= edge.orbEnd) {
        edgeOpacities.current[i] = 1;
        orbProgresses.current[i] = -1; // orb gone
      }
    });

    // Scorecard dramatic entrance
    if (elapsed >= 5600 && elapsed < 6000) {
      const t = (elapsed - 5600) / 400;
      // Overshoot: 0.1 → 1.3 → 1.0
      if (t < 0.6) {
        setScorecardScale(0.1 + t / 0.6 * 1.2);
      } else {
        setScorecardScale(1.3 - (t - 0.6) / 0.4 * 0.3);
      }
    }
    if (elapsed >= 6000) setScorecardScale(1);

    // Show metric panels at 5800ms
    if (elapsed >= 5800 && !showPanels) setShowPanels(true);

    // Show scorecard panel at 6000ms
    if (elapsed >= 6000 && !showScorecard) setShowScorecard(true);

    // Show MR history at 6500ms
    if (elapsed >= 6500 && !showHistory) setShowHistory(true);

    // Animation complete
    if (elapsed >= 7000 && animState === 'flowing') {
      setAnimState('complete');
    }
  });

  return (
    <>
      {/* Static starfield */}
      <Stars radius={200} depth={80} count={2000} factor={3} saturation={0} fade speed={0} />

      {/* Nebula clouds in far background */}
      <NebulaCloud pos={[-40, 20, -60]} color="#1e3a8a" opacity={0.03} size={30} />
      <NebulaCloud pos={[35, -15, -50]} color="#4c1d95" opacity={0.02} size={25} />
      <NebulaCloud pos={[0, -30, -45]} color="#134e4a" opacity={0.02} size={20} />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} color="#ffffff" />

      {/* Curved tube connections */}
      {EDGES.map((edge, i) => (
        <CurvedPipe key={`pipe-${i}`} edge={edge} opacity={edgeOpacities.current[i]} />
      ))}

      {/* Traveling orbs */}
      {EDGES.map((edge, i) => (
        <TravelingOrb
          key={`orb-${i}`}
          edge={edge}
          progress={orbProgresses.current[i]}
        />
      ))}

      {/* Pipeline nodes */}
      {NODES.map(node => (
        <PipelineNodeSphere
          key={node.id}
          node={node}
          isLit={litNodes.has(node.id)}
          isHovered={hovered === node.id}
          showMetrics={showPanels && !!NODE_METRICS[node.id]}
          isScorecard={node.id === 'scorecard'}
          scorecardScale={scorecardScale}
          onHover={setHovered}
          onClick={handleNodeClick}
          showClickHint={animState === 'idle'}
        />
      ))}

      {/* Final scorecard result panel */}
      <ScorecardPanel visible={showScorecard} />

      {/* MR History sidebar */}
      <MRHistorySidebar visible={showHistory} />
    </>
  );
}
