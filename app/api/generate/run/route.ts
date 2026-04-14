import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateFeedback } from "@/lib/ai/generate-feedback";
import type {
  Worksheet1Answers,
  Worksheet2Answers,
  Worksheet3Answers,
} from "@/types/database";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { participantId } = await request.json();
  if (!participantId) {
    return NextResponse.json(
      { error: "participantId required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  try {
    // Fetch participant
    const { data: participant } = await supabase
      .from("participants")
      .select("name")
      .eq("id", participantId)
      .single();

    if (!participant) {
      throw new Error("Participant not found");
    }

    // Fetch worksheets
    const { data: submissions } = await supabase
      .from("worksheet_submissions")
      .select("worksheet_number, answers")
      .eq("participant_id", participantId)
      .order("worksheet_number");

    if (!submissions || submissions.length !== 3) {
      throw new Error("Missing worksheet submissions");
    }

    const w1 = submissions.find((s) => s.worksheet_number === 1)
      ?.answers as Worksheet1Answers;
    const w2 = submissions.find((s) => s.worksheet_number === 2)
      ?.answers as Worksheet2Answers;
    const w3 = submissions.find((s) => s.worksheet_number === 3)
      ?.answers as Worksheet3Answers;

    // Generate feedback
    const draft = await generateFeedback(participant.name, w1, w2, w3);

    // Save draft and set status
    await supabase
      .from("feedback_jobs")
      .update({
        status: "draft",
        ai_draft: draft,
        human_edit: draft,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("participant_id", participantId);

    return NextResponse.json({ status: "draft" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Reset to pending with error
    await supabase
      .from("feedback_jobs")
      .update({
        status: "pending",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("participant_id", participantId);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
