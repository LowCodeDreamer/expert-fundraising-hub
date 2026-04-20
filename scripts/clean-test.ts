/**
 * Delete test participants (and their worksheets + feedback_jobs) by email prefix.
 *
 *   npx tsx scripts/clean-test.ts --prefix me+t
 *   npx tsx scripts/clean-test.ts --email me+t1@example.com
 *
 * Fails closed: refuses to run without either --prefix or --email to avoid
 * accidentally wiping real participants.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

loadDotEnv(path.join(process.cwd(), ".env.local"));

interface Args {
  prefix?: string;
  email?: string;
}
const args = parseArgs(process.argv.slice(2));

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY")
);

async function main() {
  if (!args.prefix && !args.email) {
    fail("Pass --prefix <str> or --email <addr>. Refusing to nuke everything.");
  }

  const query = supabase.from("participants").select("id, email, name");
  const { data, error } = args.email
    ? await query.eq("email", args.email)
    : await query.ilike("email", `${args.prefix}%`);
  if (error) fail(error.message);
  if (!data || data.length === 0) {
    console.log("No matches.");
    return;
  }

  console.log(`Matching ${data.length} participant(s):`);
  for (const p of data) console.log(`  - ${p.email} (${p.id})`);

  const ids = data.map((p) => p.id as string);
  const { error: jobsErr } = await supabase
    .from("feedback_jobs")
    .delete()
    .in("participant_id", ids);
  if (jobsErr) fail(`feedback_jobs: ${jobsErr.message}`);

  const { error: wsErr } = await supabase
    .from("worksheet_submissions")
    .delete()
    .in("participant_id", ids);
  if (wsErr) fail(`worksheet_submissions: ${wsErr.message}`);

  const { error: pErr } = await supabase
    .from("participants")
    .delete()
    .in("id", ids);
  if (pErr) fail(`participants: ${pErr.message}`);

  console.log(`✓ Deleted ${ids.length} participant(s) and dependent rows.`);
}

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--prefix") out.prefix = argv[++i];
    else if (a === "--email") out.email = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(
        `\nclean-test.ts --prefix <email-prefix> | --email <address>\n`
      );
      process.exit(0);
    } else fail(`Unknown arg: ${a}`);
  }
  return out;
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

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) fail(`Missing env ${key}`);
  return v!;
}

function fail(msg: string): never {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
