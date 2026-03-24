export interface WorkflowNode {
  id: string;
  type: 'input' | 'agent' | 'tool' | 'output' | 'condition';
  label: string;
  x: number;
  y: number;
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  label?: string;
}

export interface ExecutionStep {
  id: string;
  type: 'thinking' | 'tool_call' | 'observation' | 'complete' | 'error';
  content: string;
  timestamp: number;
  durationMs: number;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}
