"use client";

export function TypeformProgress({ current, total }: { current: number; total: number }) {
  const progress = total > 0 ? ((current) / total) * 100 : 0;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-primary/20">
      <div
        className="h-full bg-accent transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
