import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  if (!session || session.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const participantId = request.nextUrl.searchParams.get("participantId");
  if (!participantId) {
    return NextResponse.json(
      { error: "participantId required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: job } = await supabase
    .from("feedback_jobs")
    .select("status, ai_draft, error_message")
    .eq("participant_id", participantId)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    aiDraft: job.ai_draft,
    errorMessage: job.error_message,
  });
}
