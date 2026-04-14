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
    .from("prompt_configs")
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
  const { name, system_prompt, model, temperature, max_tokens, thinking_enabled, thinking_budget } = body;

  if (!name || !system_prompt || !model) {
    return NextResponse.json(
      { error: "name, system_prompt, and model are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Get the next version number
  const { data: latest } = await supabase
    .from("prompt_configs")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (latest?.version ?? 0) + 1;

  // Deactivate current active config
  await supabase
    .from("prompt_configs")
    .update({ is_active: false })
    .eq("is_active", true);

  // Insert new version as active
  const { data, error } = await supabase
    .from("prompt_configs")
    .insert({
      version: nextVersion,
      name,
      system_prompt,
      model,
      temperature: temperature ?? 0.4,
      max_tokens: max_tokens ?? 2000,
      thinking_enabled: thinking_enabled ?? false,
      thinking_budget: thinking_budget ?? 10000,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
