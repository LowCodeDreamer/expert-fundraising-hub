import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "email query parameter is required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: participant, error } = await supabase
    .from("participants")
    .select("id, name, email")
    .eq("email", email)
    .single();

  if (error || !participant) {
    return NextResponse.json({
      name: null,
      email,
      completedWorksheets: [],
      answers: {},
    });
  }

  const { data: submissions } = await supabase
    .from("worksheet_submissions")
    .select("worksheet_number, answers")
    .eq("participant_id", participant.id);

  const completedWorksheets: number[] = [];
  const answers: Record<number, object> = {};

  if (submissions) {
    for (const sub of submissions) {
      completedWorksheets.push(sub.worksheet_number);
      answers[sub.worksheet_number] = sub.answers;
    }
  }

  return NextResponse.json({
    name: participant.name,
    email: participant.email,
    completedWorksheets,
    answers,
  });
}
