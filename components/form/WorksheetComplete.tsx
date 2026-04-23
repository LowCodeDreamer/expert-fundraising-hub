"use client";

interface WorksheetCompleteProps {
  worksheetNumber: number;
  name?: string;
  email: string;
  completedWorksheets: number[];
}

const COURSE_LINKS: Record<number, string> = {
  1: "https://courses.expertfundraising.org/products/bc5bf0ce-b072-416c-a1fd-a43213d3e4bb/categories/66b69057-ecfc-4bbb-96ee-6b7f63076bd2/posts/ec23d364-ef50-4e5e-8064-c18870e1bfbb?source=courses",
  2: "https://courses.expertfundraising.org/products/bc5bf0ce-b072-416c-a1fd-a43213d3e4bb/categories/4ceae6ab-1a62-4683-929b-66c1af805935/posts/f46081dc-cfdd-493f-aebf-65c0dcdb25e5?source=courses",
  3: "https://courses.expertfundraising.org/products/bc5bf0ce-b072-416c-a1fd-a43213d3e4bb/categories/867856c4-22f7-4e9b-b5dc-9ec92b073129/posts/53a46713-2c03-4ee5-9e7f-ac06c43a9296?source=courses",
};

export function WorksheetComplete({ worksheetNumber, name, email, completedWorksheets }: WorksheetCompleteProps) {
  const reviewable = [...new Set(completedWorksheets)].sort((a, b) => a - b);
  const allThreeDone = reviewable.length === 3;
  const courseLink = COURSE_LINKS[worksheetNumber];

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
            ? "You've completed all three worksheets. Head back to the course page and click \"Mark as complete\" to finish the course."
            : "Your responses have been saved. Head back to the course page and click \"Mark as complete\" to unlock the next video."}
        </p>

        {courseLink && (
          <div className="mb-10">
            <a
              href={courseLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Return to course page →
            </a>
          </div>
        )}

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
