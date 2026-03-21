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

interface NodeDef {
  id: string; label: string; sublabel: string;
  pos: [number, number, number]; color: string;
  revealAt: number; branches: SubBranch[];
  isTrigger?: boolean; isScorecard?: boolean;
  processDesc?: string;
  logs?: string[];
  icon?: string;
}

const NODES: NodeDef[] = [
  { id: 'trigger', label: 'GitLab MR Opened', sublabel: 'Webhook received', pos: [-15, 0, 0], color: '#ffffff', revealAt: -1, isTrigger: true, branches: [],
    icon: '📡',
    processDesc: 'Listening for incoming webhooks from GitLab REST API. Intercepting Merge Request opened events and extracting commit differences.',
    logs: ['> Received POST /webhook/gitlab', '> Event: Merge Request #42 Opened', '> Author: @omshukla24', '> Extracted 3 changed files', '> Triggering agent orchestration...']
  },
  { id: 'security', label: 'SecurityAgent', sublabel: 'Claude Sonnet', pos: [-7, 6, -2], color: '#F97066', revealAt: 15, branches: [
    { id: 'sec-v', label: 'Vulnerabilities', value: '3 → 0 Patched', dormant: [0.6, 0.6, 0], expanded: [0, 5.0, -2.5] },
    { id: 'sec-s', label: 'Security Score', value: '84/100', dormant: [-0.6, 0.5, 0.3], expanded: [-4.5, 3.5, 0] },
    { id: 'sec-m', label: 'Analysis', value: 'Claude Sonnet 3.5', dormant: [0.4, -0.5, -0.5], expanded: [4.5, 3.0, 1.2] },
  ],
    icon: '🛡️',
    processDesc: 'Claude 3.5 Sonnet is conducting SAST/DAST analysis on the modified lines. Searching for credential leaks and hardcoded vulnerabilities.',
    logs: ['> Target: backend/auth.py', '> Detected hardcoded AWS secret (Line 42)', '> Generating AST syntax tree...', '> Auto-patching vulnerability with Claude', '> Patch successfully verified via linter']
  },
  { id: 'greenops', label: 'GreenOpsAgent', sublabel: 'Carbon API', pos: [-7, -6, 2], color: '#10B981', revealAt: 15, branches: [
    { id: 'grn-r', label: 'Region', value: 'us-central1 → eu-north1', dormant: [0.6, -0.6, 0], expanded: [0, -5.0, 2.5] },
    { id: 'grn-c', label: 'CO₂ Saved', value: '2.4 kg/month', dormant: [-0.6, -0.5, 0.3], expanded: [-4.5, -3.5, 0] },
    { id: 'grn-e', label: 'Eco Score', value: '82/100', dormant: [0.4, 0.5, 0.5], expanded: [4.5, -3.0, 1.2] },
  ],
    icon: '🌱',
    processDesc: 'Analyzing CI/CD infrastructure allocation against real-time API telemetry to optimize power grid usage and eliminate wasted compute.',
    logs: ['> Profiling pipeline job resource usage', '> CPU utilization idle at 85% during test phase', '> Region us-central1 carbon intensity: high', '> Migrating workloads to europe-north1 (low carbon)', '> Estimated savings: 2.4 kg CO₂/month']
  },
  { id: 'validation', label: 'ValidationAgent', sublabel: 'GitLab CI', pos: [1, 0, 0], color: '#38BDF8', revealAt: 35, branches: [
    { id: 'val-t', label: 'Tests', value: '142/142 Passed ✅', dormant: [0.5, 0.6, 0], expanded: [0, 4.5, -1.2] },
    { id: 'val-d', label: 'Duration', value: '47s', dormant: [-0.5, -0.6, 0], expanded: [0, -4.0, 1.2] },
  ],
    icon: '🧪',
    processDesc: 'Running end-to-end integration and unit tests against the generated security fixes in an ephemeral parallel runner.',
    logs: ['> Provisioning runner: docker+machine', '> Applying patch: auth.py', '> Running pytest e2e_suite/...', '> 142/142 tests passed ✅', '> Total duration: 47 seconds']
  },
  { id: 'risk', label: 'RiskEngine', sublabel: 'Release Authority', pos: [9, 4, -1], color: '#F59E0B', revealAt: 55, branches: [
    { id: 'rsk-d', label: 'Decision', value: 'APPROVED', dormant: [0, 0.7, 0], expanded: [0, 5.0, -1.2] },
    { id: 'rsk-c', label: 'Confidence', value: '91%', dormant: [0, -0.6, 0], expanded: [0, -4.0, 1.2] },
  ],
    icon: '⚖️',
    processDesc: 'Consolidating AI reports from Security, GreenOps, and Validation to calculate a unified risk tolerance matrix before merge.',
    logs: ['> Ingesting Security Score (84/100)', '> Ingesting GreenOps Score (82/100)', '> Validating CI pipeline integrity', '> Risk Level: LOW', '> Decision: APPROVED (91% confidence)']
  },
  { id: 'compliance', label: 'ComplianceAgent', sublabel: 'SOC2 / GDPR', pos: [17, -4, 1], color: '#8B5CF6', revealAt: 70, branches: [
    { id: 'cmp-s', label: 'SOC2 Score', value: '88/100', dormant: [0.5, 0.5, 0], expanded: [3.0, 3.8, 0] },
    { id: 'cmp-k', label: 'Checks', value: '8/9 Passed', dormant: [-0.5, 0.5, 0], expanded: [-3.0, 3.5, 0] },
  ],
    icon: '📋',
    processDesc: 'Verifying regulatory compliance standard adherence across the deployment perimeter (SOC2, HIPAA, GDPR rulesets).',
    logs: ['> Scanning PII handling in database schemas', '> Verified encryption-at-rest requirements', '> Traceability headers: OK', '> 8/9 automated checks passed', '> Generating compliance artifact report']
  },
  { id: 'deploy', label: 'DeployAgent', sublabel: 'Cloud Run', pos: [25, 2, 0], color: '#06B6D4', revealAt: 85, branches: [
    { id: 'dep-u', label: 'Deployed', value: 'auraops-demo.run.app', dormant: [0.5, 0.5, 0], expanded: [3.0, 3.8, 0] },
    { id: 'dep-r', label: 'Region', value: 'europe-north1', dormant: [-0.5, -0.5, 0], expanded: [-3.0, -3.8, 0] },
  ],
    icon: '🚀',
    processDesc: 'Executing final infrastructure-as-code deployment to Google Cloud Run utilizing the optimized, risk-approved container artifacts.',
    logs: ['> Authenticating via Workload Identity', '> Tagging container: auraops-demo:v1.2.4', '> Deploying to europe-north1', '> Routing 100% traffic to new revision', '> Service deployed successfully']
  },
  { id: 'scorecard', label: 'AuraOps Scorecard', sublabel: 'Release Complete', pos: [33, -2, 0], color: '#FBBf24', revealAt: 98, isScorecard: true, branches: [],
    icon: '🏆',
    processDesc: 'Release pipeline concluded. An aggregated overview of the fully autonomous remediation and deployment cycle.',
    logs: ['> Pipeline complete', '> Merging MR #42 automatically', '> Commenting remediation summary on GitLab MR', '> Awaiting next trigger event...']
  },
];

