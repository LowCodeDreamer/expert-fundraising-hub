"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { QuestionConfig, WorksheetConfig } from "@/lib/form/questions";

interface WorksheetReviewProps {
  worksheet: WorksheetConfig;
  answers: Record<string, string>;
  onUpdate: (answers: Record<string, string>) => void;
  isSaving: boolean;
}

export function WorksheetReview({ worksheet, answers, onUpdate, isSaving }: WorksheetReviewProps) {
  const [local, setLocal] = useState<Record<string, string>>({ ...answers });

  function handleChange(id: string, value: string) {
    setLocal((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit() {
    onUpdate(local);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-foreground">{worksheet.title}</h1>
          <p className="mt-2 text-muted-foreground">{worksheet.subtitle}</p>
          <p className="mt-1 text-sm text-accent font-medium">Review and update your answers below.</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-8">
            {worksheet.questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <Label className="text-base">{q.label}</Label>
                {q.type === "textarea" ? (
                  <Textarea
                    value={local[q.id] || ""}
                    onChange={(e) => handleChange(q.id, e.target.value)}
                    placeholder={q.placeholder}
                    rows={q.rows || 3}
                  />
                ) : q.type === "radio" && q.options ? (
                  <div className="space-y-2">
                    {q.options.map((option) => (
                      <label
                        key={option}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                          local[q.id] === option
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={option}
                          checked={local[q.id] === option}
                          onChange={() => handleChange(q.id, option)}
                          className="sr-only"
                        />
                        <div className={cn(
                          "h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          local[q.id] === option ? "border-primary" : "border-muted-foreground/40"
                        )}>
                          {local[q.id] === option && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <Input
                    value={local[q.id] || ""}
                    onChange={(e) => handleChange(q.id, e.target.value)}
                    placeholder={q.placeholder}
                  />
                )}
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <Button onClick={handleSubmit} disabled={isSaving} size="lg">
                {isSaving ? "Saving..." : "Update Answers"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
