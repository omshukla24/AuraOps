// ── AuraOps Type Definitions ──

export type NodeType = 'core' | 'security' | 'greenops' | 'validation' | 'risk' | 'compliance';
export type NodeStatus = 'idle' | 'running' | 'done' | 'error';

export interface ChildNode {
  id: string;
  label: string;
  value: string;
  offset: [number, number, number];
  color: string;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: NodeType;
  position: [number, number, number];
  color: string;
  emissive: string;
  radius: number;
  status: NodeStatus;
  description: string;
  children: ChildNode[];
}

export interface WebConnection {
  from: string;
  to: string;
  isActive: boolean;
  pulseProgress: number; // 0..1, animated
}

export interface PipelinePhase {
  phase: number;          // 0=idle, 1=scanning, 2=risk, 3=compliance, 4=done
  activeNodes: string[];  // which node IDs are currently running
  completedNodes: string[];
}

export interface GlobalResults {
  totalMRs: number;
  totalCO2: number;
  avgSecScore: number;
  vulnsPatched: number;
  timeSavedMin: number;
  visible: boolean;
}
