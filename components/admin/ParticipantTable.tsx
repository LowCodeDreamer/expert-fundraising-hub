"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FeedbackStatus } from "@/types/database";

interface ParticipantRow {
  id: string;
  name: string;
  email: string;
  submitted_at: string;
  worksheet_count: number;
  days_since_start: number;
  status: FeedbackStatus;
  error_message: string | null;
}

interface ParticipantTableProps {
  participants: ParticipantRow[];
}

const statusStyles: Record<FeedbackStatus, string> = {
  pending: "bg-secondary text-secondary-foreground",
  generating: "bg-status-amber/15 text-status-amber border-status-amber/30",
  draft: "bg-status-amber/15 text-status-amber border-status-amber/30",
  approved: "bg-status-green/15 text-status-green border-status-green/30",
  sent: "bg-status-blue/15 text-status-blue border-status-blue/30",
};

export function ParticipantTable({
  participants: initialParticipants,
}: ParticipantTableProps) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  const pollStatus = useCallback(
    async (participantId: string) => {
      const res = await fetch(
        `/api/feedback-status?participantId=${participantId}`
      );
      if (!res.ok) return;
      const data = await res.json();

      if (data.status === "draft" || data.status === "pending") {
        // Stop polling
        setGeneratingIds((prev) => {
          const next = new Set(prev);
          next.delete(participantId);
          return next;
        });
        // Update row
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId
              ? {
                  ...p,
                  status: data.status,
                  error_message: data.errorMessage,
                }
              : p
          )
        );
      }
    },
    []
  );

  useEffect(() => {
    if (generatingIds.size === 0) return;

    const interval = setInterval(() => {
      generatingIds.forEach((id) => pollStatus(id));
    }, 2000);

    return () => clearInterval(interval);
  }, [generatingIds, pollStatus]);

  async function handleGenerate(participantId: string) {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId }),
    });

    if (res.ok) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId ? { ...p, status: "generating" } : p
        )
      );
      setGeneratingIds((prev) => new Set(prev).add(participantId));
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Participant</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Worksheets</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                No submissions yet
              </TableCell>
            </TableRow>
          ) : (
            participants.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {p.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(p.submitted_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant={p.worksheet_count === 3 ? "default" : "secondary"}>
                    {p.worksheet_count}/3
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.days_since_start}d
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusStyles[p.status]}
                  >
                    {p.status === "generating" ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                        generating
                      </span>
                    ) : (
                      p.status
                    )}
                  </Badge>
                  {p.error_message && (
                    <p className="mt-1 text-xs text-destructive">
                      {p.error_message}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {p.status === "pending" && p.worksheet_count === 3 && (
                      <Button
                        size="sm"
                        onClick={() => handleGenerate(p.id)}
                      >
                        Generate
                      </Button>
                    )}
                    {(p.status === "draft" || p.status === "approved") && (
                      <Link href={`/admin/review/${p.id}`}>
                        <Button size="sm" variant="outline">
                          Review
                        </Button>
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
