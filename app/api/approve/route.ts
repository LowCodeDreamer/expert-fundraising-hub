import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { renderFeedbackPdf } from "@/lib/pdf/render";
import { DEFAULT_PDF_TEMPLATE } from "@/lib/pdf/feedback-pdf";
import type {
  Worksheet1Answers,
  Worksheet2Answers,
  Worksheet3Answers,
  FeedbackDraft,
  PdfTemplateConfig,
} from "@/types/database";

// Rendering the PDF + POSTing to n8n should easily fit; keep headroom.
export const maxDuration = 60;

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
      status: "approved",
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("participant_id", participantId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to approve feedback" },
      { status: 500 }
    );
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_CALLBACK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!webhookUrl || !webhookSecret || !appUrl) {
    console.warn("Delivery webhook env vars missing; skipping n8n dispatch");
    return NextResponse.json({ success: true, delivery: "skipped" });
  }

  try {
    await triggerDelivery({
      supabase,
      participantId,
      humanEdit: humanEdit as FeedbackDraft,
      webhookUrl,
      webhookSecret,
      callbackUrl: `${appUrl}/api/delivery-callback`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delivery trigger failed";
    console.error("Delivery trigger failed:", e);
    await supabase
      .from("feedback_jobs")
      .update({
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("participant_id", participantId);
    return NextResponse.json(
      { success: true, delivery: "failed", error: message },
      { status: 200 }
    );
  }

  return NextResponse.json({ success: true });
}

async function triggerDelivery(params: {
  supabase: ReturnType<typeof createServiceClient>;
  participantId: string;
  humanEdit: FeedbackDraft;
  webhookUrl: string;
  webhookSecret: string;
  callbackUrl: string;
}) {
  const { supabase, participantId, humanEdit, webhookUrl, webhookSecret, callbackUrl } = params;

  const { data: participant } = await supabase
    .from("participants")
    .select("name, email")
    .eq("id", participantId)
    .single();

  if (!participant) throw new Error("Participant not found for delivery");

  const { data: submissions } = await supabase
    .from("worksheet_submissions")
    .select("worksheet_number, answers")
    .eq("participant_id", participantId);

  if (!submissions || submissions.length !== 3) {
    throw new Error("Cannot deliver: missing worksheet submissions");
  }

  const w1 = submissions.find((s) => s.worksheet_number === 1)?.answers as Worksheet1Answers;
  const w2 = submissions.find((s) => s.worksheet_number === 2)?.answers as Worksheet2Answers;
  const w3 = submissions.find((s) => s.worksheet_number === 3)?.answers as Worksheet3Answers;

  // Active PDF template (admin-editable copy + colors). Falls back to the
  // built-in defaults if no row exists — same escape hatch pattern as the AI prompt.
  const { data: activeTemplate } = await supabase
    .from("pdf_template_configs")
    .select("*")
    .eq("is_active", true)
    .maybeSingle<PdfTemplateConfig>();

  const template = activeTemplate ?? DEFAULT_PDF_TEMPLATE;

  const pdfBuffer = await renderFeedbackPdf({
    participant: { name: participant.name },
    feedback: {
      worksheet_1: humanEdit.worksheet_1,
      worksheet_2: humanEdit.worksheet_2,
      worksheet_3: humanEdit.worksheet_3,
    },
    answers: { worksheet_1: w1, worksheet_2: w2, worksheet_3: w3 },
    template,
  });

  const payload = {
    participantId,
    participantName: participant.name,
    participantEmail: participant.email,
    callbackUrl,
    pdfBase64: pdfBuffer.toString("base64"),
    pdfFilename: `Donor Alignment Feedback — ${participant.name}.pdf`,
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": webhookSecret,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`n8n webhook ${res.status}: ${text}`);
  }
}
