import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

async function isAuthed() {
  return (await cookies()).get("admin_session")?.value === "authenticated";
}

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("pdf_template_configs")
    .select("*")
    .order("version", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    cover_title,
    intro_paragraph,
    worksheet_1_heading,
    worksheet_2_heading,
    worksheet_3_heading,
    closing_paragraph,
    signature_block,
    accent_color,
    logo_url,
  } = body;

  const required = {
    name,
    cover_title,
    intro_paragraph,
    worksheet_1_heading,
    worksheet_2_heading,
    worksheet_3_heading,
    closing_paragraph,
    signature_block,
    accent_color,
  };
  for (const [key, value] of Object.entries(required)) {
    if (!value || typeof value !== "string" || !value.trim()) {
      return NextResponse.json(
        { error: `${key} is required` },
        { status: 400 }
      );
    }
  }

  const supabase = createServiceClient();

  const { data: latest } = await supabase
    .from("pdf_template_configs")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (latest?.version ?? 0) + 1;

  await supabase
    .from("pdf_template_configs")
    .update({ is_active: false })
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("pdf_template_configs")
    .insert({
      version: nextVersion,
      name,
      cover_title,
      intro_paragraph,
      worksheet_1_heading,
      worksheet_2_heading,
      worksheet_3_heading,
      closing_paragraph,
      signature_block,
      accent_color,
      logo_url: typeof logo_url === "string" && logo_url.trim() ? logo_url.trim() : null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
