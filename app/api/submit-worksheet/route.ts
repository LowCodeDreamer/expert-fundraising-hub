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

const worksheetSchemas = {
  1: worksheet1Schema,
  2: worksheet2Schema,
  3: worksheet3Schema,
} as const;

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  worksheetNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  answers: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, worksheetNumber, answers } = bodySchema.parse(body);

    // Validate answers against the correct worksheet schema
    const schema = worksheetSchemas[worksheetNumber];
    schema.parse(answers);

    const supabase = createServiceClient();

    // Look up existing participant first
    const { data: existing } = await supabase
      .from("participants")
      .select("id")
      .eq("email", email)
      .single();

    let participantId: string;

    if (existing) {
      // Update name if provided
      if (name) {
        await supabase
          .from("participants")
          .update({ name })
          .eq("id", existing.id);
      }
      participantId = existing.id;
    } else {
      // New participant — name required (comes from worksheet 1)
      const { data: created, error: createError } = await supabase
        .from("participants")
        .insert({
          email,
          name: name || email.split("@")[0],
          course_started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError || !created) {
        return NextResponse.json(
          { error: "Failed to save participant" },
          { status: 500 }
        );
      }
      participantId = created.id;
    }

    const participant = { id: participantId };

    // Upsert worksheet submission
    const { error: wsError } = await supabase
      .from("worksheet_submissions")
      .upsert(
        {
          participant_id: participant.id,
          worksheet_number: worksheetNumber,
          answers,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "participant_id,worksheet_number" }
      );

    if (wsError) {
      return NextResponse.json(
        { error: `Failed to save worksheet ${worksheetNumber}` },
        { status: 500 }
      );
    }

    // Count total completed worksheets for this participant
    const { count } = await supabase
      .from("worksheet_submissions")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", participant.id);

    const totalCompleted = count ?? 0;

    // If all 3 worksheets done, create feedback job
    if (totalCompleted === 3) {
      await supabase.from("feedback_jobs").upsert(
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
    }

    return NextResponse.json({
      participantId: participant.id,
      worksheetNumber,
      totalCompleted,
    });
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
