"use client";

import { TypeformProgress } from "./TypeformProgress";

interface TypeformLayoutProps {
  children: React.ReactNode;
  worksheetTitle: string;
  progress: { current: number; total: number };
  onBack?: () => void;
  showBack?: boolean;
}

export function TypeformLayout({ children, worksheetTitle, progress, onBack, showBack }: TypeformLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TypeformProgress current={progress.current} total={progress.total} />

      {/* Header area */}
      <div className="pt-8 px-6">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          {showBack && onBack ? (
            <button
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          ) : <div />}
          <p className="text-sm text-muted-foreground font-medium">{worksheetTitle}</p>
        </div>
      </div>

      {/* Content area - vertically centered */}
      <div className="flex-1 flex items-center px-6">
        <div className="mx-auto max-w-2xl w-full py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
