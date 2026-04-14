import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Check admin auth
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

  // Set status to generating
  const { error } = await supabase
    .from("feedback_jobs")
    .update({
      status: "generating",
      triggered_at: new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("participant_id", participantId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update job status" },
      { status: 500 }
    );
  }

  // Fire-and-forget: call the internal worker endpoint
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  fetch(`${baseUrl}/api/generate/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantId }),
  }).catch(console.error);

  return NextResponse.json({ status: "generating" }, { status: 202 });
}
