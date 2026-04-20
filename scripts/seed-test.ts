/**
 * Backend test harness for the delivery pipeline.
 *
 *   npx tsx scripts/seed-test.ts --email me+t1@example.com --status draft
 *   npx tsx scripts/seed-test.ts --email me+t2@example.com --status pending --trigger generate
 *   npx tsx scripts/seed-test.ts --email me+t3@example.com --status approved --trigger approve
 *   npx tsx scripts/seed-test.ts --email me+t4@example.com --status generating --error "Stuck"
 *
 * Defaults: name='Test Participant', status='draft'. Reads env from .env.local.
 *
 * Behaviors by status:
 *   pending     — job with no drafts, error_message optional (via --error)
 *   generating  — job stuck in generating; use --error to simulate failure state
 *   draft       — job with ai_draft + human_edit populated (canned feedback)
 *   approved    — job with drafts + approved_at set
 *   sent        — job with drafts + approved_at + sent_at
 *
 * --trigger:
 *   generate — POSTs to /api/generate (requires server running at NEXT_PUBLIC_APP_URL)
 *   approve  — POSTs to /api/approve with admin_session cookie (ADMIN_PASSWORD)
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type {
  FeedbackStatus,
  Worksheet1Answers,
  Worksheet2Answers,
  Worksheet3Answers,
  FeedbackDraft,
} from "../types/database";

// Load .env.local manually (no Next.js runtime here)
loadDotEnv(path.join(process.cwd(), ".env.local"));

interface Args {
  email: string;
  name: string;
  status: FeedbackStatus;
  error?: string;
  trigger?: "generate" | "approve";
}

const args = parseArgs(process.argv.slice(2));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl!, serviceKey!);

const CANNED_W1: Worksheet1Answers = {
  q1_working:
    "I have steady relationships with a handful of multi-year donors who believe in the mission.",
  q2_stuck:
    "I feel awkward making direct asks — I keep hinting instead of naming a number.",
};

const CANNED_W2: Worksheet2Answers = {
  q1_led_with: "Outputs",
  q2_impact_statement:
    "A world where formerly incarcerated youth have safe, permanent housing within 30 days of release.",
  q3_mindset: "Nervous but I manage it",
  q4_limiting_belief: "Rich people will think I'm just after their money.",
  q5_donor_list: "I have a list but it's incomplete",
  q6_meeting_prep:
    "I review our latest impact numbers and jot down a rough agenda.",
};

const CANNED_W3: Worksheet3Answers = {
  q1_donor_center: "Head",
  q2_breakdown:
    "When I pivoted to the budget shortfall, I could feel the donor's energy drop.",
  q3_redo:
    "I'd spend longer on what first drew them in and build from there instead of rushing to the ask.",
};

const CANNED_FEEDBACK: FeedbackDraft = {
  worksheet_1:
    "Strong relationships with long-term donors are a real asset — what you want to investigate now is what has made those relationships work so you can replicate it intentionally. Your hesitation to ask is worth exploring honestly. What specifically are you afraid will happen if you make a direct request?",
  worksheet_2:
    "Leading with programs is where most fundraisers start — the shift to leading with impact will change the energy in every conversation you have. What might you say differently in your next meeting if you opened with your impact statement instead?",
  worksheet_3:
    "Data is a tool that confirms commitment — it doesn't create it. Even a Head-centered donor needs their Heart activated first: what do they care about, and why? How will this awareness prepare you for your next donor meeting?",
};

async function main() {
  console.log(`\n→ Seeding ${args.email} (${args.name}) as '${args.status}'`);

  // 1. Upsert participant
  const { data: existing } = await supabase
    .from("participants")
    .select("id")
    .eq("email", args.email)
    .maybeSingle();

  let participantId: string;
  if (existing) {
    participantId = existing.id as string;
    await supabase
      .from("participants")
      .update({ name: args.name })
      .eq("id", participantId);
    console.log(`  participant: updated ${participantId}`);
  } else {
    const { data, error } = await supabase
      .from("participants")
      .insert({
        email: args.email,
        name: args.name,
        course_started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) fail(`participant insert: ${error.message}`);
    participantId = data!.id as string;
    console.log(`  participant: inserted ${participantId}`);
  }

  // 2. Upsert worksheet submissions
  const submissions = [
    { worksheet_number: 1, answers: CANNED_W1 },
    { worksheet_number: 2, answers: CANNED_W2 },
    { worksheet_number: 3, answers: CANNED_W3 },
  ];
  for (const s of submissions) {
    const { error } = await supabase
      .from("worksheet_submissions")
      .upsert(
        {
          participant_id: participantId,
          worksheet_number: s.worksheet_number,
          answers: s.answers,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "participant_id,worksheet_number" }
      );
    if (error) fail(`worksheet ${s.worksheet_number}: ${error.message}`);
  }
  console.log("  worksheets: 3/3 upserted");

  // 3. Build feedback_jobs row based on target status
  const now = new Date().toISOString();
  const hasDraft = ["draft", "approved", "sent"].includes(args.status);
  const hasApproval = ["approved", "sent"].includes(args.status);
  const hasSent = args.status === "sent";

  const jobRow = {
    participant_id: participantId,
    status: args.status,
    ai_draft: hasDraft ? CANNED_FEEDBACK : null,
    human_edit: hasDraft ? CANNED_FEEDBACK : null,
    reviewer_notes: null,
    error_message: args.error ?? null,
    triggered_at: args.status === "pending" ? null : now,
    approved_at: hasApproval ? now : null,
    sent_at: hasSent ? now : null,
    updated_at: now,
  };

  const { error: jobError } = await supabase
    .from("feedback_jobs")
    .upsert(jobRow, { onConflict: "participant_id" });
  if (jobError) fail(`feedback_jobs: ${jobError.message}`);
  console.log(`  feedback_job: status='${args.status}'${args.error ? ` error='${args.error}'` : ""}`);

  // 4. Optional trigger
  if (args.trigger === "generate") {
    await triggerGenerate(participantId);
  } else if (args.trigger === "approve") {
    await triggerApprove(participantId);
  }

  console.log(`\n✓ Done. Participant id: ${participantId}`);
  console.log(
    `  Admin: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/review/${participantId}`
  );
}

async function adminCookie(): Promise<string> {
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const adminPassword = requireEnv("ADMIN_PASSWORD");
  const loginRes = await fetch(`${appUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: adminPassword }),
  });
  if (!loginRes.ok) fail(`admin login failed: ${loginRes.status}`);
  return loginRes.headers.get("set-cookie") || "";
}

async function triggerGenerate(participantId: string) {
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const cookie = await adminCookie();
  const url = `${appUrl}/api/generate`;
  console.log(`  → POST ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ participantId }),
  });
  console.log(`    ${res.status}: ${await res.text().catch(() => "")}`);
}

async function triggerApprove(participantId: string) {
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const cookie = await adminCookie();
  const url = `${appUrl}/api/approve`;
  console.log(`  → POST ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      participantId,
      humanEdit: CANNED_FEEDBACK,
      reviewerNotes: "Seeded by test harness",
    }),
  });
  console.log(`    ${res.status}: ${await res.text().catch(() => "")}`);
}

// ——— helpers ———

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = {
    name: "Test Participant",
    status: "draft",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--email":
        out.email = argv[++i];
        break;
      case "--name":
        out.name = argv[++i];
        break;
      case "--status":
        out.status = argv[++i] as FeedbackStatus;
        break;
      case "--error":
        out.error = argv[++i];
        break;
      case "--trigger":
        out.trigger = argv[++i] as "generate" | "approve";
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        fail(`Unknown arg: ${a}`);
    }
  }
  if (!out.email) fail("--email is required");
  const valid: FeedbackStatus[] = [
    "pending",
    "generating",
    "draft",
    "approved",
    "sent",
  ];
  if (!valid.includes(out.status as FeedbackStatus)) {
    fail(`--status must be one of: ${valid.join(", ")}`);
  }
  if (
    out.trigger &&
    out.trigger !== "generate" &&
    out.trigger !== "approve"
  ) {
    fail("--trigger must be 'generate' or 'approve'");
  }
  return out as Args;
}

function printHelp() {
  console.log(
    `\nseed-test.ts — seed a participant + worksheets + feedback_job\n\n` +
      `  --email  <address>   required\n` +
      `  --name   <string>    default: "Test Participant"\n` +
      `  --status <pending|generating|draft|approved|sent>   default: draft\n` +
      `  --error  <string>    sets feedback_jobs.error_message\n` +
      `  --trigger <generate|approve>   fire-and-forget a real API call after seeding\n`
  );
}

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) fail(`Missing env ${key}`);
  return v!;
}

function loadDotEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let value = m[2];
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}

function fail(msg: string): never {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
