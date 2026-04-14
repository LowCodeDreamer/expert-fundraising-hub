"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Worksheet3Answers } from "@/types/database";

interface FormStep3Props {
  answers: Worksheet3Answers;
  onAnswersChange: (answers: Worksheet3Answers) => void;
  onSubmit: () => void;
  onBack: () => void;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

export function FormStep3({
  answers,
  onAnswersChange,
  onSubmit,
  onBack,
  errors,
  isSubmitting,
}: FormStep3Props) {
  const centers = ["Head", "Heart", "Hara"] as const;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-semibold text-foreground">
          Worksheet 3: Head-Heart-Hara Mapping
        </h2>
        <p className="mt-2 text-muted-foreground">
          Reflect on a recent donor conversation through the lens of the three
          centers.
        </p>
      </div>

      <div className="space-y-3">
        <Label>
          Think about a recent donor conversation. Which center do you think the
          donor was in most of the time?
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {centers.map((center) => (
            <label
              key={center}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-4 cursor-pointer transition-colors text-center",
                answers.q1_donor_center === center
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <input
                type="radio"
                name="q1_donor_center"
                value={center}
                checked={answers.q1_donor_center === center}
                onChange={() =>
                  onAnswersChange({ ...answers, q1_donor_center: center })
                }
                className="sr-only"
              />
              <span className="text-2xl">
                {center === "Head" ? "🧠" : center === "Heart" ? "❤️" : "⚡"}
              </span>
              <span className="font-medium text-sm">{center}</span>
              <span className="text-xs text-muted-foreground">
                {center === "Head"
                  ? "Logic & data"
                  : center === "Heart"
                    ? "Emotion & vision"
                    : "Trust & instinct"}
              </span>
            </label>
          ))}
        </div>
        {errors.q1_donor_center && (
          <p className="text-sm text-destructive">{errors.q1_donor_center}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="q2_breakdown">
          Looking back, where do you think the conversation broke down or could
          have gone deeper?
        </Label>
        <Textarea
          id="q2_breakdown"
          value={answers.q2_breakdown}
          onChange={(e) =>
            onAnswersChange({ ...answers, q2_breakdown: e.target.value })
          }
          placeholder="What moment or shift might have changed the outcome?"
          rows={4}
        />
        {errors.q2_breakdown && (
          <p className="text-sm text-destructive">{errors.q2_breakdown}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="q3_redo">
          If you could redo that conversation, what would you do differently?
        </Label>
        <Textarea
          id="q3_redo"
          value={answers.q3_redo}
          onChange={(e) =>
            onAnswersChange({ ...answers, q3_redo: e.target.value })
          }
          placeholder="With what you know now, what would you change?"
          rows={4}
        />
        {errors.q3_redo && (
          <p className="text-sm text-destructive">{errors.q3_redo}</p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} size="lg">
          Back
        </Button>
        <Button onClick={onSubmit} size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit All Worksheets"}
        </Button>
      </div>
    </div>
  );
}
