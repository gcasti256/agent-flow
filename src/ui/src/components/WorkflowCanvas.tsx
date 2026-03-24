import React, { useRef, useCallback } from 'react';
import type { WorkflowNode } from '../types';

interface Props {
  nodes: WorkflowNode[];
  onNodesChange: (nodes: WorkflowNode[]) => void;
  selectedNode: string | null;
  onSelectNode: (id: string | null) => void;
}

const NODE_COLORS: Record<string, string> = {
  input: '#22c55e',
  agent: '#6366f1',
  tool: '#f59e0b',
  output: '#3b82f6',
  condition: '#ec4899',
};

const NODE_ICONS: Record<string, string> = {
  input: 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
  agent: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5',
  tool: 'M11.42 15.17l-5.59-5.59a1.5 1.5 0 010-2.12l5.59-5.59a1.5 1.5 0 012.12 0l5.59 5.59a1.5 1.5 0 010 2.12l-5.59 5.59a1.5 1.5 0 01-2.12 0z',
  output: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
  condition: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z',
};

export function WorkflowCanvas({ nodes, onNodesChange, selectedNode, onSelectNode }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      dragRef.current = {
        nodeId,
        offsetX: e.clientX - node.x,
        offsetY: e.clientY - node.y,
      };
      onSelectNode(nodeId);
    },
    [nodes, onSelectNode],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return;
      const { nodeId, offsetX, offsetY } = dragRef.current;
      onNodesChange(
        nodes.map((n) =>
          n.id === nodeId ? { ...n, x: e.clientX - offsetX, y: e.clientY - offsetY } : n,
        ),
      );
    },
    [nodes, onNodesChange],
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Draw connection lines between nodes
  const sortedNodes = [...nodes].sort((a, b) => a.x - b.x);
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < sortedNodes.length - 1; i++) {
    edges.push({
      x1: sortedNodes[i].x + 140,
      y1: sortedNodes[i].y + 35,
      x2: sortedNodes[i + 1].x,
      y2: sortedNodes[i + 1].y + 35,
    });
  }

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative overflow-hidden bg-[var(--bg-primary)]"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => onSelectNode(null)}
      style={{
        backgroundImage:
          'radial-gradient(circle, var(--border) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <marker id="arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--border-active)" />
          </marker>
        </defs>
        {edges.map((edge, i) => (
          <g key={i}>
            <path
              d={`M ${edge.x1} ${edge.y1} C ${edge.x1 + 60} ${edge.y1}, ${edge.x2 - 60} ${edge.y2}, ${edge.x2} ${edge.y2}`}
              stroke="var(--border-active)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="6 3"
              markerEnd="url(#arrow)"
              opacity={0.6}
            />
          </g>
        ))}
      </svg>

      {/* Nodes */}
      {nodes.map((node) => {
        const color = NODE_COLORS[node.type] ?? '#6366f1';
        const isSelected = selectedNode === node.id;
        return (
          <div
            key={node.id}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            onClick={(e) => e.stopPropagation()}
            className={`absolute w-[140px] cursor-grab active:cursor-grabbing rounded-xl border transition-all duration-150 select-none
              ${isSelected ? 'border-[var(--border-active)] shadow-lg shadow-indigo-500/20' : 'border-[var(--border)] hover:border-[var(--text-muted)]'}
            `}
            style={{
              left: node.x,
              top: node.y,
              background: 'var(--bg-surface)',
            }}
          >
            <div
              className="h-1.5 rounded-t-xl"
              style={{ background: color }}
            />
            <div className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={NODE_ICONS[node.type] ?? NODE_ICONS.agent} />
                </svg>
                <span className="text-xs font-medium" style={{ color }}>
                  {node.type.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-[var(--text-primary)] font-medium truncate">{node.label}</p>
            </div>
          </div>
        );
      })}

      {/* Empty state hint */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
          <p>Drag tools from the panel to build your workflow</p>
        </div>
      )}
    </div>
  );
}
