import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const bodySchema = z.object({
  participantId: z.string().uuid(),
  status: z.enum(["sent", "error"]),
  errorMessage: z.string().optional(),
  docId: z.string().optional(),
});

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.N8N_CALLBACK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { participantId, status, errorMessage } = parsed;
  const supabase = createServiceClient();

  const update =
    status === "sent"
      ? {
          status: "sent" as const,
          sent_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        }
      : {
          error_message: errorMessage || "Delivery failed",
          updated_at: new Date().toISOString(),
        };

  const { error } = await supabase
    .from("feedback_jobs")
    .update(update)
    .eq("participant_id", participantId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
