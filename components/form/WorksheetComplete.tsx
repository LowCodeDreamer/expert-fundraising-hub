"use client";

interface WorksheetCompleteProps {
  worksheetNumber: number;
  name?: string;
  email: string;
  completedWorksheets: number[];
}

export function WorksheetComplete({ worksheetNumber, name, email, completedWorksheets }: WorksheetCompleteProps) {
  const reviewable = [...new Set(completedWorksheets)].sort((a, b) => a - b);
  const allThreeDone = reviewable.length === 3;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center animate-in fade-in duration-500">
        {/* Checkmark circle */}
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 16L14 20L22 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
          </svg>
        </div>

        <h1 className="text-3xl font-heading font-bold text-foreground mb-3">
          Worksheet {worksheetNumber} Complete!
        </h1>

        {name && (
          <p className="text-lg text-muted-foreground mb-2">
            Great work, {name}.
          </p>
        )}

        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          {allThreeDone
            ? "You've completed all three worksheets. Your personalized feedback from Alex is on its way — keep an eye on your inbox."
            : "Your responses have been saved. When the next video is released in the course, you'll receive a link to continue. You can close this tab."}
        </p>

        {/* Review links for completed worksheets — no forward navigation. */}
        {reviewable.length > 0 && (
          <div className="space-y-3 max-w-xs mx-auto">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Review or update your answers
            </p>
            {reviewable.map((n) => (
              <a
                key={n}
                href={`/form?email=${encodeURIComponent(email)}&worksheet=${n}`}
                className="block w-full px-6 py-3 border border-border rounded-lg font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                {n === worksheetNumber ? `Review Worksheet ${n} (just completed)` : `Review Worksheet ${n}`}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
