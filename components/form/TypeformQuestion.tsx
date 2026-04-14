"use client";

import { cn } from "@/lib/utils";

interface TypeformQuestionProps {
  isActive: boolean;
  children: React.ReactNode;
  questionNumber: number;
  totalQuestions: number;
}

export function TypeformQuestion({ isActive, children, questionNumber, totalQuestions }: TypeformQuestionProps) {
  return (
    <div
      className={cn(
        "transition-all duration-400 ease-out w-full",
        isActive
          ? "opacity-100 translate-y-0 relative"
          : "opacity-0 translate-y-5 absolute pointer-events-none"
      )}
      style={{ transitionDuration: "400ms" }}
      aria-hidden={!isActive}
    >
      <div className="mb-4 text-sm text-muted-foreground">
        {questionNumber} of {totalQuestions}
      </div>
      {children}
    </div>
  );
}
