"use client";

interface WorksheetCompleteProps {
  worksheetNumber: number;
  name?: string;
  email: string;
  completedWorksheets: number[];
}

const ALL_WORKSHEETS = [1, 2, 3];

export function WorksheetComplete({ worksheetNumber, name, email, completedWorksheets }: WorksheetCompleteProps) {
  const otherCompleted = completedWorksheets.filter((n) => n !== worksheetNumber);
  const nextIncomplete = ALL_WORKSHEETS.find((n) => n !== worksheetNumber && !completedWorksheets.includes(n));

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

        <p className="text-muted-foreground mb-8">
          Your responses have been saved.
        </p>

        {/* Navigation to other worksheets */}
        <div className="space-y-3 max-w-xs mx-auto">
          {nextIncomplete && (
            <a
              href={`/form?email=${encodeURIComponent(email)}&worksheet=${nextIncomplete}`}
              className="block w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Continue to Worksheet {nextIncomplete}
            </a>
          )}

          {otherCompleted.map((n) => (
            <a
              key={n}
              href={`/form?email=${encodeURIComponent(email)}&worksheet=${n}`}
              className="block w-full px-6 py-3 border border-border rounded-lg font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              Review Worksheet {n}
            </a>
          ))}
        </div>

        {!nextIncomplete && otherCompleted.length === 0 && (
          <p className="text-sm text-muted-foreground mt-4">
            You can close this tab and return to the course.
          </p>
        )}
      </div>
    </div>
  );
}
