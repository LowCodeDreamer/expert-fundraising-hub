"use client";

import { useEffect, useRef } from "react";

interface TypeformTextareaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  onSubmit: () => void;
  error?: string;
  autoFocus?: boolean;
}

export function TypeformTextarea({ value, onChange, placeholder, rows = 4, onSubmit, error, autoFocus }: TypeformTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <div className="space-y-2">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        className="w-full bg-transparent border border-border rounded-lg focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-lg text-foreground placeholder:text-muted-foreground/50 p-4 transition-colors font-sans resize-none"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground mt-3">Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">⌘</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Enter ↵</kbd> to continue</p>
    </div>
  );
}
