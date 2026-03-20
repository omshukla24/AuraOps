import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { NetworkNode, WebConnection, ChildNode, PipelinePhase, GlobalResults } from '../types';

// ── Static Neural Network Layout ──
const NETWORK_NODES: NetworkNode[] = [
  {
    id: 'core', label: 'AuraOps Core', type: 'core',
    position: [0, 0, 0], color: '#00a0b0', emissive: '#00f0ff',
    radius: 1.2, status: 'idle', description: 'Central Intelligence Hub',
    children: [
      { id: 'core-c1', label: 'MRs Processed', value: '6', offset: [-2.5, 1.5, 1], color: '#00f0ff' },
      { id: 'core-c2', label: 'Pipeline Phases', value: '3', offset: [2, 2, -1], color: '#00d0ee' },
    ],
  },
  {
    id: 'security', label: 'SecurityAgent', type: 'security',
    position: [-5, 3, -3], color: '#f97066', emissive: '#ff4444',
    radius: 0.7, status: 'idle', description: 'Vulnerability Scanner & Auto-Patcher',
    children: [
      { id: 'sec-c1', label: 'Vulns Patched', value: '7', offset: [-2, 1.5, 0.5], color: '#ff6666' },
      { id: 'sec-c2', label: 'Confidence', value: '96%', offset: [1.5, 2, -1], color: '#ff8888' },
      { id: 'sec-c3', label: 'Time Saved', value: '130 min', offset: [-0.5, -2, 1.5], color: '#ff4444' },
    ],
  },
  {
    id: 'greenops', label: 'GreenOpsAgent', type: 'greenops',
    position: [4, -2, 4], color: '#10b981', emissive: '#50ffb0',
    radius: 0.65, status: 'idle', description: 'Carbon-Aware Deployment Optimizer',
    children: [
      { id: 'green-c1', label: 'CO₂ Saved', value: '12.6 kg', offset: [2, 1.5, 0], color: '#50ffb0' },
      { id: 'green-c2', label: 'Eco Score', value: '82%', offset: [-1.5, 2, 1], color: '#30dd90' },
    ],
  },
  {
    id: 'validation', label: 'ValidationAgent', type: 'validation',
    position: [3, 4, -5], color: '#f59e0b', emissive: '#ffc107',
    radius: 0.6, status: 'idle', description: 'Code Quality & Lint Enforcer',
    children: [
      { id: 'val-c1', label: 'Tests Passed', value: '48/48', offset: [2, 1, 1.5], color: '#ffc107' },
      { id: 'val-c2', label: 'Lint Score', value: '94', offset: [-2, 1.5, -0.5], color: '#ffaa00' },
    ],
  },
  {
    id: 'risk', label: 'RiskEngine', type: 'risk',
    position: [-4, -3, 2], color: '#8b5cf6', emissive: '#9d05ff',
    radius: 0.7, status: 'idle', description: 'AI Risk Scoring & Decision Engine',
    children: [
      { id: 'risk-c1', label: 'Risk Score', value: '22/100', offset: [-2, 2, 0], color: '#9d05ff' },
      { id: 'risk-c2', label: 'Decision', value: 'APPROVE', offset: [1.5, 1.5, 1.5], color: '#b366ff' },
      { id: 'risk-c3', label: 'Confidence', value: '91%', offset: [0, -2, 2], color: '#8b5cf6' },
    ],
  },
  {
    id: 'compliance', label: 'ComplianceAgent', type: 'compliance',
    position: [5, 1, -2], color: '#3b82f6', emissive: '#00aaff',
    radius: 0.6, status: 'idle', description: 'Policy & Regulatory Gate',
    children: [
      { id: 'comp-c1', label: 'Policies Checked', value: '12', offset: [2, 1.5, 1], color: '#00aaff' },
      { id: 'comp-c2', label: 'Status', value: 'PASS', offset: [-1.5, 2, -0.5], color: '#3388ff' },
    ],
  },
];

