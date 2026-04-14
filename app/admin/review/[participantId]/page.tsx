import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ReviewPanel } from "@/components/admin/ReviewPanel";
import { Button } from "@/components/ui/button";
import type {
  Participant,
  WorksheetSubmission,
  FeedbackJob,
} from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const { participantId } = await params;
  const supabase = createServiceClient();

  const { data: participant } = await supabase
    .from("participants")
    .select("*")
    .eq("id", participantId)
    .single();

  const { data: worksheets } = await supabase
    .from("worksheet_submissions")
    .select("*")
    .eq("participant_id", participantId)
    .order("worksheet_number");

  const { data: feedbackJob } = await supabase
    .from("feedback_jobs")
    .select("*")
    .eq("participant_id", participantId)
    .single();

  if (!participant || !worksheets || !feedbackJob) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-muted-foreground">Participant not found.</p>
          <Link href="/admin">
            <Button variant="outline" className="mt-4">
              Back to Dashboard
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
        >
          &larr; Back to Dashboard
        </Link>
        <ReviewPanel
          participant={participant as Participant}
          worksheets={worksheets as WorksheetSubmission[]}
          feedbackJob={feedbackJob as FeedbackJob}
        />
      </main>
    </div>
  );
}
