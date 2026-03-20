import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import WaterPipe from './WaterPipe';
import PipelineNode, { type SubBranch } from './PipelineNode';

// ═══════════════════════════════════════
//  NODE DEFINITIONS (local coords — group shifts to [-10,0,0])
// ═══════════════════════════════════════

interface NodeDef {
  id: string; label: string; sublabel: string;
  pos: [number, number, number]; color: string;
  revealAt: number; branches: SubBranch[];
  isTrigger?: boolean; isScorecard?: boolean;
}

const NODES: NodeDef[] = [
  { id: 'trigger', label: 'GitLab MR Opened', sublabel: 'Webhook received', pos: [0, 0, 0], color: '#ffffff', revealAt: -1, isTrigger: true, branches: [] },
  { id: 'security', label: 'SecurityAgent', sublabel: 'Claude Sonnet', pos: [5, 4, -2], color: '#F97066', revealAt: 0.12, branches: [
    { id: 'sec-v', label: 'Vulnerabilities', value: '3 → 0 Patched', dormant: [0.35, 0.4, 0], expanded: [0, 2.2, -1] },
    { id: 'sec-s', label: 'Security Score', value: '84/100', dormant: [-0.35, 0.35, 0.2], expanded: [-1.8, 1.5, 0] },
    { id: 'sec-m', label: 'Analysis', value: 'Claude Sonnet 3.5', dormant: [0.25, -0.3, -0.3], expanded: [1.8, 1.2, 0.5] },
  ]},
  { id: 'greenops', label: 'GreenOpsAgent', sublabel: 'Carbon API', pos: [5, -4, 2], color: '#10B981', revealAt: 0.12, branches: [
    { id: 'grn-r', label: 'Region', value: 'us-central1 → eu-north1', dormant: [0.35, -0.4, 0], expanded: [0, -2.2, 1] },
    { id: 'grn-c', label: 'CO₂ Saved', value: '2.4 kg/month', dormant: [-0.35, -0.35, 0.2], expanded: [-1.8, -1.5, 0] },
    { id: 'grn-e', label: 'Eco Score', value: '82/100', dormant: [0.25, 0.3, 0.3], expanded: [1.8, -1.2, 0.5] },
  ]},
  { id: 'validation', label: 'ValidationAgent', sublabel: 'GitLab CI', pos: [10, 0, 0], color: '#38BDF8', revealAt: 0.26, branches: [
    { id: 'val-t', label: 'Tests', value: '142/142 Passed ✅', dormant: [0.3, 0.4, 0], expanded: [0, 1.8, -0.5] },
    { id: 'val-d', label: 'Duration', value: '47s', dormant: [-0.3, -0.35, 0], expanded: [0, -1.6, 0.5] },
  ]},
  { id: 'risk', label: 'RiskEngine', sublabel: 'Release Authority', pos: [14, 2, -1], color: '#F59E0B', revealAt: 0.42, branches: [
    { id: 'rsk-d', label: 'Decision', value: 'APPROVED', dormant: [0, 0.45, 0], expanded: [0, 2, -0.5] },
    { id: 'rsk-c', label: 'Confidence', value: '91%', dormant: [0, -0.4, 0], expanded: [0, -1.6, 0.5] },
  ]},
  { id: 'compliance', label: 'ComplianceAgent', sublabel: 'SOC2 / GDPR', pos: [18, -2, 1], color: '#8B5CF6', revealAt: 0.58, branches: [
    { id: 'cmp-s', label: 'SOC2 Score', value: '88/100', dormant: [0.3, 0.35, 0], expanded: [1.2, 1.5, 0] },
    { id: 'cmp-k', label: 'Checks', value: '8/9 Passed', dormant: [-0.3, 0.3, 0], expanded: [-1.2, 1.4, 0] },
  ]},
  { id: 'deploy', label: 'DeployAgent', sublabel: 'Cloud Run', pos: [22, 0, 0], color: '#06B6D4', revealAt: 0.74, branches: [
    { id: 'dep-u', label: 'Deployed', value: 'auraops-demo.run.app', dormant: [0.3, 0.35, 0], expanded: [1.2, 1.5, 0] },
    { id: 'dep-r', label: 'Region', value: 'europe-north1', dormant: [-0.3, -0.35, 0], expanded: [-1.2, -1.5, 0] },
  ]},
  { id: 'scorecard', label: 'AuraOps Scorecard', sublabel: 'Release Complete', pos: [26, 0, 0], color: '#FBBf24', revealAt: 0.92, isScorecard: true, branches: [] },
];

// ═══════════════════════════════════════
//  PIPE DEFINITIONS
// ═══════════════════════════════════════

interface PipeDef {
  points: [number, number, number][];
  startAt: number; endAt: number; color: string;
}

