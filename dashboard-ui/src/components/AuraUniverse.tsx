import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, CameraControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import WaterPipe from './WaterPipe';
import PipelineNode, { type SubBranch } from './PipelineNode';

// ═══════════════════════════════════════
//  STATE MACHINE
// ═══════════════════════════════════════
type FlowState = 'IDLE' | 'SHIFTING_LAYOUT' | 'DRAWING_PIPES' | 'COMPLETE';

// ═══════════════════════════════════════
//  NODE DEFINITIONS (Strict Coordinate Spacing)
// ═══════════════════════════════════════

interface NodeDef {
  id: string; label: string; sublabel: string;
  pos: [number, number, number]; color: string;
  revealAt: number; branches: SubBranch[];
  isTrigger?: boolean; isScorecard?: boolean;
}

const NODES: NodeDef[] = [
  { id: 'trigger', label: 'GitLab MR Opened', sublabel: 'Webhook received', pos: [-15, 0, 0], color: '#ffffff', revealAt: -1, isTrigger: true, branches: [] },
  { id: 'security', label: 'SecurityAgent', sublabel: 'Claude Sonnet', pos: [-7, 6, -2], color: '#F97066', revealAt: 15, branches: [
    { id: 'sec-v', label: 'Vulnerabilities', value: '3 → 0 Patched', dormant: [0.6, 0.6, 0], expanded: [0, 5.0, -2.5] },
    { id: 'sec-s', label: 'Security Score', value: '84/100', dormant: [-0.6, 0.5, 0.3], expanded: [-4.5, 3.5, 0] },
    { id: 'sec-m', label: 'Analysis', value: 'Claude Sonnet 3.5', dormant: [0.4, -0.5, -0.5], expanded: [4.5, 3.0, 1.2] },
  ]},
  { id: 'greenops', label: 'GreenOpsAgent', sublabel: 'Carbon API', pos: [-7, -6, 2], color: '#10B981', revealAt: 15, branches: [
    { id: 'grn-r', label: 'Region', value: 'us-central1 → eu-north1', dormant: [0.6, -0.6, 0], expanded: [0, -5.0, 2.5] },
    { id: 'grn-c', label: 'CO₂ Saved', value: '2.4 kg/month', dormant: [-0.6, -0.5, 0.3], expanded: [-4.5, -3.5, 0] },
    { id: 'grn-e', label: 'Eco Score', value: '82/100', dormant: [0.4, 0.5, 0.5], expanded: [4.5, -3.0, 1.2] },
  ]},
  { id: 'validation', label: 'ValidationAgent', sublabel: 'GitLab CI', pos: [1, 0, 0], color: '#38BDF8', revealAt: 35, branches: [
    { id: 'val-t', label: 'Tests', value: '142/142 Passed ✅', dormant: [0.5, 0.6, 0], expanded: [0, 4.5, -1.2] },
    { id: 'val-d', label: 'Duration', value: '47s', dormant: [-0.5, -0.6, 0], expanded: [0, -4.0, 1.2] },
  ]},
  { id: 'risk', label: 'RiskEngine', sublabel: 'Release Authority', pos: [9, 4, -1], color: '#F59E0B', revealAt: 55, branches: [
    { id: 'rsk-d', label: 'Decision', value: 'APPROVED', dormant: [0, 0.7, 0], expanded: [0, 5.0, -1.2] },
    { id: 'rsk-c', label: 'Confidence', value: '91%', dormant: [0, -0.6, 0], expanded: [0, -4.0, 1.2] },
  ]},
  { id: 'compliance', label: 'ComplianceAgent', sublabel: 'SOC2 / GDPR', pos: [17, -4, 1], color: '#8B5CF6', revealAt: 70, branches: [
    { id: 'cmp-s', label: 'SOC2 Score', value: '88/100', dormant: [0.5, 0.5, 0], expanded: [3.0, 3.8, 0] },
    { id: 'cmp-k', label: 'Checks', value: '8/9 Passed', dormant: [-0.5, 0.5, 0], expanded: [-3.0, 3.5, 0] },
  ]},
  { id: 'deploy', label: 'DeployAgent', sublabel: 'Cloud Run', pos: [25, 2, 0], color: '#06B6D4', revealAt: 85, branches: [
    { id: 'dep-u', label: 'Deployed', value: 'auraops-demo.run.app', dormant: [0.5, 0.5, 0], expanded: [3.0, 3.8, 0] },
    { id: 'dep-r', label: 'Region', value: 'europe-north1', dormant: [-0.5, -0.5, 0], expanded: [-3.0, -3.8, 0] },
  ]},
  { id: 'scorecard', label: 'AuraOps Scorecard', sublabel: 'Release Complete', pos: [33, -2, 0], color: '#FBBf24', revealAt: 98, isScorecard: true, branches: [] },
];