// Connections forming a neural web (NOT orbits)
const INITIAL_CONNECTIONS: WebConnection[] = [
  { from: 'core', to: 'security', isActive: false, pulseProgress: 0 },
  { from: 'core', to: 'greenops', isActive: false, pulseProgress: 0 },
  { from: 'core', to: 'validation', isActive: false, pulseProgress: 0 },
  { from: 'security', to: 'risk', isActive: false, pulseProgress: 0 },
  { from: 'greenops', to: 'risk', isActive: false, pulseProgress: 0 },
  { from: 'validation', to: 'risk', isActive: false, pulseProgress: 0 },
  { from: 'risk', to: 'compliance', isActive: false, pulseProgress: 0 },
  { from: 'core', to: 'risk', isActive: false, pulseProgress: 0 },
  { from: 'security', to: 'compliance', isActive: false, pulseProgress: 0 },
];

// ── NetworkNode Sphere ──
interface NodeSphereProps {
  node: NetworkNode;
  isExpandable: boolean;
  isExpanded: boolean;
  onClick: (id: string) => void;
}

function NodeSphere({ node, isExpandable, isExpanded, onClick }: NodeSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = useMemo(() => new THREE.Color(node.color), [node.color]);
  const emissiveColor = useMemo(() => new THREE.Color(node.emissive), [node.emissive]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Glow pulse based on status — NO rotation
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      if (node.status === 'running') {
        mat.opacity = 0.12 + Math.sin(t * 4) * 0.08;
      } else if (node.status === 'done') {
        mat.opacity = 0.15;
      } else {
        mat.opacity = hovered ? 0.1 : 0.04;
      }
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (isExpandable) onClick(node.id);
  };

  const emissiveIntensity =
    node.status === 'running' ? 1.2 :
    node.status === 'done' ? 0.8 :
    hovered ? 0.6 : 0.3;

  return (
    <group position={node.position}>
      {/* Main sphere — STATIC, no rotation */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[node.radius, 48, 48]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.25}
          metalness={0.6}
        />
      </mesh>

      {/* Atmospheric glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[node.radius * 1.6, 32, 32]} />
        <meshBasicMaterial color={emissiveColor} transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>

      {/* Label */}
      <Html
        position={[0, -(node.radius + 0.5), 0]}
        center
        style={{
          color: node.status === 'done' ? node.emissive : (hovered ? '#ffffff' : '#8899aa'),
          fontSize: node.type === 'core' ? '12px' : '9px',
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          fontWeight: 700,
          whiteSpace: 'nowrap',
          textShadow: `0 0 10px ${node.emissive}66`,
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '1.5px',
          textTransform: 'uppercase' as const,
        }}
      >
        {node.label}
        {node.status === 'running' && <span style={{ color: '#ffc107', marginLeft: '4px' }}>●</span>}
        {node.status === 'done' && <span style={{ color: '#50ffb0', marginLeft: '4px' }}>✓</span>}
      </Html>

      {/* Status ring for core */}
      {node.type === 'core' && node.status !== 'idle' && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[node.radius * 1.8, 0.015, 16, 80]} />
          <meshBasicMaterial
            color={node.status === 'done' ? '#50ffb0' : '#ffc107'}
            transparent opacity={0.5}
          />
        </mesh>
      )}

      {/* Expandable indicator */}
      {isExpandable && !isExpanded && (
        <Html position={[0, node.radius + 0.4, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            color: node.emissive,
            fontSize: '12px',
            fontFamily: "'Space Grotesk', sans-serif",
            opacity: hovered ? 1 : 0.4,
            transition: 'opacity 0.3s',
          }}>
            ⊕
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Web Connection Line ──
function WebLine({ from, to, isActive, color }: { from: [number, number, number]; to: [number, number, number]; isActive: boolean; color: string }) {
  return (
    <Line
      points={[from, to]}
      color={isActive ? color : '#1a2a3a'}
      transparent
      opacity={isActive ? 0.35 : 0.08}
      lineWidth={isActive ? 1.2 : 0.5}
    />
  );
}

// ── Data Flow Pulse ──
function DataPulse({ from, to, progress, color }: { from: [number, number, number]; to: [number, number, number]; progress: number; color: string }) {
  const emissiveColor = useMemo(() => new THREE.Color(color), [color]);
  const pos: [number, number, number] = [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
    from[2] + (to[2] - from[2]) * progress,
  ];

  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color={emissiveColor} />
    </mesh>
  );
}

// ── Expanded Child Node ──
function ExpandedChild({ child, parentPos }: { child: ChildNode; parentPos: [number, number, number] }) {
  const childPos: [number, number, number] = [
    parentPos[0] + child.offset[0],
    parentPos[1] + child.offset[1],
    parentPos[2] + child.offset[2],
  ];

  return (
    <group>
      {/* Connection line to parent */}
      <Line
        points={[parentPos, childPos]}
        color={child.color}
        transparent opacity={0.25}
        lineWidth={0.6}
      />

      {/* Child sphere */}
      <mesh position={childPos}>
        <sphereGeometry args={[0.15, 24, 24]} />
        <meshStandardMaterial
          color={child.color}
          emissive={child.color}
          emissiveIntensity={0.8}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {/* Glassmorphic result panel */}
      <Html position={childPos} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(5, 5, 25, 0.8)',
          border: `1px solid ${child.color}33`,
          borderRadius: '8px',
          padding: '8px 14px',
          backdropFilter: 'blur(12px)',
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          whiteSpace: 'nowrap',
          transform: 'translateY(-30px)',
        }}>
          <div style={{ color: '#667788', fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {child.label}
          </div>
          <div style={{ color: child.color, fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
            {child.value}
          </div>
        </div>
      </Html>
    </group>
  );
}

// ── Global Results Cluster ──
function GlobalResultsCluster({ results }: { results: GlobalResults }) {
  if (!results.visible) return null;

  const pos: [number, number, number] = [12, 0, 0];
  const items = [
    { label: 'MRs Processed', value: String(results.totalMRs), color: '#00f0ff' },
    { label: 'CO₂ Saved', value: `${results.totalCO2} kg`, color: '#50ffb0' },
    { label: 'Avg Security', value: `${results.avgSecScore}%`, color: '#ff4444' },
    { label: 'Vulns Patched', value: String(results.vulnsPatched), color: '#ffc107' },
    { label: 'Time Saved', value: `${results.timeSavedMin} min`, color: '#9d05ff' },
  ];

  return (
    <group position={pos}>
      {/* Large translucent containment sphere */}
      <mesh>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.02} side={THREE.BackSide} />
      </mesh>

      {/* Connection to core */}
      <Line points={[[0, 0, 0], [-12, 0, 0]]} color="#00f0ff" transparent opacity={0.06} lineWidth={0.3} />

      {/* Results panel */}
      <Html center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(2, 2, 15, 0.9)',
          border: '1px solid rgba(0, 240, 255, 0.15)',
          borderRadius: '14px',
          padding: '20px 28px',
          backdropFilter: 'blur(20px)',
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          minWidth: '200px',
        }}>
          <div style={{
            color: '#00f0ff',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginBottom: '12px',
            borderBottom: '1px solid rgba(0,240,255,0.1)',
            paddingBottom: '8px',
          }}>
            Pipeline Results
          </div>
          {items.map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <span style={{ color: '#556677', fontSize: '9px', letterSpacing: '0.5px' }}>{item.label}</span>
              <span style={{ color: item.color, fontSize: '14px', fontWeight: 700, marginLeft: '16px' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </Html>
    </group>
  );
}


// ════════════════════════════════════════════════════════
// ── Main UniverseCluster ──
// ════════════════════════════════════════════════════════

interface UniverseClusterProps {
  pipelinePhase: PipelinePhase;
  globalResults: GlobalResults;
}

export default function UniverseCluster({ pipelinePhase, globalResults }: UniverseClusterProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [connections, setConnections] = useState<WebConnection[]>(INITIAL_CONNECTIONS);

  // Build a lookup for node positions
  const nodeMap = useMemo(() => {
    const m: Record<string, NetworkNode> = {};
    NETWORK_NODES.forEach(n => { m[n.id] = n; });
    return m;
  }, []);

  // Update node statuses based on pipeline phase
  const nodesWithStatus = useMemo(() => {
    return NETWORK_NODES.map(n => ({
      ...n,
      status: pipelinePhase.completedNodes.includes(n.id) ? 'done' as const :
              pipelinePhase.activeNodes.includes(n.id) ? 'running' as const :
              n.status,
    }));
  }, [pipelinePhase]);

  // Animate data pulses on active connections
  useFrame((_, delta) => {
    setConnections(prev => prev.map(c => {
      const isSourceActive = pipelinePhase.activeNodes.includes(c.from) || pipelinePhase.completedNodes.includes(c.from);
      const isTargetActive = pipelinePhase.activeNodes.includes(c.to) || pipelinePhase.completedNodes.includes(c.to);
      const shouldPulse = isSourceActive && (pipelinePhase.activeNodes.includes(c.to) || isTargetActive);

      if (shouldPulse) {
        const newProgress = c.pulseProgress + delta * 0.6;
        return { ...c, isActive: true, pulseProgress: newProgress > 1 ? 0 : newProgress };
      }
      return {
        ...c,
        isActive: pipelinePhase.completedNodes.includes(c.from) && pipelinePhase.completedNodes.includes(c.to),
        pulseProgress: 0,
      };
    }));
  });

  const toggleExpand = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const isDone = pipelinePhase.phase === 4;

  return (
    <>
      {/* Static deep-space starfield — speed=0 means ZERO movement */}
      <Stars radius={250} depth={100} count={5000} factor={4} saturation={0} fade speed={0} />

      {/* Lighting — static point lights scattered in 3D */}
      <ambientLight intensity={0.15} color="#0a1020" />
      <pointLight position={[0, 5, 8]} intensity={1.0} color="#00f0ff" distance={50} decay={2} />
      <pointLight position={[-8, -4, -6]} intensity={0.5} color="#9d05ff" distance={35} decay={2} />
      <pointLight position={[8, 3, -5]} intensity={0.4} color="#50ffb0" distance={30} decay={2} />
      <pointLight position={[0, -6, 4]} intensity={0.3} color="#ff4444" distance={25} decay={2} />

      {/* Web connection lines — neural network, NOT orbits */}
      {connections.map(c => {
        const fromNode = nodeMap[c.from];
        const toNode = nodeMap[c.to];
        if (!fromNode || !toNode) return null;
        const activeColor = fromNode.emissive;
        return (
          <group key={`${c.from}-${c.to}`}>
            <WebLine from={fromNode.position} to={toNode.position} isActive={c.isActive} color={activeColor} />
            {c.isActive && c.pulseProgress > 0 && c.pulseProgress < 1 && (
              <DataPulse from={fromNode.position} to={toNode.position} progress={c.pulseProgress} color={activeColor} />
            )}
          </group>
        );
      })}

      {/* Network nodes — STATIC positions, no orbital motion */}
      {nodesWithStatus.map(node => (
        <NodeSphere
          key={node.id}
          node={node}
          isExpandable={isDone}
          isExpanded={expandedNodes.has(node.id)}
          onClick={toggleExpand}
        />
      ))}

      {/* Expanded children with glassmorphic result panels */}
      {nodesWithStatus.map(node =>
        expandedNodes.has(node.id)
          ? node.children.map(child => (
              <ExpandedChild key={child.id} child={child} parentPos={node.position} />
            ))
          : null
      )}

      {/* Global aggregated results cluster — off to the right */}
      <GlobalResultsCluster results={globalResults} />
    </>
  );
}
