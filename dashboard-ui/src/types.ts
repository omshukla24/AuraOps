// ── AuraOps Type Definitions ──

export interface PipelineNode {
  id: string;
  position: [number, number, number];
  label: string;
  type: 'core' | 'security' | 'greenops' | 'validation' | 'risk' | 'compliance' | 'deploy';
  status: 'idle' | 'running' | 'done' | 'error';
  color: string;
  emissive: string;
  orbitRadius: number;
  orbitSpeed: number;
  angle: number;
}

export interface WebEdge {
  sourceId: string;
  targetId: string;
  isActive: boolean;
}

export interface AgentState {
  status: 'idle' | 'running' | 'done' | 'error';
  time?: number;
}

export interface PipelineState {
  phase: number;
  agents: Record<string, AgentState>;
}

export interface MRResult {
  mr_iid: number;
  mr_title: string;
  author: string;
  decision: 'APPROVE' | 'NEEDS_FIX' | 'BLOCK';
  confidence: number;
  sec_score: number;
  eco_score: number;
  co2_saved: number;
  deploy_url: string | null;
  elapsed: number;
  timestamp: string;
  patches_committed: number;
  vuln_count: number;
  time_saved_min: number;
}

export interface VulnDiff {
  type: string;
  severity: 'crit' | 'high' | 'medium' | 'low';
  confidence: number;
  file: string;
  before: string;
  after: string;
}

export interface LiveEvent {
  type?: string;
  message: string;
  timestamp: string;
  phase?: number;
  agent?: string;
  agents?: string[];
  status?: string;
  time?: number;
}