export const TOUR_NODES = NODES; // Map exactly to the pipeline array sequence

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

export default function AuraUniverse({ tourIndex, onTourIndexChange }: { tourIndex: number, onTourIndexChange?: (i: number) => void }) {
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
      pipeProgressRef.current += dt * 8; // 12.5 seconds total flow time (100 / 8)
      
      if (pipeProgressRef.current >= 100) {
        pipeProgressRef.current = 100;
        setFlowState('COMPLETE');
      }

      const newLit = new Set(['trigger']);
      for (const n of NODES) {
        if (n.revealAt >= 0 && pipeProgressRef.current >= n.revealAt) newLit.add(n.id);
      }
      if (newLit.size !== litNodes.size) setLitNodes(newLit);

      // Auto-advance tour index to sync terminal window with pipeline
      const autoTourNodes = [
        { idx: 0, at: 0 },
        { idx: 1, at: 15 }, // Security
        { idx: 2, at: 23 }, // GreenOps (staggered slightly to allow user to read Security logs)
        { idx: 3, at: 35 }, // Validation
        { idx: 4, at: 55 }, // Risk Engine
        { idx: 5, at: 70 }, // Compliance
        { idx: 6, at: 85 }, // Deploy
        { idx: 7, at: 98 }, // Scorecard
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

  // Cinematic Fly-To Animation
  useEffect(() => {
    if (cameraControlsRef.current) {
      const targetNode = TOUR_NODES[tourIndex];
      if (!targetNode) return;
      
      const [tx, ty, tz] = targetNode.pos;
      const finalX = flowState === 'IDLE' ? tx + 15 : tx;
      
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      
      let camY = isMobile ? ty - 6 : ty;
      let distZ = tz + 15;
      
      // Feature: Zoom out camera to visually group the Security + GreenOps parallel split
      if (tourIndex === 1 || tourIndex === 2) {
        camY = isMobile ? -6 : 0; // Look directly at the center of the Y-axis split
        distZ = tz + 26; // Massive Z pushback to fit both nodes in viewport
      }
      
      // Fly to node pos, looking perfectly backwards
      cameraControlsRef.current.setLookAt(finalX, camY, distZ, finalX, camY, tz, true);
      
      // Auto-expand branches for the currently focused tour node
      let bubblesToExpand = [...(targetNode.branches?.map(b => b.id) || [])];
      
      // Feature: Both parallel branches open simultaneously
      if (tourIndex === 1 || tourIndex === 2) {
         bubblesToExpand = [
           ...TOUR_NODES[1].branches.map(b => b.id),
           ...TOUR_NODES[2].branches.map(b => b.id)
         ];
      }
      setExpandedBubbles(bubblesToExpand);
    }
  }, [tourIndex, flowState]);

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
            isProcessing={isProcessing}
            branches={n.branches}
            expandedBubbles={expandedBubbles}
            onToggleBubble={toggleBubble}
            onTriggerClick={startFlow}
            showClickHint={flowState === 'IDLE'}
          />
        ))}
      </group>

      <EffectComposer>
        <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.9} height={300} intensity={0.8} />
      </EffectComposer>
    </>
  );
}
