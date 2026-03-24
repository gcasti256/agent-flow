import React from 'react';

interface HeaderProps {
  onRun: () => void;
  isRunning: boolean;
}

export function Header({ onRun, isRunning }: HeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-5 border-b border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="text-lg font-semibold tracking-tight">agent-flow</span>
        <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full ml-1">
          Visual Builder
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onRun}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium
            bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? (
            <>
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Run Workflow
            </>
          )}
        </button>
      </div>
    </header>
  );
}
