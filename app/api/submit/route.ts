import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const worksheet1Schema = z.object({
  q1_working: z.string().min(1),
  q2_stuck: z.string().min(1),
});

const worksheet2Schema = z.object({
  q1_led_with: z.enum(["Impact", "Outputs", "I'm not sure"]),
  q2_impact_statement: z.string().min(1),
  q3_mindset: z.enum([
    "Confident and grounded",
    "Nervous but I manage it",
    "Apologetic",
    "I avoid asking altogether",
  ]),
  q4_limiting_belief: z.string().min(1),
  q5_donor_list: z.enum([
    "Yes, a detailed list",
    "I have a list but it's incomplete",
    "No list",
  ]),
  q6_meeting_prep: z.string().min(1),
});

const worksheet3Schema = z.object({
  q1_donor_center: z.enum(["Head", "Heart", "Hara"]),
  q2_breakdown: z.string().min(1),
  q3_redo: z.string().min(1),
});

const submitSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  worksheet1: worksheet1Schema,
  worksheet2: worksheet2Schema,
  worksheet3: worksheet3Schema,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = submitSchema.parse(body);
    const supabase = createServiceClient();

    // Upsert participant by email
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .upsert(
        {
          email: data.email,
          name: data.name,
          course_started_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "Failed to save participant" },
        { status: 500 }
      );
    }

    // Upsert 3 worksheet submissions
    const worksheets = [
      { worksheet_number: 1, answers: data.worksheet1 },
      { worksheet_number: 2, answers: data.worksheet2 },
      { worksheet_number: 3, answers: data.worksheet3 },
    ];

    for (const ws of worksheets) {
      const { error } = await supabase.from("worksheet_submissions").upsert(
        {
          participant_id: participant.id,
          worksheet_number: ws.worksheet_number,
          answers: ws.answers,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "participant_id,worksheet_number" }
      );

      if (error) {
        return NextResponse.json(
          { error: `Failed to save worksheet ${ws.worksheet_number}` },
          { status: 500 }
        );
      }
    }

    // Upsert feedback job — reset on resubmit
    const { error: jobError } = await supabase.from("feedback_jobs").upsert(
      {
        participant_id: participant.id,
        status: "pending",
        ai_draft: null,
        human_edit: null,
        error_message: null,
        reviewer_notes: null,
        triggered_at: null,
        approved_at: null,
        sent_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "participant_id" }
    );

    if (jobError) {
      return NextResponse.json(
        { error: "Failed to create feedback job" },
        { status: 500 }
      );
    }

    return NextResponse.json({ participantId: participant.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
