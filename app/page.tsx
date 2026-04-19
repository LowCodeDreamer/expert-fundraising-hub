"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "complete" | "error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [completedEmail, setCompletedEmail] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();

    if (!EMAIL_REGEX.test(trimmed)) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch(`/api/participant?email=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error("Lookup failed");
      const data: { completedWorksheets: number[] } = await res.json();

      const next = [1, 2, 3].find((n) => !data.completedWorksheets.includes(n));

      if (!next) {
        setCompletedEmail(trimmed);
        setStatus("complete");
        return;
      }

      router.push(`/form?email=${encodeURIComponent(trimmed)}&worksheet=${next}`);
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "complete") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md animate-in fade-in duration-500">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 16L14 20L22 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
            </svg>
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-3">
            You&apos;re all set
          </h1>
          <p className="text-muted-foreground mb-2">
            All three worksheets are complete for <span className="font-medium text-foreground">{completedEmail}</span>.
          </p>
          <p className="text-muted-foreground">
            Your personalized coaching feedback is being prepared and will be emailed to you shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md animate-in fade-in duration-500">
        <div className="text-center mb-10">
          <p className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-3">
            Foundations of Donor Alignment
          </p>
          <h1 className="text-4xl font-heading font-bold text-foreground mb-4 leading-tight">
            Welcome to your worksheets
          </h1>
          <p className="text-muted-foreground">
            Enter your email to begin or continue where you left off.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") {
                  setStatus("idle");
                  setErrorMessage("");
                }
              }}
              placeholder="you@example.com"
              disabled={status === "loading"}
              className="w-full px-4 py-3 text-lg border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors disabled:opacity-50"
            />
          </div>

          {status === "error" && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading" || !email}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "loading" ? "Loading..." : "Continue"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-8">
          Your email keeps your progress saved across all three worksheets.
        </p>
      </div>
    </div>
  );
}
