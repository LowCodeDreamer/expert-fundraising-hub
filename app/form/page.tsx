"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressIndicator } from "@/components/form/ProgressIndicator";
import { FormStep1 } from "@/components/form/FormStep1";
import { FormStep2 } from "@/components/form/FormStep2";
import { FormStep3 } from "@/components/form/FormStep3";
import { ConfirmationScreen } from "@/components/form/ConfirmationScreen";
import type {
  Worksheet1Answers,
  Worksheet2Answers,
  Worksheet3Answers,
} from "@/types/database";

const emptyW1: Worksheet1Answers = { q1_working: "", q2_stuck: "" };
const emptyW2: Worksheet2Answers = {
  q1_led_with: "" as Worksheet2Answers["q1_led_with"],
  q2_impact_statement: "",
  q3_mindset: "" as Worksheet2Answers["q3_mindset"],
  q4_limiting_belief: "",
  q5_donor_list: "" as Worksheet2Answers["q5_donor_list"],
  q6_meeting_prep: "",
};
const emptyW3: Worksheet3Answers = {
  q1_donor_center: "" as Worksheet3Answers["q1_donor_center"],
  q2_breakdown: "",
  q3_redo: "",
};

export default function FormPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [w1, setW1] = useState<Worksheet1Answers>(emptyW1);
  const [w2, setW2] = useState<Worksheet2Answers>(emptyW2);
  const [w3, setW3] = useState<Worksheet3Answers>(emptyW3);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Please enter a valid email";
    if (!w1.q1_working.trim()) errs.q1_working = "This field is required";
    if (!w1.q2_stuck.trim()) errs.q2_stuck = "This field is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    const errs: Record<string, string> = {};
    if (!w2.q1_led_with) errs.q1_led_with = "Please select an option";
    if (!w2.q2_impact_statement.trim())
      errs.q2_impact_statement = "This field is required";
    if (!w2.q3_mindset) errs.q3_mindset = "Please select an option";
    if (!w2.q4_limiting_belief.trim())
      errs.q4_limiting_belief = "This field is required";
    if (!w2.q5_donor_list) errs.q5_donor_list = "Please select an option";
    if (!w2.q6_meeting_prep.trim())
      errs.q6_meeting_prep = "This field is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep3(): boolean {
    const errs: Record<string, string> = {};
    if (!w3.q1_donor_center) errs.q1_donor_center = "Please select a center";
    if (!w3.q2_breakdown.trim()) errs.q2_breakdown = "This field is required";
    if (!w3.q3_redo.trim()) errs.q3_redo = "This field is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext1() {
    if (validateStep1()) {
      setStep(2);
      window.scrollTo(0, 0);
    }
  }

  function handleNext2() {
    if (validateStep2()) {
      setStep(3);
      window.scrollTo(0, 0);
    }
  }

  async function handleSubmit() {
    if (!validateStep3()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          worksheet1: w1,
          worksheet2: w2,
          worksheet3: w3,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ submit: data.error || "Submission failed" });
        return;
      }

      setIsComplete(true);
      window.scrollTo(0, 0);
    } catch {
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <ConfirmationScreen name={name} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="text-center mb-2">
          <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">
            Foundations of Donor Alignment
          </h1>
          <p className="mt-2 text-muted-foreground">
            Complete all three worksheets to receive your personalized coaching
            feedback.
          </p>
        </div>

        <ProgressIndicator currentStep={step} totalSteps={3} />

        {errors.submit && (
          <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {errors.submit}
          </div>
        )}

        <Card>
          <CardContent className="p-6 sm:p-8">
            {step === 1 && (
              <FormStep1
                name={name}
                email={email}
                answers={w1}
                onNameChange={setName}
                onEmailChange={setEmail}
                onAnswersChange={setW1}
                onNext={handleNext1}
                errors={errors}
              />
            )}
            {step === 2 && (
              <FormStep2
                answers={w2}
                onAnswersChange={setW2}
                onNext={handleNext2}
                onBack={() => {
                  setStep(1);
                  setErrors({});
                  window.scrollTo(0, 0);
                }}
                errors={errors}
              />
            )}
            {step === 3 && (
              <FormStep3
                answers={w3}
                onAnswersChange={setW3}
                onSubmit={handleSubmit}
                onBack={() => {
                  setStep(2);
                  setErrors({});
                  window.scrollTo(0, 0);
                }}
                errors={errors}
                isSubmitting={isSubmitting}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
