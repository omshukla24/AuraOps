import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, CameraControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
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

export interface NodeDef {
  id: string; label: string; sublabel: string;
  pos: [number, number, number]; color: string;
  revealAt: number; branches: SubBranch[];
  isTrigger?: boolean; isScorecard?: boolean;
  processDesc?: string;
  logs?: string[];
  icon?: string;
}

export const INITIAL_NODES: NodeDef[] = [
  {
    id: 'trigger', label: 'GitLab MR Opened', sublabel: 'Listening', pos: [-15, 0, 0], color: '#ffffff', revealAt: -1, isTrigger: true, branches: [],
    icon: '📡',
    processDesc: 'Listening for incoming webhooks from GitLab REST API. Intercepting Merge Request opened events and extracting commit differences.',
    logs: ['> Ready and listening for /webhook', '> Waiting for MR event...', '> Idle']
  },
  {
    id: 'security', label: 'SecurityAgent', sublabel: 'Claude 4.6 Sonnet', pos: [-7, 6, -2], color: '#F97066', revealAt: 15, branches: [
      { id: 'sec-v', label: 'Vulnerabilities', value: 'Pending', details: ['Awaiting scan'], dormant: [0.5, 0.4, 0], expanded: [-1.2, 4.0, 1] },
      { id: 'sec-s', label: 'Security Score', value: 'Pending', details: ['Awaiting scoring'], dormant: [-0.5, 0.3, 0.2], expanded: [-4.2, 1.5, 0] },
      { id: 'sec-m', label: 'Analysis', value: 'Pending', details: ['Awaiting AST scan'], dormant: [0.4, -0.5, -0.5], expanded: [4.5, 3.0, 1.2] },
    ],
    icon: '🔐',
    processDesc: 'Claude 4.6 Sonnet is conducting SAST/DAST analysis on the modified lines. Searching for credential leaks and hardcoded vulnerabilities.',
    logs: ['> Target: codebase', '> generating AST syntax tree...', '> Waiting for agent...']
  },
  {
    id: 'greenops', label: 'GreenOpsAgent', sublabel: 'Carbon API', pos: [-7, -6, 2], color: '#10B981', revealAt: 15, branches: [
      { id: 'grn-r', label: 'Region', value: 'Pending', details: ['Awaiting deployment spec'], dormant: [0.6, -0.6, 0], expanded: [0, -5.0, 2.5] },
      { id: 'grn-c', label: 'CO₂ Saved', value: 'Pending', details: ['Awaiting profile'], dormant: [-0.6, -0.5, 0.3], expanded: [-4.5, -3.5, 0] },
      { id: 'grn-e', label: 'Eco Score', value: 'Pending', details: ['Awaiting computation'], dormant: [0.4, 0.5, 0.5], expanded: [4.5, -3.0, 1.2] },
    ],
    icon: '🌱',
    processDesc: 'Analyzing CI/CD infrastructure allocation against real-time API telemetry to optimize power grid usage and eliminate wasted compute.',
    logs: ['> Profiling pipeline job resource usage', '> Gathering carbon intensity telemetry', '> Waiting for agent...']
  },
  {
    id: 'validation', label: 'ValidationAgent', sublabel: 'GitLab CI', pos: [1, 0, 0], color: '#38BDF8', revealAt: 35, branches: [
      { id: 'val-t', label: 'Tests', value: 'Pending', details: ['Awaiting test suite'], dormant: [0.5, 0.6, 0], expanded: [0, 5.0, -1.2] },
      { id: 'val-d', label: 'Duration', value: 'Pending', details: ['Awaiting run'], dormant: [-0.5, -0.6, 0], expanded: [0, -5.0, 1.2] },
    ],
    icon: '🧪',
    processDesc: 'Running end-to-end integration and unit tests against the generated security fixes in an ephemeral parallel runner.',
    logs: ['> Provisioning runner: docker+machine', '> Waiting for agent...']
  },
  {
    id: 'risk', label: 'RiskEngine', sublabel: 'Release Authority', pos: [9, 4, -1], color: '#F59E0B', revealAt: 55, branches: [
      { id: 'rsk-d', label: 'Decision', value: 'Pending', details: ['Awaiting Phase 1 outputs'], dormant: [0, 0.7, 0], expanded: [0, 5.0, -1.2] },
      { id: 'rsk-c', label: 'Confidence', value: 'Pending', details: ['Awaiting AI synthesis'], dormant: [0, -0.6, 0], expanded: [0, -5.0, 1.2] },
    ],
    icon: '⚖️',
    processDesc: 'Consolidating AI reports from Security, GreenOps, and Validation to calculate a unified risk tolerance matrix before merge.',
    logs: ['> Gathering Phase 1 signals', '> Waiting for agent...']
  },
  {
    id: 'compliance', label: 'ComplianceAgent', sublabel: 'SOC2 / GDPR', pos: [17, -4, 1], color: '#8B5CF6', revealAt: 70, branches: [
      { id: 'cmp-s', label: 'SOC2 Score', value: 'Pending', details: ['Awaiting schema validation'], dormant: [0.5, 0.5, 0], expanded: [3.0, 3.8, 0] },
      { id: 'cmp-k', label: 'Checks', value: 'Pending', details: ['Awaiting checklist'], dormant: [-0.5, 0.5, 0], expanded: [-3.0, 3.5, 0] },
    ],
    icon: '📋',
    processDesc: 'Verifying regulatory compliance standard adherence across the deployment perimeter (SOC2, HIPAA, GDPR rulesets).',
    logs: ['> Scanning schemas', '> Waiting for agent...']
  },
  {
    id: 'deploy', label: 'DeployAgent', sublabel: 'Cloud Run', pos: [25, 2, 0], color: '#06B6D4', revealAt: 85, branches: [
      { id: 'dep-u', label: 'Deployed', value: 'Pending', details: ['Awaiting container build'], dormant: [0.5, 0.5, 0], expanded: [3.0, 3.8, 0] },
      { id: 'dep-r', label: 'Region', value: 'Pending', details: ['Awaiting target'], dormant: [-0.5, -0.5, 0], expanded: [-3.0, -3.8, 0] },
    ],
    icon: '🚀',
    processDesc: 'Executing final infrastructure-as-code deployment to Google Cloud Run utilizing the optimized, risk-approved container artifacts.',
    logs: ['> Preparing artifacts', '> Waiting for agent...']
  },
  {
    id: 'scorecard', label: 'AuraOps Scorecard', sublabel: 'Release Complete', pos: [33, -2, 0], color: '#FBBf24', revealAt: 98, isScorecard: true, branches: [],
    icon: '🏆',
    processDesc: 'Release pipeline concluded. An aggregated overview of the fully autonomous remediation and deployment cycle.',
    logs: ['> Pipeline complete', '> Awaiting next trigger event...']
  },
];

