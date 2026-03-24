import React, { useEffect, useRef } from 'react';
import type { ExecutionStep } from '../types';

interface Props {
  steps: ExecutionStep[];
  isRunning: boolean;
}

const STEP_STYLES: Record<string, { color: string; icon: string; label: string }> = {
  thinking: {
    color: 'var(--accent)',
    icon: 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18',
    label: 'THINKING',
  },
  tool_call: {
    color: 'var(--warning)',
    icon: 'M11.42 15.17l-5.59-5.59a1.5 1.5 0 010-2.12l5.59-5.59a1.5 1.5 0 012.12 0l5.59 5.59a1.5 1.5 0 010 2.12l-5.59 5.59a1.5 1.5 0 01-2.12 0z',
    label: 'TOOL CALL',
  },
  observation: {
    color: 'var(--success)',
    icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    label: 'OBSERVE',
  },
  complete: {
    color: 'var(--success)',
    icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    label: 'COMPLETE',
  },
  error: {
    color: 'var(--error)',
    icon: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
    label: 'ERROR',
  },
};

export function ExecutionPanel({ steps, isRunning }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  return (
    <div className="h-[280px] border-t border-[var(--border)] bg-[var(--bg-surface)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Execution Trace</h3>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--accent)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              Running
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          {steps.length} step{steps.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {steps.length === 0 && !isRunning && (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
            Click "Run Workflow" to see execution trace
          </div>
        )}
        {steps.map((step) => {
          const style = STEP_STYLES[step.type] ?? STEP_STYLES.thinking;
          return (
            <div key={step.id} className="flex gap-3 animate-fade-in">
              <div className="flex-shrink-0 mt-0.5">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: `${style.color}20` }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={style.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={style.icon} />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold tracking-wider" style={{ color: style.color }}>
                    {style.label}
                  </span>
                  {step.durationMs > 0 && (
                    <span className="text-[10px] text-[var(--text-muted)]">{step.durationMs}ms</span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {step.type === 'tool_call' ? (
                    <code className="text-xs bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded font-mono">
                      {step.content}
                    </code>
                  ) : (
                    step.content
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
