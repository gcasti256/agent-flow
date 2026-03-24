import React from 'react';

const TOOL_ITEMS = [
  { type: 'input', label: 'User Input', color: '#22c55e', icon: 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' },
  { type: 'agent', label: 'Agent', color: '#6366f1', icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3' },
  { type: 'tool', label: 'Tool', color: '#f59e0b', icon: 'M11.42 15.17l-5.59-5.59a1.5 1.5 0 010-2.12l5.59-5.59a1.5 1.5 0 012.12 0l5.59 5.59a1.5 1.5 0 010 2.12l-5.59 5.59a1.5 1.5 0 01-2.12 0z' },
  { type: 'condition', label: 'Condition', color: '#ec4899', icon: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712' },
  { type: 'output', label: 'Output', color: '#3b82f6', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5' },
];

export function ToolPanel() {
  return (
    <div className="w-[200px] border-r border-[var(--border)] bg-[var(--bg-surface)] flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Components
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {TOOL_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--border)]
              hover:border-[var(--text-muted)] hover:bg-[var(--bg-hover)] cursor-grab active:cursor-grabbing
              transition-colors"
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: `${item.color}20` }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={item.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={item.icon} />
              </svg>
            </div>
            <span className="text-sm text-[var(--text-primary)]">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-[var(--border)]">
        <div className="text-[10px] text-[var(--text-muted)] leading-relaxed">
          Drag components onto the canvas to build your agent workflow.
        </div>
      </div>
    </div>
  );
}
