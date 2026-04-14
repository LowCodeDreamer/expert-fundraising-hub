"use client";

interface WorksheetCompleteProps {
  worksheetNumber: number;
  name?: string;
}

export function WorksheetComplete({ worksheetNumber, name }: WorksheetCompleteProps) {
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
            Great work{name ? `, ${name}` : ""}.
          </p>
        )}

        <p className="text-muted-foreground mb-6">
          Your responses have been saved.
        </p>

        <p className="text-sm text-muted-foreground">
          You can close this tab and return to the course.
        </p>
      </div>
    </div>
  );
}