export const TOUR_NODES = INITIAL_NODES; // Map exactly to the pipeline array sequence

// ═══════════════════════════════════════
//  PIPE DEFINITIONS
// ═══════════════════════════════════════

interface PipeDef {
  points: [number, number, number][];
  startAt: number; endAt: number; color: string;
}

const PIPES: PipeDef[] = [
  { points: [[-15, 0, 0], [-11, 3, -1], [-7, 6, -2]], startAt: 0, endAt: 15, color: '#F97066' },
  { points: [[-15, 0, 0], [-11, -3, 1], [-7, -6, 2]], startAt: 0, endAt: 15, color: '#10B981' },
  { points: [[-7, 6, -2], [-3, 3, -1], [1, 0, 0]], startAt: 15, endAt: 35, color: '#38BDF8' },
  { points: [[-7, -6, 2], [-3, -3, 1], [1, 0, 0]], startAt: 15, endAt: 35, color: '#38BDF8' },
  { points: [[1, 0, 0], [5, 2, -0.5], [9, 4, -1]], startAt: 35, endAt: 55, color: '#F59E0B' },
  { points: [[9, 4, -1], [13, 0, 0], [17, -4, 1]], startAt: 55, endAt: 70, color: '#8B5CF6' },
  { points: [[17, -4, 1], [21, -1, 0.5], [25, 2, 0]], startAt: 70, endAt: 85, color: '#06B6D4' },
  { points: [[25, 2, 0], [29, 0, 0], [33, -2, 0]], startAt: 85, endAt: 100, color: '#FBBf24' },
];

// ═══════════════════════════════════════
//  MAIN SCENE
// ═══════════════════════════════════════

