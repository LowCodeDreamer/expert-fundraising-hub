import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = authHeader?.replace("Bearer ", "");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch time gate settings from key-value table
  const { data: settingsRows } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["time_gate_enabled", "time_gate_days"]);

  const settingsMap = Object.fromEntries(
    (settingsRows || []).map((r: { key: string; value: unknown }) => [r.key, r.value])
  );
  const timeGateEnabled = settingsMap.time_gate_enabled ?? true;
  const timeGateDays = Number(settingsMap.time_gate_days) || 7;

  // Find eligible participants: 3 worksheets + pending (+ optional time gate)
  let query = supabase
    .from("feedback_jobs")
    .select("participant_id, participants!inner(course_started_at)")
    .eq("status", "pending");

  if (timeGateEnabled) {
    const cutoff = new Date(
      Date.now() - timeGateDays * 24 * 60 * 60 * 1000
    ).toISOString();
    query = query.gte("participants.course_started_at", cutoff);
  }

  const { data: pendingJobs } = await query;

  if (!pendingJobs || pendingJobs.length === 0) {
    return NextResponse.json({ triggered: 0, participantIds: [] });
  }

  const triggered: string[] = [];

  for (const job of pendingJobs) {
    // Verify 3 worksheets exist
    const { count } = await supabase
      .from("worksheet_submissions")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", job.participant_id);

    if (count !== 3) continue;

    // Trigger generation
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    await supabase
      .from("feedback_jobs")
      .update({
        status: "generating",
        triggered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("participant_id", job.participant_id);

    fetch(`${baseUrl}/api/generate/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: job.participant_id }),
    }).catch(console.error);

    triggered.push(job.participant_id);
  }

  return NextResponse.json({
    triggered: triggered.length,
    participantIds: triggered,
  });
}