const PIPES: PipeDef[] = [
  { points: [[0,0,0],[2,1,-0.5],[3.5,3,-1.5],[5,4,-2]], startAt: 0, endAt: 0.12, color: '#F97066' },
  { points: [[0,0,0],[2,-1,0.5],[3.5,-3,1.5],[5,-4,2]], startAt: 0, endAt: 0.12, color: '#10B981' },
  { points: [[5,4,-2],[6.5,3,-1.5],[8,1,-0.5],[10,0,0]], startAt: 0.14, endAt: 0.26, color: '#38BDF8' },
  { points: [[5,-4,2],[6.5,-3,1.5],[8,-1,0.5],[10,0,0]], startAt: 0.14, endAt: 0.26, color: '#38BDF8' },
  { points: [[10,0,0],[11,0.5,-0.3],[12.5,1.5,-0.7],[14,2,-1]], startAt: 0.28, endAt: 0.42, color: '#F59E0B' },
  { points: [[14,2,-1],[15,1,-0.3],[16.5,-0.5,0.3],[18,-2,1]], startAt: 0.44, endAt: 0.58, color: '#8B5CF6' },
  { points: [[18,-2,1],[19,-1.5,0.8],[20.5,-0.5,0.3],[22,0,0]], startAt: 0.60, endAt: 0.74, color: '#06B6D4' },
  { points: [[22,0,0],[23,0,0],[24.5,0,0.3],[26,0,0]], startAt: 0.76, endAt: 0.92, color: '#FBBf24' },
];

// ═══════════════════════════════════════
//  CAMERA CONTROLLER
// ═══════════════════════════════════════

function CameraShift({ active }: { active: boolean }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, dt) => {
    if (!active) return;
    const rate = Math.min(1, dt * 0.4);
    target.current.set(5, 0, 0);
    camera.position.x += (5 - camera.position.x) * rate;
    camera.position.z += (35 - camera.position.z) * rate;
    camera.position.y += (2 - camera.position.y) * rate * 0.3;
  });

  return null;
}

// ═══════════════════════════════════════
//  MAIN SCENE
// ═══════════════════════════════════════

export default function AuraUniverse() {
  const [isFlowStarted, setIsFlowStarted] = useState(false);
  const [litNodes, setLitNodes] = useState<Set<string>>(new Set(['trigger']));
  const [expandedBubbles, setExpandedBubbles] = useState<string[]>([]);

  const flowRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null);
  const groupPos = useRef(new THREE.Vector3(0, 0, 0));

  const startFlow = useCallback(() => {
    if (!isFlowStarted) {
      setIsFlowStarted(true);
      flowRef.current = 0;
    }
  }, [isFlowStarted]);

  const toggleBubble = useCallback((id: string) => {
    setExpandedBubbles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  // ── Animation loop ──
  useFrame((_, dt) => {
    // Group layout shift: [0,0,0] → [-10,0,0]
    const targetX = isFlowStarted ? -10 : 0;
    groupPos.current.x += (targetX - groupPos.current.x) * Math.min(1, dt * 0.6);
    if (groupRef.current) groupRef.current.position.copy(groupPos.current);

    // Slow flow progress: 25 seconds total
    if (isFlowStarted && flowRef.current < 1) {
      flowRef.current = Math.min(1, flowRef.current + dt / 25);

      // Light up nodes
      const newLit = new Set(['trigger']);
      for (const n of NODES) {
        if (n.revealAt >= 0 && flowRef.current >= n.revealAt) newLit.add(n.id);
      }
      if (newLit.size !== litNodes.size) setLitNodes(newLit);
    }
  });

  return (
    <>
      {/* Pitch black static starfield */}
      <Stars radius={150} depth={50} count={7000} factor={4} saturation={0} fade speed={0} />

      {/* Dim ambient + no other global lights */}
      <ambientLight intensity={0.1} />

      {/* Nebula depth cues */}
      <mesh position={[-50, 20, -80]}><sphereGeometry args={[35, 16, 16]} /><meshBasicMaterial color="#0a1030" transparent opacity={0.04} side={THREE.BackSide} /></mesh>
      <mesh position={[40, -15, -60]}><sphereGeometry args={[25, 16, 16]} /><meshBasicMaterial color="#1a0030" transparent opacity={0.03} side={THREE.BackSide} /></mesh>

      <CameraShift active={isFlowStarted} />

      {/* Animated group — shifts from center to left */}
      <group ref={groupRef}>
        {/* Water pipes */}
        {PIPES.map((p, i) => (
          <WaterPipe key={i} points={p.points} flowRef={flowRef} startAt={p.startAt} endAt={p.endAt} color={p.color} />
        ))}

        {/* Pipeline nodes */}
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
            showClickHint={!isFlowStarted}
          />
        ))}
      </group>
    </>
  );
}