const TOUR_NODES = NODES; // Map exactly to the pipeline array sequence

// ═══════════════════════════════════════
//  PIPE DEFINITIONS
// ═══════════════════════════════════════

interface PipeDef {
  points: [number, number, number][];
  startAt: number; endAt: number; color: string;
}

const PIPES: PipeDef[] = [
  { points: [[-15,0,0],[-11,3,-1],[-7,6,-2]], startAt: 0, endAt: 15, color: '#F97066' },
  { points: [[-15,0,0],[-11,-3,1],[-7,-6,2]], startAt: 0, endAt: 15, color: '#10B981' },
  { points: [[-7,6,-2],[-3,3,-1],[1,0,0]], startAt: 15, endAt: 35, color: '#38BDF8' },
  { points: [[-7,-6,2],[-3,-3,1],[1,0,0]], startAt: 15, endAt: 35, color: '#38BDF8' },
  { points: [[1,0,0],[5,2,-0.5],[9,4,-1]], startAt: 35, endAt: 55, color: '#F59E0B' },
  { points: [[9,4,-1],[13,0,0],[17,-4,1]], startAt: 55, endAt: 70, color: '#8B5CF6' },
  { points: [[17,-4,1],[21,-1,0.5],[25,2,0]], startAt: 70, endAt: 85, color: '#06B6D4' },
  { points: [[25,2,0],[29,0,0],[33,-2,0]], startAt: 85, endAt: 100, color: '#FBBf24' },
];

// ═══════════════════════════════════════
//  MAIN SCENE
// ═══════════════════════════════════════

