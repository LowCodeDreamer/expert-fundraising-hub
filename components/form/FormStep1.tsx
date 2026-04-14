"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Worksheet1Answers } from "@/types/database";

interface FormStep1Props {
  name: string;
  email: string;
  answers: Worksheet1Answers;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  onAnswersChange: (answers: Worksheet1Answers) => void;
  onNext: () => void;
  errors: Record<string, string>;
}

export function FormStep1({
  name,
  email,
  answers,
  onNameChange,
  onEmailChange,
  onAnswersChange,
  onNext,
  errors,
}: FormStep1Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-semibold text-foreground">
          About You
        </h2>
        <p className="mt-2 text-muted-foreground">
          Let&apos;s start with a few basics and your first self-assessment.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Your full name"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-border">
        <h3 className="text-lg font-heading font-semibold text-foreground">
          Worksheet 1: Self-Assessment
        </h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="q1_working">
          What&apos;s working in your current donor relationships or fundraising
          approach?
        </Label>
        <Textarea
          id="q1_working"
          value={answers.q1_working}
          onChange={(e) =>
            onAnswersChange({ ...answers, q1_working: e.target.value })
          }
          placeholder="Take your time — there's no wrong answer here."
          rows={4}
        />
        {errors.q1_working && (
          <p className="text-sm text-destructive">{errors.q1_working}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="q2_stuck">What feels stuck or unclear?</Label>
        <Textarea
          id="q2_stuck"
          value={answers.q2_stuck}
          onChange={(e) =>
            onAnswersChange({ ...answers, q2_stuck: e.target.value })
          }
          placeholder="Be honest — this helps Alex give you the most useful feedback."
          rows={4}
        />
        {errors.q2_stuck && (
          <p className="text-sm text-destructive">{errors.q2_stuck}</p>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} size="lg">
          Continue to Worksheet 2
        </Button>
      </div>
    </div>
  );
}
