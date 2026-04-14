"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Worksheet2Answers } from "@/types/database";

interface FormStep2Props {
  answers: Worksheet2Answers;
  onAnswersChange: (answers: Worksheet2Answers) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string>;
}

function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
              value === option
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            <div
              className={cn(
                "h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                value === option ? "border-primary" : "border-muted-foreground/40"
              )}
            >
              {value === option && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <span className="text-sm">{option}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function FormStep2({
  answers,
  onAnswersChange,
  onNext,
  onBack,
  errors,
}: FormStep2Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-semibold text-foreground">
          Worksheet 2: Applying the Framework
        </h2>
        <p className="mt-2 text-muted-foreground">
          Reflect on how you&apos;re applying the Donor Alignment framework in
          practice.
        </p>
      </div>

      <RadioGroup
        label="In your most recent donor conversation, did you lead with Impact (the transformed world you're creating) or with Outputs (the programs you run and the budget you need)?"
        name="q1_led_with"
        options={["Impact", "Outputs", "I'm not sure"]}
        value={answers.q1_led_with}
        onChange={(v) =>
          onAnswersChange({
            ...answers,
            q1_led_with: v as Worksheet2Answers["q1_led_with"],
          })
        }
        error={errors.q1_led_with}
      />

      <div className="space-y-2">
        <Label htmlFor="q2_impact">
          Complete this sentence: The impact we exist to create in the world
          is...
        </Label>
        <Textarea
          id="q2_impact"
          value={answers.q2_impact_statement}
          onChange={(e) =>
            onAnswersChange({
              ...answers,
              q2_impact_statement: e.target.value,
            })
          }
          placeholder="Describe the transformed world your organization exists to create."
          rows={3}
        />
        {errors.q2_impact_statement && (
          <p className="text-sm text-destructive">
            {errors.q2_impact_statement}
          </p>
        )}
      </div>

      <RadioGroup
        label="Which statement best describes how you feel when asking for money?"
        name="q3_mindset"
        options={[
          "Confident and grounded",
          "Nervous but I manage it",
          "Apologetic",
          "I avoid asking altogether",
        ]}
        value={answers.q3_mindset}
        onChange={(v) =>
          onAnswersChange({
            ...answers,
            q3_mindset: v as Worksheet2Answers["q3_mindset"],
          })
        }
        error={errors.q3_mindset}
      />

      <div className="space-y-2">
        <Label htmlFor="q4_belief">
          What&apos;s one belief you have about money, wealth, or asking that
          might be getting in your way?
        </Label>
        <Textarea
          id="q4_belief"
          value={answers.q4_limiting_belief}
          onChange={(e) =>
            onAnswersChange({
              ...answers,
              q4_limiting_belief: e.target.value,
            })
          }
          placeholder="Be honest with yourself — awareness is the first step."
          rows={3}
        />
        {errors.q4_limiting_belief && (
          <p className="text-sm text-destructive">
            {errors.q4_limiting_belief}
          </p>
        )}
      </div>

      <RadioGroup
        label="Do you have a written list of your top 10–20 major donor prospects with notes on capacity, interests, and next steps?"
        name="q5_donor_list"
        options={[
          "Yes, a detailed list",
          "I have a list but it's incomplete",
          "No list",
        ]}
        value={answers.q5_donor_list}
        onChange={(v) =>
          onAnswersChange({
            ...answers,
            q5_donor_list: v as Worksheet2Answers["q5_donor_list"],
          })
        }
        error={errors.q5_donor_list}
      />

      <div className="space-y-2">
        <Label htmlFor="q6_prep">
          When you prepare for a donor meeting, what do you typically do?
        </Label>
        <Textarea
          id="q6_prep"
          value={answers.q6_meeting_prep}
          onChange={(e) =>
            onAnswersChange({ ...answers, q6_meeting_prep: e.target.value })
          }
          placeholder="Walk us through your typical preparation process."
          rows={3}
        />
        {errors.q6_meeting_prep && (
          <p className="text-sm text-destructive">{errors.q6_meeting_prep}</p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} size="lg">
          Back
        </Button>
        <Button onClick={onNext} size="lg">
          Continue to Worksheet 3
        </Button>
      </div>
    </div>
  );
}
