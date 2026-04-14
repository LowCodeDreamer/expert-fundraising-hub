"use client";

import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = ["About You", "Framework", "Head-Heart-Hara"];

export function ProgressIndicator({
  currentStep,
  totalSteps,
}: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isComplete = step < currentStep;
        const isCurrent = step === currentStep;

        return (
          <div key={step} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all duration-300",
                  isComplete &&
                    "bg-primary text-primary-foreground",
                  isCurrent &&
                    "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  !isComplete &&
                    !isCurrent &&
                    "bg-secondary text-muted-foreground"
                )}
              >
                {isComplete ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {stepLabels[i]}
              </span>
            </div>
            {step < totalSteps && (
              <div
                className={cn(
                  "h-px w-12 transition-colors duration-300 mb-5",
                  step < currentStep ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
