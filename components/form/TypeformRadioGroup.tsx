"use client";

import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface TypeformRadioGroupProps {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  onSelect: () => void;
  error?: string;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function TypeformRadioGroup({ options, value, onChange, onSelect, error }: TypeformRadioGroupProps) {
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    const key = e.key.toUpperCase();
    const idx = LETTERS.indexOf(key);
    if (idx >= 0 && idx < options.length) {
      onChange(options[idx]);
      setTimeout(onSelect, 400);
    }
  }, [options, onChange, onSelect]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div className="space-y-3">
      {options.map((option, i) => (
        <button
          key={option}
          type="button"
          onClick={() => {
            onChange(option);
            setTimeout(onSelect, 400);
          }}
          className={cn(
            "w-full flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-all duration-200",
            value === option
              ? "border-accent bg-accent/10 shadow-sm"
              : "border-border hover:border-accent/40 hover:bg-accent/5"
          )}
        >
          <span className={cn(
            "flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm font-medium border",
            value === option
              ? "bg-accent text-white border-accent"
              : "bg-muted/50 text-muted-foreground border-border"
          )}>
            {LETTERS[i]}
          </span>
          <span className="text-base text-foreground">{option}</span>
        </button>
      ))}
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      <p className="text-xs text-muted-foreground mt-3">Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">A</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">B</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">C</kbd>... to select</p>
    </div>
  );
}
