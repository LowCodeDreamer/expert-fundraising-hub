import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  if (!session || session.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { participantId, humanEdit, reviewerNotes } = await request.json();

  if (!participantId || !humanEdit) {
    return NextResponse.json(
      { error: "participantId and humanEdit required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("feedback_jobs")
    .update({
      human_edit: humanEdit,
      reviewer_notes: reviewerNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("participant_id", participantId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
