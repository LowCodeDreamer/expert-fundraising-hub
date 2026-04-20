import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  if (!session || session.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { participantId } = await request.json();
  if (!participantId) {
    return NextResponse.json(
      { error: "participantId required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("feedback_jobs")
    .update({
      status: "pending",
      ai_draft: null,
      human_edit: null,
      reviewer_notes: null,
      error_message: null,
      triggered_at: null,
      approved_at: null,
      sent_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("participant_id", participantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
