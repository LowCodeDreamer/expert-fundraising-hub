"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type {
  FeedbackDraft,
  FeedbackJob,
  FeedbackStatus,
  WorksheetSubmission,
  Worksheet1Answers,
  Worksheet2Answers,
  Worksheet3Answers,
  Participant,
} from "@/types/database";
import {
  w1QuestionLabels as w1Questions,
  w2QuestionLabels as w2Questions,
  w3QuestionLabels as w3Questions,
} from "@/lib/form/questions";

interface ReviewPanelProps {
  participant: Participant;
  worksheets: WorksheetSubmission[];
  feedbackJob: FeedbackJob;
}

const statusStyles: Record<FeedbackStatus, string> = {
  pending: "bg-secondary text-secondary-foreground",
  generating: "bg-status-amber/15 text-status-amber border-status-amber/30",
  draft: "bg-status-amber/15 text-status-amber border-status-amber/30",
  approved: "bg-status-green/15 text-status-green border-status-green/30",
  sent: "bg-status-blue/15 text-status-blue border-status-blue/30",
};

export function ReviewPanel({
  participant,
  worksheets,
  feedbackJob: initialJob,
}: ReviewPanelProps) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [humanEdit, setHumanEdit] = useState<FeedbackDraft>(
    initialJob.human_edit || { worksheet_1: "", worksheet_2: "", worksheet_3: "" }
  );
  const [reviewerNotes, setReviewerNotes] = useState(
    initialJob.reviewer_notes || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [message, setMessage] = useState("");

  const w1 = worksheets.find((w) => w.worksheet_number === 1)
    ?.answers as Worksheet1Answers;
  const w2 = worksheets.find((w) => w.worksheet_number === 2)
    ?.answers as Worksheet2Answers;
  const w3 = worksheets.find((w) => w.worksheet_number === 3)
    ?.answers as Worksheet3Answers;

  const daysSinceStart = Math.floor(
    (Date.now() - new Date(participant.course_started_at).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Poll if generating
  const pollStatus = useCallback(async () => {
    const res = await fetch(
      `/api/feedback-status?participantId=${participant.id}`
    );
    if (!res.ok) return;
    const data = await res.json();

    if (data.status !== "generating") {
      setJob((prev) => ({
        ...prev,
        status: data.status,
        ai_draft: data.aiDraft,
        human_edit: data.aiDraft,
        error_message: data.errorMessage,
      }));
      if (data.aiDraft) {
        setHumanEdit(data.aiDraft);
      }
    }
  }, [participant.id]);

  useEffect(() => {
    if (job.status !== "generating") return;
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [job.status, pollStatus]);

  async function handleSaveDraft() {
    setIsSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          humanEdit,
          reviewerNotes,
        }),
      });
      if (res.ok) {
        setMessage("Draft saved");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApprove() {
    setIsApproving(true);
    setMessage("");
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          humanEdit,
          reviewerNotes,
        }),
      });
      if (res.ok) {
        router.push("/admin");
      }
    } finally {
      setIsApproving(false);
    }
  }

  function resetSection(key: keyof FeedbackDraft) {
    if (job.ai_draft) {
      setHumanEdit((prev) => ({ ...prev, [key]: job.ai_draft![key] }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-heading font-semibold text-foreground truncate">
            {participant.name}
          </h2>
          <p className="text-sm text-muted-foreground">{participant.email}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{daysSinceStart} days since start</span>
          <Badge variant="outline" className={statusStyles[job.status]}>
            {job.status}
          </Badge>
        </div>
      </div>

      {/* Generating state */}
      {job.status === "generating" && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">
            Generating personalized feedback...
          </p>
        </div>
      )}

      {/* Error state */}
      {job.error_message && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {job.error_message}
        </div>
      )}

      {/* Paired worksheet + feedback layout */}
      {(job.status === "draft" || job.status === "approved") && (
        <div className="space-y-8">
          {/* Worksheet 1 */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border p-4 space-y-4">
              <h4 className="font-heading font-semibold text-foreground">
                Worksheet 1: Self-Assessment
              </h4>
              {w1 &&
                (Object.keys(w1Questions) as (keyof Worksheet1Answers)[]).map(
                  (key) => (
                    <div key={key}>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {w1Questions[key]}
                      </p>
                      <p className="text-sm">{w1[key]}</p>
                    </div>
                  )
                )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Worksheet 1 Feedback</Label>
                <button
                  type="button"
                  onClick={() => resetSection("worksheet_1")}
                  className="text-xs text-accent-foreground/60 hover:text-accent hover:underline"
                >
                  Reset to AI draft
                </button>
              </div>
              <Textarea
                value={humanEdit.worksheet_1}
                onChange={(e) =>
                  setHumanEdit((prev) => ({
                    ...prev,
                    worksheet_1: e.target.value,
                  }))
                }
                className="min-h-[calc(100%-2.5rem)]"
                rows={6}
              />
              <p className="text-xs text-muted-foreground text-right">
                {humanEdit.worksheet_1.length} characters
              </p>
            </div>
          </div>

          {/* Worksheet 2 */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border p-4 space-y-4">
              <h4 className="font-heading font-semibold text-foreground">
                Worksheet 2: Applying the Framework
              </h4>
              {w2 &&
                (Object.keys(w2Questions) as (keyof Worksheet2Answers)[]).map(
                  (key) => (
                    <div key={key}>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {w2Questions[key]}
                      </p>
                      <p className="text-sm">{w2[key]}</p>
                    </div>
                  )
                )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Worksheet 2 Feedback</Label>
                <button
                  type="button"
                  onClick={() => resetSection("worksheet_2")}
                  className="text-xs text-accent-foreground/60 hover:text-accent hover:underline"
                >
                  Reset to AI draft
                </button>
              </div>
              <Textarea
                value={humanEdit.worksheet_2}
                onChange={(e) =>
                  setHumanEdit((prev) => ({
                    ...prev,
                    worksheet_2: e.target.value,
                  }))
                }
                className="min-h-[calc(100%-2.5rem)]"
                rows={10}
              />
              <p className="text-xs text-muted-foreground text-right">
                {humanEdit.worksheet_2.length} characters
              </p>
            </div>
          </div>

          {/* Worksheet 3 */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border p-4 space-y-4">
              <h4 className="font-heading font-semibold text-foreground">
                Worksheet 3: Head-Heart-Hara
              </h4>
              {w3 &&
                (Object.keys(w3Questions) as (keyof Worksheet3Answers)[]).map(
                  (key) => (
                    <div key={key}>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {w3Questions[key]}
                      </p>
                      <p className="text-sm">{w3[key]}</p>
                    </div>
                  )
                )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Worksheet 3 Feedback</Label>
                <button
                  type="button"
                  onClick={() => resetSection("worksheet_3")}
                  className="text-xs text-accent-foreground/60 hover:text-accent hover:underline"
                >
                  Reset to AI draft
                </button>
              </div>
              <Textarea
                value={humanEdit.worksheet_3}
                onChange={(e) =>
                  setHumanEdit((prev) => ({
                    ...prev,
                    worksheet_3: e.target.value,
                  }))
                }
                className="min-h-[calc(100%-2.5rem)]"
                rows={6}
              />
              <p className="text-xs text-muted-foreground text-right">
                {humanEdit.worksheet_3.length} characters
              </p>
            </div>
          </div>

          {/* Reviewer notes + actions */}
          <div className="border-t border-border pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reviewer-notes">Reviewer Notes (internal)</Label>
              <Textarea
                id="reviewer-notes"
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Optional notes about this review..."
                rows={3}
              />
            </div>

            {message && (
              <p className="text-sm text-primary">{message}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isApproving}
              >
                {isApproving ? "Approving..." : "Approve & Queue"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
