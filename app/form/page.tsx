"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getWorksheetByNumber } from "@/lib/form/questions";
import type { WorksheetConfig, QuestionConfig } from "@/lib/form/questions";
import { TypeformLayout } from "@/components/form/TypeformLayout";
import { TypeformQuestion } from "@/components/form/TypeformQuestion";
import { TypeformTextInput } from "@/components/form/TypeformTextInput";
import { TypeformTextarea } from "@/components/form/TypeformTextarea";
import { TypeformRadioGroup } from "@/components/form/TypeformRadioGroup";
import { WorksheetReview } from "@/components/form/WorksheetReview";
import { WorksheetComplete } from "@/components/form/WorksheetComplete";

interface ParticipantData {
  name: string | null;
  email: string;
  completedWorksheets: number[];
  answers: Record<number, Record<string, string>>;
}

type FormMode = "loading" | "typeform" | "review" | "complete" | "error";

export default function FormPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <FormPageInner />
    </Suspense>
  );
}

function FormPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const email = searchParams.get("email") || "";
  const worksheetParam = parseInt(searchParams.get("worksheet") || "1", 10);
  const worksheetNumber = ([1, 2, 3].includes(worksheetParam) ? worksheetParam : 1) as 1 | 2 | 3;

  const [mode, setMode] = useState<FormMode>("loading");
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const [worksheet, setWorksheet] = useState<WorksheetConfig | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Build the question list: for worksheet 1, prepend name question
  const buildQuestions = useCallback((ws: WorksheetConfig): QuestionConfig[] => {
    if (ws.number === 1) {
      return [
        { id: "_name", type: "text" as const, label: "What's your name?", placeholder: "Your full name" },
        ...ws.questions,
      ];
    }
    return ws.questions;
  }, []);

  // Fetch participant state on mount
  useEffect(() => {
    if (!email) {
      setMode("error");
      setErrorMessage("No email provided. Please access this form from the course.");
      return;
    }

    const ws = getWorksheetByNumber(worksheetNumber);
    if (!ws) {
      setMode("error");
      setErrorMessage("Invalid worksheet number.");
      return;
    }
    setWorksheet(ws);

    async function fetchParticipant() {
      try {
        const res = await fetch(`/api/participant?email=${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error("Failed to load participant data");
        const data: ParticipantData = await res.json();
        setParticipant(data);

        // Guard: if worksheet > 1, check prerequisite worksheets
        for (let i = 1; i < worksheetNumber; i++) {
          if (!data.completedWorksheets.includes(i)) {
            router.replace(`/form?email=${encodeURIComponent(email)}&worksheet=${i}`);
            return;
          }
        }

        // Pre-fill name from participant data
        if (data.name) setName(data.name);

        // Determine mode
        if (data.completedWorksheets.includes(worksheetNumber)) {
          // Returning user — load their existing answers
          const existing = data.answers[worksheetNumber] || {};
          const answerMap: Record<string, string> = {};
          for (const [k, v] of Object.entries(existing)) {
            answerMap[k] = String(v);
          }
          setAnswers(answerMap);
          setMode("review");
        } else {
          // New submission — Typeform mode
          setAnswers({});
          setCurrentQuestion(0);
          setMode("typeform");
        }
      } catch {
        setMode("error");
        setErrorMessage("Something went wrong loading your data. Please try again.");
      }
    }

    fetchParticipant();
  }, [email, worksheetNumber, router]);

  // Submit a single worksheet
  async function submitWorksheet(submittedAnswers: Record<string, string>) {
    setIsSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/submit-worksheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          worksheetNumber,
          answers: submittedAnswers,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.details) {
          // Zod validation errors — map to field errors
          const fieldErrors: Record<string, string> = {};
          for (const issue of data.details) {
            const path = issue.path?.[0];
            if (path) fieldErrors[String(path)] = issue.message;
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ _submit: data.error || "Submission failed" });
        }
        return false;
      }

      return true;
    } catch {
      setErrors({ _submit: "Something went wrong. Please try again." });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  // Typeform: validate current question and advance
  function validateAndAdvance() {
    if (!worksheet) return;
    const questions = buildQuestions(worksheet);
    const q = questions[currentQuestion];
    if (!q) return;

    // Validate
    if (q.id === "_name") {
      if (!name.trim()) {
        setErrors({ _name: "Please enter your name" });
        return;
      }
    } else {
      const val = answers[q.id] || "";
      if (!val.trim()) {
        setErrors({ [q.id]: q.type === "radio" ? "Please select an option" : "This field is required" });
        return;
      }
    }

    setErrors({});

    // If last question, submit
    if (currentQuestion === questions.length - 1) {
      handleTypeformSubmit();
      return;
    }

    // Advance
    setCurrentQuestion((prev) => prev + 1);
  }

  function handleBack() {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
      setErrors({});
    }
  }

  async function handleTypeformSubmit() {
    if (!worksheet) return;

    // Build the answers object (excluding the _name pseudo-question)
    const submittedAnswers: Record<string, string> = {};
    for (const q of worksheet.questions) {
      submittedAnswers[q.id] = answers[q.id] || "";
    }

    const success = await submitWorksheet(submittedAnswers);
    if (success) {
      setMode("complete");
    }
  }

  async function handleReviewUpdate(updatedAnswers: Record<string, string>) {
    const success = await submitWorksheet(updatedAnswers);
    if (success) {
      setAnswers(updatedAnswers);
      setMode("complete");
    }
  }

  // --- Render ---

  if (mode === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (mode === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-3">Oops</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (mode === "complete") {
    return <WorksheetComplete worksheetNumber={worksheetNumber} name={name || undefined} />;
  }

  if (mode === "review" && worksheet) {
    return (
      <WorksheetReview
        worksheet={worksheet}
        answers={answers}
        onUpdate={handleReviewUpdate}
        isSaving={isSubmitting}
      />
    );
  }

  // Typeform mode
  if (mode === "typeform" && worksheet) {
    const questions = buildQuestions(worksheet);
    const totalQuestions = questions.length;

    return (
      <TypeformLayout
        worksheetTitle={`Worksheet ${worksheet.number}: ${worksheet.title}`}
        progress={{ current: currentQuestion + 1, total: totalQuestions }}
        onBack={handleBack}
        showBack={currentQuestion > 0}
      >
        {errors._submit && (
          <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {errors._submit}
          </div>
        )}

        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-8 leading-snug">
          {questions[currentQuestion]?.label}
        </h2>

        <div className="relative">
          {questions.map((q, idx) => (
            <TypeformQuestion
              key={q.id}
              isActive={idx === currentQuestion}
              questionNumber={idx + 1}
              totalQuestions={totalQuestions}
            >
              {q.id === "_name" ? (
                <TypeformTextInput
                  value={name}
                  onChange={setName}
                  placeholder={q.placeholder}
                  onEnter={validateAndAdvance}
                  error={errors._name}
                  autoFocus={idx === currentQuestion}
                />
              ) : q.type === "textarea" ? (
                <TypeformTextarea
                  value={answers[q.id] || ""}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                  placeholder={q.placeholder}
                  rows={q.rows}
                  onSubmit={validateAndAdvance}
                  error={errors[q.id]}
                  autoFocus={idx === currentQuestion}
                />
              ) : q.type === "radio" && q.options ? (
                <TypeformRadioGroup
                  options={q.options}
                  value={answers[q.id] || ""}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                  onSelect={validateAndAdvance}
                  error={errors[q.id]}
                />
              ) : (
                <TypeformTextInput
                  value={answers[q.id] || ""}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                  placeholder={q.placeholder}
                  onEnter={validateAndAdvance}
                  error={errors[q.id]}
                  autoFocus={idx === currentQuestion}
                />
              )}
            </TypeformQuestion>
          ))}
        </div>

        {/* Submit button on last question */}
        {currentQuestion === totalQuestions - 1 && (
          <div className="mt-8">
            <button
              onClick={validateAndAdvance}
              disabled={isSubmitting}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Submit Worksheet"}
            </button>
          </div>
        )}
      </TypeformLayout>
    );
  }

  return null;
}
