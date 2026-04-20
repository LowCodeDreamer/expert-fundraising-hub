"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  job_updated_at: string | null;
}

const STUCK_GENERATING_MS = 90_000;

function isStuckGenerating(row: ParticipantRow): boolean {
  if (row.status !== "generating" || !row.job_updated_at) return false;
  return Date.now() - new Date(row.job_updated_at).getTime() > STUCK_GENERATING_MS;
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

type FilterTab = "all" | "needs_action" | "reviewed";
type SortField = "name" | "submitted_at" | "worksheet_count" | "days_since_start" | "status";
type SortDir = "asc" | "desc";

const needsActionStatuses: FeedbackStatus[] = ["pending", "generating", "draft"];
const reviewedStatuses: FeedbackStatus[] = ["approved", "sent"];

function needsAction(row: ParticipantRow): boolean {
  return Boolean(row.error_message) || needsActionStatuses.includes(row.status);
}

function isReviewed(row: ParticipantRow): boolean {
  return !row.error_message && reviewedStatuses.includes(row.status);
}

const statusOrder: Record<FeedbackStatus, number> = {
  pending: 0,
  generating: 1,
  draft: 2,
  approved: 3,
  sent: 4,
};

export function ParticipantTable({
  participants: initialParticipants,
}: ParticipantTableProps) {
  const router = useRouter();
  const [participants, setParticipants] = useState(initialParticipants);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("needs_action");
  const [sortField, setSortField] = useState<SortField>("submitted_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const pollStatus = useCallback(
    async (participantId: string) => {
      const res = await fetch(
        `/api/feedback-status?participantId=${participantId}`
      );
      if (!res.ok) return;
      const data = await res.json();

      if (data.status === "draft" || data.status === "pending") {
        setGeneratingIds((prev) => {
          const next = new Set(prev);
          next.delete(participantId);
          return next;
        });
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
          p.id === participantId
            ? { ...p, status: "generating", error_message: null }
            : p
        )
      );
      setGeneratingIds((prev) => new Set(prev).add(participantId));
    }
  }

  function markBusy(id: string, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleReset(participantId: string) {
    markBusy(participantId, true);
    const res = await fetch("/api/admin/reset-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId }),
    });
    if (res.ok) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId
            ? { ...p, status: "pending", error_message: null }
            : p
        )
      );
      router.refresh();
    }
    markBusy(participantId, false);
  }

  async function handleRemove(participantId: string, name: string) {
    if (
      !window.confirm(
        `Remove feedback job for ${name}? This deletes the draft and any approval state. Worksheet answers are kept — Generate will start fresh.`
      )
    ) {
      return;
    }
    markBusy(participantId, true);
    const res = await fetch("/api/admin/remove-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId }),
    });
    if (res.ok) {
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      router.refresh();
    }
    markBusy(participantId, false);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(() => {
    let rows = participants;

    // Tab filter — error rows always live in Needs Action, regardless of status
    if (tab === "needs_action") {
      rows = rows.filter(needsAction);
    } else if (tab === "reviewed") {
      rows = rows.filter(isReviewed);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    // Sort
    const dir = sortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      switch (sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "submitted_at":
          return dir * (new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
        case "worksheet_count":
          return dir * (a.worksheet_count - b.worksheet_count);
        case "days_since_start":
          return dir * (a.days_since_start - b.days_since_start);
        case "status":
          return dir * (statusOrder[a.status] - statusOrder[b.status]);
        default:
          return 0;
      }
    });

    return rows;
  }, [participants, tab, search, sortField, sortDir]);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    {
      key: "needs_action",
      label: "Needs Action",
      count: participants.filter(needsAction).length,
    },
    {
      key: "reviewed",
      label: "Reviewed",
      count: participants.filter(isReviewed).length,
    },
    { key: "all", label: "All", count: participants.length },
  ];

  function SortArrow({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="ml-1 text-muted-foreground/40">&#8597;</span>;
    return <span className="ml-1">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>;
  }

  function SortableHead({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) {
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => handleSort(field)}
          className="inline-flex items-center hover:text-foreground transition-colors"
        >
          {children}
          <SortArrow field={field} />
        </button>
      </TableHead>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-xs ${tab === t.key ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      {/* Record count */}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {participants.length} participants
      </p>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead field="name">Participant</SortableHead>
              <SortableHead field="submitted_at">Submitted</SortableHead>
              <SortableHead field="worksheet_count">Worksheets</SortableHead>
              <SortableHead field="days_since_start">Days</SortableHead>
              <SortableHead field="status">Status</SortableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {search.trim()
                    ? "No participants match your search."
                    : tab === "reviewed"
                    ? "No reviewed submissions yet."
                    : tab === "needs_action"
                    ? "All caught up \u2014 nothing needs action."
                    : "No submissions yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
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
                      {p.status === "pending" &&
                        !p.error_message &&
                        p.worksheet_count === 3 && (
                          <Button
                            size="sm"
                            onClick={() => handleGenerate(p.id)}
                            disabled={busyIds.has(p.id)}
                          >
                            Generate
                          </Button>
                        )}
                      {(isStuckGenerating(p) || p.error_message) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReset(p.id)}
                          disabled={busyIds.has(p.id)}
                        >
                          Reset
                        </Button>
                      )}
                      {(p.status === "draft" || p.status === "approved") && (
                        <Link href={`/admin/review/${p.id}`}>
                          <Button size="sm" variant="outline">
                            Review
                          </Button>
                        </Link>
                      )}
                      {(p.error_message ||
                        p.status === "draft" ||
                        p.status === "approved" ||
                        p.status === "sent") && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemove(p.id, p.name)}
                          disabled={busyIds.has(p.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
