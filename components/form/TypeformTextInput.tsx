"use client";

import { useEffect, useRef } from "react";

interface TypeformTextInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  onEnter: () => void;
  error?: string;
  autoFocus?: boolean;
}

export function TypeformTextInput({ value, onChange, placeholder, type = "text", onEnter, error, autoFocus }: TypeformTextInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <div className="space-y-2">
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEnter(); } }}
        className="w-full bg-transparent border-0 border-b-2 border-border focus:border-accent outline-none text-2xl text-foreground placeholder:text-muted-foreground/50 py-2 transition-colors font-sans"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