export default function AuraUniverse({ nodes, tourIndex, onTourIndexChange, scorecardData, completedAgents }: { nodes: NodeDef[], tourIndex: number, onTourIndexChange?: (i: number) => void, scorecardData?: any, completedAgents?: Set<string> }) {
  const [flowState, setFlowState] = useState<FlowState>('IDLE');
  const pipeProgressRef = useRef(0); // 0 to 100
  const [litNodes, setLitNodes] = useState<Set<string>>(new Set(['trigger']));
  const [expandedBubbles, setExpandedBubbles] = useState<string[]>([]);

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
      // SSE-driven: compute target progress from completedAgents
      const agentProgressMap: Record<string, number> = {
        'security': 20,
        'greenops': 20,
        'validation': 40,
        'risk': 60,
        'compliance': 80,
        'deploy': 90,
        'scorecard': 100,
      };

      let targetProgress = 5; // Start with a small amount to show flow began
      if (completedAgents && completedAgents.size > 0) {
        for (const [agent, progress] of Object.entries(agentProgressMap)) {
          if (completedAgents.has(agent) && progress > targetProgress) {
            targetProgress = progress;
          }
        }
      }

      // Smoothly approach the target progress
      const diff = targetProgress - pipeProgressRef.current;
      if (diff > 0.1) {
        pipeProgressRef.current += Math.min(diff, dt * 15); // Smooth approach
      } else {
        pipeProgressRef.current = targetProgress;
      }

      if (pipeProgressRef.current >= 100) {
        pipeProgressRef.current = 100;
        setFlowState('COMPLETE');
      }

      const newLit = new Set(['trigger']);
      for (const n of nodes) {
        if (n.revealAt >= 0 && pipeProgressRef.current >= n.revealAt) newLit.add(n.id);
      }
      if (newLit.size !== litNodes.size) setLitNodes(newLit);

      // Auto-advance tour index based on progress
      const autoTourNodes = [
        { idx: 0, at: 0 },
        { idx: 1, at: 15 },
        { idx: 2, at: 23 },
        { idx: 3, at: 35 },
        { idx: 4, at: 55 },
        { idx: 5, at: 70 },
        { idx: 6, at: 85 },
        { idx: 7, at: 98 },
      ];

      let currentStage = 0;
      for (let i = autoTourNodes.length - 1; i >= 0; i--) {
        if (pipeProgressRef.current >= autoTourNodes[i].at) {
          currentStage = autoTourNodes[i].idx;
          break;
        }
      }
      if (tourIndex !== currentStage && onTourIndexChange) {
        onTourIndexChange(currentStage);
      }
    }
  });

  // Cinematic Fly-To: camera flies to relevant node on tour change AND animation progress
  useEffect(() => {
    if (!cameraControlsRef.current) return;
    if (flowState === 'IDLE' || flowState === 'SHIFTING_LAYOUT') return;
    if (tourIndex === 0 && flowState !== 'COMPLETE') return;

    const targetNode = nodes[tourIndex];
    if (!targetNode) return;

    let [tx, ty, tz] = targetNode.pos;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    let camY = isMobile ? ty - 6 : ty;
    let distZ = isMobile ? tz + 25 : tz + 22;

    // Wide angle for Security + GreenOps parallel split
    if (tourIndex === 1 || tourIndex === 2) {
      const n1 = nodes[1]?.pos || [0,0,0];
      const n2 = nodes[2]?.pos || [0,0,0];
      tx = (n1[0] + n2[0]) / 2;
      ty = (n1[1] + n2[1]) / 2;
      tz = (n1[2] + n2[2]) / 2;
      camY = isMobile ? -6 : 0;
      distZ = isMobile ? tz + 38 : tz + 32;
    }

    // Smooth fly to node
    cameraControlsRef.current.setLookAt(tx, camY, distZ, tx, camY, tz, true);

    // Expand branches for the focused node(s)
    let bubblesToExpand = [...(targetNode.branches?.map(b => b.id) || [])];
    if (tourIndex === 1 || tourIndex === 2) {
      bubblesToExpand = [
        ...(nodes[1]?.branches || []).map(b => b.id),
        ...(nodes[2]?.branches || []).map(b => b.id),
      ];
    }
    setExpandedBubbles(bubblesToExpand);
  }, [tourIndex, flowState, nodes]);

  const isProcessing = flowState === 'DRAWING_PIPES';

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
        {nodes.map((n, i) => (
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
            isProcessing={isProcessing}
            branches={n.branches}
            expandedBubbles={expandedBubbles}
            onToggleBubble={toggleBubble}
            onTriggerClick={startFlow}
            onNodeClick={() => { if (onTourIndexChange) onTourIndexChange(i); }}
            showClickHint={flowState === 'IDLE'}
            scorecardData={n.isScorecard ? scorecardData : undefined}
          />
        ))}
      </group>

      <EffectComposer>
        <Bloom luminanceThreshold={1.0} luminanceSmoothing={0.1} height={300} intensity={1.2} />
      </EffectComposer>
    </>
  );
}