export default function AuraUniverse() {
  const [flowState, setFlowState] = useState<FlowState>('IDLE');
  const pipeProgressRef = useRef(0); // 0 to 100
  const [litNodes, setLitNodes] = useState<Set<string>>(new Set(['trigger']));
  const [expandedBubbles, setExpandedBubbles] = useState<string[]>([]);
  
  // Guided Tour State
  const [tourIndex, setTourIndex] = useState(0);
  const [isTourActive, setIsTourActive] = useState(false);

  const cameraControlsRef = useRef<CameraControls>(null);
  const groupRef = useRef<THREE.Group>(null);
  const groupPos = useRef(new THREE.Vector3(15, 0, 0));

  const startFlow = useCallback(() => {
    if (flowState === 'IDLE') {
      setFlowState('SHIFTING_LAYOUT');
      pipeProgressRef.current = 0;
    }
  }, [flowState]);

  const toggleBubble = useCallback((id: string) => {
    setExpandedBubbles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  // ── Strict State Machine Loop ──
  useFrame((_, dt) => {
    
    if (flowState === 'SHIFTING_LAYOUT') {
      const rate = Math.min(1, dt * 2.5);
      groupPos.current.x += (0 - groupPos.current.x) * rate;
      if (groupRef.current) groupRef.current.position.copy(groupPos.current);

      if (groupPos.current.x < 0.1) {
        groupPos.current.x = 0;
        if (groupRef.current) groupRef.current.position.copy(groupPos.current);
        setFlowState('DRAWING_PIPES');
      }
    }

    if (flowState === 'DRAWING_PIPES') {
      pipeProgressRef.current += dt * 8; // 12.5 seconds total flow time (100 / 8)
      
      if (pipeProgressRef.current >= 100) {
        pipeProgressRef.current = 100;
        setFlowState('COMPLETE');
        setIsTourActive(true);
        setTourIndex(0); // Autostart tour at origin
      }

      const newLit = new Set(['trigger']);
      for (const n of NODES) {
        if (n.revealAt >= 0 && pipeProgressRef.current >= n.revealAt) newLit.add(n.id);
      }
      if (newLit.size !== litNodes.size) setLitNodes(newLit);
    }
  });

  // Cinematic Fly-To Animation
  useEffect(() => {
    if (isTourActive && cameraControlsRef.current) {
      const targetNode = TOUR_NODES[tourIndex];
      const [tx, ty, tz] = targetNode.pos;
      // Fly to node pos, looking perfectly backwards
      cameraControlsRef.current.setLookAt(tx, ty, tz + 15, tx, ty, tz, true);
    }
  }, [tourIndex, isTourActive]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTourIndex(i => Math.min(TOUR_NODES.length - 1, i + 1));
  };
  
  const handleBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTourIndex(i => Math.max(0, i - 1));
  };

  return (
    <>
      <CameraControls ref={cameraControlsRef} makeDefault />

      {/* Pitch black static starfield */}
      <Stars radius={150} depth={50} count={7000} factor={4} saturation={0} fade speed={0} />

      {/* Dim ambient */}
      <ambientLight intensity={0.1} />

      {/* Nebula depth cues */}
      <mesh position={[-50, 20, -80]}><sphereGeometry args={[35, 16, 16]} /><meshBasicMaterial color="#0a1030" transparent opacity={0.04} side={THREE.BackSide} /></mesh>
      <mesh position={[40, -15, -60]}><sphereGeometry args={[25, 16, 16]} /><meshBasicMaterial color="#1a0030" transparent opacity={0.03} side={THREE.BackSide} /></mesh>

      {/* Parent group that shifts the layout left dynamically */}
      <group ref={groupRef} position={[15, 0, 0]}>
        
        {/* Dynamic Water Pipes */}
        {PIPES.map((p, i) => (
          <WaterPipe 
            key={i} 
            points={p.points} 
            progressRef={pipeProgressRef} 
            startAt={p.startAt}
            endAt={p.endAt}
            color={p.color} 
          />
        ))}

        {/* Pipeline Nodes */}
        {NODES.map(n => (
          <PipelineNode
            key={n.id}
            id={n.id}
            label={n.label}
            sublabel={n.sublabel}
            position={n.pos}
            color={n.color}
            isTrigger={n.isTrigger}
            isScorecard={n.isScorecard}
            isVisible={litNodes.has(n.id)}
            branches={n.branches}
            expandedBubbles={expandedBubbles}
            onToggleBubble={toggleBubble}
            onTriggerClick={startFlow}
            showClickHint={flowState === 'IDLE'}
          />
        ))}
      </group>

      {/* 2D Cinematic Guided Tour Overlay */}
      {isTourActive && (
        <Html fullscreen zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)', padding: '12px 24px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button onClick={handleBack} disabled={tourIndex === 0} style={{ color: tourIndex === 0 ? '#555' : '#fff', cursor: tourIndex === 0 ? 'default' : 'pointer', background: 'none', border: 'none', fontSize: '14px', fontWeight: 600 }}>
                &larr; BACK
              </button>
              <div style={{ color: '#06B6D4', fontSize: '13px', fontWeight: 700, minWidth: '150px', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {TOUR_NODES[tourIndex].label}
              </div>
              <button onClick={handleNext} disabled={tourIndex === TOUR_NODES.length - 1} style={{ color: tourIndex === TOUR_NODES.length - 1 ? '#555' : '#fff', cursor: tourIndex === TOUR_NODES.length - 1 ? 'default' : 'pointer', background: 'none', border: 'none', fontSize: '14px', fontWeight: 600 }}>
                NEXT &rarr;
              </button>
            </div>
          </div>
        </Html>
      )}
    </>
  );
}
