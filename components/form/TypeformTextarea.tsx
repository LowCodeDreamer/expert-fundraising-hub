"use client";

import { useEffect, useRef } from "react";

interface TypeformTextareaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  autoFocus?: boolean;
}

export function TypeformTextarea({ value, onChange, placeholder, rows = 4, error, autoFocus }: TypeformTextareaProps) {
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
        className="w-full bg-transparent border border-border rounded-lg focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-lg text-foreground placeholder:text-muted-foreground/50 p-4 transition-colors font-sans resize-none"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
