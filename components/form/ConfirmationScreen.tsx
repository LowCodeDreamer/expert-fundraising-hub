"use client";

import { Card, CardContent } from "@/components/ui/card";

interface ConfirmationScreenProps {
  name: string;
}

export function ConfirmationScreen({ name }: ConfirmationScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Card className="max-w-lg text-center">
        <CardContent className="p-8 space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-heading font-semibold text-foreground">
              Thank you, {name}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Your worksheets have been submitted. You&apos;ll receive your
              personalized feedback by email within 7 days.
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Alex will review your responses and craft personalized coaching
              feedback based on the Donor Alignment framework.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
