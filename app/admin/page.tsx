import { createServiceClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ParticipantTable } from "@/components/admin/ParticipantTable";
import type { FeedbackStatus } from "@/types/database";

export const dynamic = "force-dynamic";

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

export default async function AdminDashboard() {
  const supabase = createServiceClient();

  // Fetch participants with worksheet counts and feedback status
  const { data: participants } = await supabase
    .from("participants")
    .select("id, name, email, course_started_at, created_at")
    .order("created_at", { ascending: false });

  if (!participants) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-muted-foreground">Failed to load participants.</p>
        </main>
      </div>
    );
  }

  // Enrich each participant with worksheet count and feedback status
  const rows: ParticipantRow[] = await Promise.all(
    participants.map(async (p) => {
      const { count } = await supabase
        .from("worksheet_submissions")
        .select("id", { count: "exact", head: true })
        .eq("participant_id", p.id);

      const { data: job } = await supabase
        .from("feedback_jobs")
        .select("status, error_message, updated_at")
        .eq("participant_id", p.id)
        .single();

      const daysSinceStart = Math.floor(
        (Date.now() - new Date(p.course_started_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Find latest worksheet submission for "submitted_at"
      const { data: latestSub } = await supabase
        .from("worksheet_submissions")
        .select("submitted_at")
        .eq("participant_id", p.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .single();

      return {
        id: p.id,
        name: p.name,
        email: p.email,
        submitted_at: latestSub?.submitted_at || p.created_at,
        worksheet_count: count || 0,
        days_since_start: daysSinceStart,
        status: (job?.status as FeedbackStatus) || "pending",
        error_message: job?.error_message || null,
        job_updated_at: job?.updated_at || null,
      };
    })
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-heading font-semibold text-foreground">
            Submissions ({rows.length})
          </h2>
        </div>
        <ParticipantTable participants={rows} />
      </main>
    </div>
  );
}
