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

    // Detect whether this is a brand-new submission or an edit of an existing
    // worksheet. We only kick off feedback generation when the third worksheet
    // *first arrives* — re-edits leave the existing feedback job state alone
    // (so an admin's in-progress draft isn't wiped, and we don't re-spend on
    // the LLM for trivial answer tweaks).
    const { data: priorRow } = await supabase
      .from("worksheet_submissions")
      .select("id")
      .eq("participant_id", participant.id)
      .eq("worksheet_number", worksheetNumber)
      .maybeSingle();
    const isNewSubmission = !priorRow;

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

    // When the third worksheet first arrives, evaluate the time gate inline
    // and either kick off generation immediately or leave the job pending for
    // an admin to handle. The daily cron at /api/cron/trigger-feedback stays
    // as a safety net for pending jobs.
    if (isNewSubmission && totalCompleted === 3) {
      const [{ data: settingsRows }, { data: participantRow }] =
        await Promise.all([
          supabase
            .from("app_settings")
            .select("key, value")
            .in("key", ["time_gate_enabled", "time_gate_days"]),
          supabase
            .from("participants")
            .select("course_started_at")
            .eq("id", participant.id)
            .single(),
        ]);

      const settingsMap = Object.fromEntries(
        (settingsRows || []).map(
          (r: { key: string; value: unknown }) => [r.key, r.value]
        )
      );
      const timeGateEnabled = settingsMap.time_gate_enabled ?? true;
      const timeGateDays = Number(settingsMap.time_gate_days) || 7;

      const startedAt = participantRow?.course_started_at
        ? new Date(participantRow.course_started_at).getTime()
        : Date.now();
      const ageDays = (Date.now() - startedAt) / 86_400_000;
      const withinGate = !timeGateEnabled || ageDays <= timeGateDays;

      const nowIso = new Date().toISOString();

      await supabase.from("feedback_jobs").upsert(
        {
          participant_id: participant.id,
          status: withinGate ? "generating" : "pending",
          ai_draft: null,
          human_edit: null,
          error_message: null,
          reviewer_notes: null,
          triggered_at: withinGate ? nowIso : null,
          approved_at: null,
          sent_at: null,
          updated_at: nowIso,
        },
        { onConflict: "participant_id" }
      );

      if (withinGate) {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        // Fire-and-forget — generation runs on /api/generate/run with
        // maxDuration=60 and writes its own status updates.
        fetch(`${baseUrl}/api/generate/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: participant.id }),
        }).catch(console.error);
      }
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
