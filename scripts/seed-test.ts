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
  persona?: PersonaKey;
}

const args = parseArgs(process.argv.slice(2));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl!, serviceKey!);

type PersonaKey =
  | "default"
  | "maria_chen"
  | "james_ochieng"
  | "sarah_thompson"
  | "david_kim"
  | "elena_vasquez"
  | "marcus_johnson";

interface PersonaData {
  defaultName: string;
  w1: Worksheet1Answers;
  w2: Worksheet2Answers;
  w3: Worksheet3Answers;
  feedback: FeedbackDraft;
}

const PERSONAS: Record<PersonaKey, PersonaData> = {
  default: {
    defaultName: "Test Participant",
    w1: {
      q1_working:
        "I have steady relationships with a handful of multi-year donors who believe in the mission.",
      q2_stuck:
        "I feel awkward making direct asks — I keep hinting instead of naming a number.",
    },
    w2: {
      q1_led_with: "Outputs",
      q2_impact_statement:
        "A world where formerly incarcerated youth have safe, permanent housing within 30 days of release.",
      q3_mindset: "Nervous but I manage it",
      q4_limiting_belief: "Rich people will think I'm just after their money.",
      q5_donor_list: "I have a list but it's incomplete",
      q6_meeting_prep:
        "I review our latest impact numbers and jot down a rough agenda.",
    },
    w3: {
      q1_donor_center: "Head",
      q2_breakdown:
        "When I pivoted to the budget shortfall, I could feel the donor's energy drop.",
      q3_redo:
        "I'd spend longer on what first drew them in and build from there instead of rushing to the ask.",
    },
    feedback: {
      worksheet_1:
        "Strong relationships with long-term donors are a real asset — what you want to investigate now is what has made those relationships work so you can replicate it intentionally. Your hesitation to ask is worth exploring honestly. What specifically are you afraid will happen if you make a direct request?",
      worksheet_2:
        "Leading with programs is where most fundraisers start — the shift to leading with impact will change the energy in every conversation you have. What might you say differently in your next meeting if you opened with your impact statement instead?",
      worksheet_3:
        "Data is a tool that confirms commitment — it doesn't create it. Even a Head-centered donor needs their Heart activated first: what do they care about, and why? How will this awareness prepare you for your next donor meeting?",
    },
  },

  // ED of a mid-sized nonprofit. Heart-open but output-oriented, apologetic
  // about asking, donor pulled back when she pivoted to the budget.
  maria_chen: {
    defaultName: "Maria Chen",
    w1: {
      q1_working:
        "Our mission lights me up and I can talk about the kids we serve for hours. Long-time donors who started small have stayed with us and a few have grown their giving.",
      q2_stuck:
        "I know what our budget gap is but naming a number out loud feels extractive. I keep circling the ask and ending the meeting with 'let us know if you'd like to help' instead of actually asking.",
    },
    w2: {
      q1_led_with: "Outputs",
      q2_impact_statement:
        "We run an after-school literacy program serving 240 kids across four elementary schools, with measurable gains on state reading assessments.",
      q3_mindset: "Nervous but I manage it",
      q4_limiting_belief: "Rich people will think I'm just after their money.",
      q5_donor_list: "I have a list but it's incomplete",
      q6_meeting_prep:
        "I pull our latest impact report, rehearse talking points in the car, and bring a one-pager.",
    },
    w3: {
      q1_donor_center: "Heart",
      q2_breakdown:
        "She was telling me a story about her own daughter's struggle with reading and I could feel us connecting — then I tried to pivot to our 60K funding gap and the whole energy dropped. She went quiet and said she'd 'think about it.'",
      q3_redo:
        "I'd stay in the story she was telling — ask her more about her daughter, about what she hoped we'd help change. I'd build from her 'why' instead of rushing to my ask.",
    },
    feedback: {
      worksheet_1:
        "Your heart for the mission is a real strength — that warmth is what people stay for. The gap you're noticing lives in the transition from enthusiasm to specificity. When you circle the ask, you're protecting yourself from a 'no' by never quite offering a 'yes' for them to say. What's the specific amount you've been avoiding naming, and what do you think would happen if you named it cleanly?",
      worksheet_2:
        "Leading with the program is where most fundraisers start. The literacy work is real, but 240 kids and test scores don't open a Heart — the kid who couldn't read last September and is now tutoring her brother does. Try rewriting your impact statement starting with that child's story, and see where the funding number wants to live at the end, not the beginning. What changes?",
      worksheet_3:
        "She was already in Heart. You had her. Pivoting to the budget in that moment is what the course calls 'managing' instead of meeting — and donors feel it in their body before their head catches up. The move wasn't to speed up, it was to slow down. If you had asked her what she hoped would be different for kids like her daughter, the gift conversation would have arisen on its own. How will this awareness prepare you for your next donor meeting?",
    },
  },

  // MGO who leads with Impact and is confident — but loses donors in the Hara
  // because he doesn't sit in the trust-building layer.
  james_ochieng: {
    defaultName: "James Ochieng",
    w1: {
      q1_working:
        "I can tell our impact story cleanly. Prospects lean in. I know how to run a cultivation cadence and my pipeline moves people through stages.",
      q2_stuck:
        "Enthusiastic donors stall before they commit. I get 'I love what you're doing' and then three months of silence. I'm never sure if I pushed too early or not enough.",
    },
    w2: {
      q1_led_with: "Impact",
      q2_impact_statement:
        "We're building a world where every rural clinic we partner with has the diagnostic capacity of a city hospital — so a child's zip code doesn't decide whether they get a correct diagnosis.",
      q3_mindset: "Confident and grounded",
      q4_limiting_belief:
        "Donors know what we need — if they want to give they'll just give.",
      q5_donor_list: "Yes, a detailed list",
      q6_meeting_prep:
        "Review CRM notes, pull recent giving, prep two or three impact stories tied to the ask amount.",
    },
    w3: {
      q1_donor_center: "Hara",
      q2_breakdown:
        "Halfway through I could tell he wasn't asking 'why does this matter' — he was asking 'who's actually running this, and can they deliver.' He asked who the country director in Kenya was and how long they'd been there and I didn't have a confident answer. I felt him pull back and I kept talking about impact instead of addressing what was actually in the room.",
      q3_redo:
        "I'd have flagged the trust question directly — 'it sounds like you want to understand who's delivering this on the ground' — and offered to set up a call with our country director. I'd have stopped selling impact once I realized he was already sold on the mission.",
    },
    feedback: {
      worksheet_1:
        "You're further along than most — the pipeline runs, the stories land, the ask lands cleanly. The 'enthusiastic but stalled' pattern you're seeing almost always lives in the Hara layer: donors who love the mission but don't yet trust that the organization can reliably deliver on it. Which of your stalled prospects asked operational questions you couldn't answer fully?",
      worksheet_2:
        "Your impact statement is strong — it moves from vision down to the person whose life is different. Hold onto that. The belief that's quietly working against you is 'donors know what we need.' They don't. Even your most engaged prospects aren't tracking you between meetings. When you next meet with a stalled donor, make the current need explicit and tie it to the specific piece of impact they already said they cared about. What changes when you stop assuming and start inviting?",
      worksheet_3:
        "You read the Heart and Head well — you lost him in the Hara, the moment he asked who was running the Kenya program. That's the trust question, and it's the one the course says decides major gifts. The reflex to keep selling impact is exactly the thing that made him pull back. The repair move is what you named: bring in the person who actually delivers. A donor doesn't need to trust you personally — they need to trust that the people delivering on what they care about are trustworthy. How will this awareness prepare you for your next donor meeting?",
    },
  },

  // Board member asked to make introductions, deeply uncomfortable with asking.
  // Led from Head, didn't have operational answers, still doubting her role.
  sarah_thompson: {
    defaultName: "Rev. Sarah Thompson",
    w1: {
      q1_working:
        "People trust me — I've built thirty years of relationships in this city and they pick up when I call. A couple of quiet introductions this year turned into meaningful gifts.",
      q2_stuck:
        "Asking friends for money feels like trading in on a relationship I spent a lifetime building. I freeze at the ask and tend to hand the meeting back to our ED before any number gets named.",
    },
    w2: {
      q1_led_with: "I'm not sure",
      q2_impact_statement:
        "We want to see every unhoused family in our parish connected with permanent housing and the wraparound support to stay there — dignity restored, not services provided.",
      q3_mindset: "Apologetic",
      q4_limiting_belief:
        "If I ask for too much they'll think I'm a burden — and I'll lose the friendship either way.",
      q5_donor_list: "I have a list but it's incomplete",
      q6_meeting_prep:
        "I pray beforehand and show up with the ED who handles the tactical parts.",
    },
    w3: {
      q1_donor_center: "Head",
      q2_breakdown:
        "He wanted to know how our coordinated entry system compared to the county's approach and whether we'd considered Housing First — operational questions. I don't work on that day to day and I stumbled. He politely said he'd review our audited financials and 'get back to us.' I could feel the meeting close.",
      q3_redo:
        "I'd have brought our ED into that specific question directly, or scheduled a follow-up with our housing director. I shouldn't try to be the operational expert — I should be the bridge to the people who are.",
    },
    feedback: {
      worksheet_1:
        "The trust you've built in this city is the asset — nobody on your staff can walk into those rooms the way you can. The discomfort you're feeling about 'trading in' on relationships is worth naming honestly, because it's the thing shaping every conversation. A clear ask doesn't cost you a friendship; vagueness does — it leaves people guessing at your motives. What's the belief underneath 'I'd lose the friendship either way,' and is it actually true?",
      worksheet_2:
        "Your impact statement has the right bones — 'dignity restored, not services provided' is the voice. The apologetic mindset is where the meeting leaks. Apology telegraphs to the donor that you don't fully believe in what you're asking for. When you walk in as a peer offering an invitation — not as someone imposing — the energy in the room is different, and your friend feels it. What would it sound like to name the gift amount calmly, without softening it?",
      worksheet_3:
        "You read him correctly — he was in Head, asking operational questions. The mistake wasn't yours; it was a role mismatch. Board members don't need to be the operational expert. They need to be the bridge — the one who says 'that's a great question, let me get our ED and housing director on a call with you next week.' That hand-off is itself a trust signal. How will this awareness prepare you for your next donor meeting?",
    },
  },

  // Development Director at a larger shop. Strong on framework, frozen at
  // the ask. Cerebral donor walked away because trust was never established.
  david_kim: {
    defaultName: "David Kim",
    w1: {
      q1_working:
        "I build rapport quickly and I can talk about our work with real depth — donors trust me to tell them the truth, including when we've failed.",
      q2_stuck:
        "I get to the moment of the ask and I reroute. I'll ask if 'there's a way they could see themselves getting involved' instead of naming an amount. Nobody has ever complained, but nobody's making a major gift either.",
    },
    w2: {
      q1_led_with: "Impact",
      q2_impact_statement:
        "We exist so that every child in our city's foster system has a stable, trained adult in their life from day one — ending the silent epidemic of kids aging out alone.",
      q3_mindset: "I avoid asking altogether",
      q4_limiting_belief:
        "If I ask for a specific amount I'm pricing the relationship — and I'll find out what our work is actually worth to them.",
      q5_donor_list: "I have a list but it's incomplete",
      q6_meeting_prep:
        "Heavy external prep — giving history, program notes, three stories rehearsed. Almost no internal prep. I just push through the anxiety.",
    },
    w3: {
      q1_donor_center: "Head",
      q2_breakdown:
        "He asked how we compared to two other organizations in the space. I had reasonable answers but I could feel myself reaching for impressiveness instead of clarity. He thanked me for my time and said he'd 'reflect.' I never followed up because I couldn't tell what he was actually asking for.",
      q3_redo:
        "I'd have asked him what was driving the comparison — whether he was stuck between us or genuinely exploring. That question alone would've told me what he needed from me.",
    },
    feedback: {
      worksheet_1:
        "The trust you build is real — donors telling you their truth is not a small thing. The rerouting at the ask is the clearest pattern in what you wrote, and the phrase 'a way they could see themselves getting involved' is doing a lot of work to protect you from a specific answer. What you're avoiding isn't the ask; it's the information a real ask would give you. What are you actually afraid of learning?",
      worksheet_2:
        "Your impact statement has force — it names a specific wrong and places the donor inside the repair. Hold that. The belief you named — that a specific ask 'prices the relationship' — is the thing quietly running your meetings. A clear number isn't a price tag; it's an invitation with a specific shape. Try this in your next meeting: write down the amount you'd ask for before you walk in. Not to pressure yourself — just to see what comes up.",
      worksheet_3:
        "He was in Head, comparing options — which means he was already treating you as a serious candidate. The reach for impressiveness pulled you out of yourself. He didn't need a better answer about the comparison; he needed you to be grounded enough to ask him what he was really deciding. That's the trust signal he was looking for, and you had it in you to give. How will this awareness prepare you for your next donor meeting?",
    },
  },

  // Founding ED. Tremendous messenger, no machine. Relies on story + charisma,
  // which works until she forgets who she already spoke to.
  elena_vasquez: {
    defaultName: "Elena Vasquez",
    w1: {
      q1_working:
        "I can bring a donor into our work in twenty minutes. They meet the women in our program, they feel the weight of what we do, and the ones who say yes say yes fast.",
      q2_stuck:
        "I rely on my memory and it's failing me. I've double-pitched the same donor twice, forgotten who introduced me to whom, and I've lost two meaningful prospects in the last year because I didn't follow up in time.",
    },
    w2: {
      q1_led_with: "Impact",
      q2_impact_statement:
        "We exist so that women leaving our program have the economic independence to never need it again — breaking the cycle in one generation instead of three.",
      q3_mindset: "Confident and grounded",
      q4_limiting_belief:
        "Systems and lists are for organizations without a real story. Ours speaks for itself.",
      q5_donor_list: "No list",
      q6_meeting_prep:
        "I think about the donor on my drive over. I let the meeting unfold. I've never written a meeting plan.",
    },
    w3: {
      q1_donor_center: "Heart",
      q2_breakdown:
        "She loved the story. She wept. I made the ask and she said yes — for an amount I could tell she'd figured out on her own, not something I'd named. I think I left a much larger gift on the table because I didn't know her capacity and I didn't want to name a number that felt arbitrary.",
      q3_redo:
        "I'd have actually researched her before the meeting — giving history elsewhere, board affiliations, real estate. I'd have had a number in mind grounded in her capacity, not my hope.",
    },
    feedback: {
      worksheet_1:
        "The messenger is already the strongest part of your organization. That's not a small thing — most EDs never build it in a lifetime. The gap you're naming is the Machine, and the words 'lost two meaningful prospects' tell you the cost in real dollars. The charisma got you here; it won't get you the next order of magnitude without the scaffolding underneath. What would it feel like to let the system hold the memory so you can hold the relationships?",
      worksheet_2:
        "The impact statement is alive — 'one generation instead of three' is exactly the kind of line donors repeat to their spouse over dinner. Hold it. The belief that lists are for organizations without a real story is a founder's belief, and it's the one that caps you. A prospect list doesn't replace the story — it makes sure the story reaches the right people at the right time. What's one meeting this month you'd plan differently if you had a proper list in front of you?",
      worksheet_3:
        "Her Heart was wide open — you did the hardest part. The gift you left on the table lived in the Machine, not the Messenger. Knowing her capacity wouldn't have made the ask arbitrary; it would have made it specific. A number grounded in what she can actually give, tied to what she just told you she cared about, is an act of respect — not pressure. How will this awareness prepare you for your next donor meeting?",
    },
  },

  // MGO who does most things right on paper, but apologizes at the moment of
  // truth. Donor was in Hara — he needed certainty, she gave him hedge.
  marcus_johnson: {
    defaultName: "Marcus Johnson",
    w1: {
      q1_working:
        "My prep is solid. I have notes on every donor, clear next steps, and I show up knowing what I want from each meeting.",
      q2_stuck:
        "The moment I name a number I feel myself shrink. My voice goes up at the end of the sentence like it's a question. Donors who were leaning in lean back.",
    },
    w2: {
      q1_led_with: "Outputs",
      q2_impact_statement:
        "We fund direct-service nonprofits across the region so that small organizations doing essential work can focus on the work instead of the fundraising.",
      q3_mindset: "Apologetic",
      q4_limiting_belief:
        "Asking for a large gift is presumptuous — I haven't earned it and neither has the organization.",
      q5_donor_list: "Yes, a detailed list",
      q6_meeting_prep:
        "Full CRM review the day before. I rehearse the ask out loud in the car. The rehearsals are strong. The real thing isn't.",
    },
    w3: {
      q1_donor_center: "Hara",
      q2_breakdown:
        "He was testing me. He asked short, sharp questions — 'how long has your director been there,' 'how do you handle attrition,' 'what happens if I give and three months later your numbers dip.' I answered every question accurately but I kept apologizing in the margins. He told me he needed to think about it. I could see him deciding in real time that I wasn't the person to trust with a large gift.",
      q3_redo:
        "I'd have matched his energy. Short, clean answers. No hedges. And at the end I would have said the number with the same certainty he was looking for in everything else.",
    },
    feedback: {
      worksheet_1:
        "Your preparation is the thing most MGOs never do — don't lose that. The shrinking at the ask is the only thing standing between you and the work paying off. 'My voice goes up at the end of the sentence like it's a question' is extraordinarily specific, and it's the whole diagnosis. What belief are you asking the donor to validate in that moment?",
      worksheet_2:
        "Leading with outputs — 'we fund direct-service nonprofits' — is a classic messenger-of-a-messenger trap. The impact lives one layer deeper: what changes for the people those nonprofits serve when your funding means the director isn't up until 2 a.m. writing grants? Lead there. The belief about 'presumption' is the thing collapsing your voice at the end of the sentence. You're not presuming; you're inviting. What happens when you stop apologizing for the size of the ask and let it be the size it is?",
      worksheet_3:
        "He was entirely in Hara — short questions, no warmth, watching how you held yourself under pressure. You answered the questions correctly, but Hara doesn't grade the answers; it grades the messenger. Every apology in the margins told him you didn't trust yourself, which told him he couldn't either. The repair you named — matching his energy, no hedges, the number stated with certainty — is exactly right. How will this awareness prepare you for your next donor meeting?",
    },
  },
};

async function main() {
  const personaKey: PersonaKey = args.persona ?? "default";
  const persona = PERSONAS[personaKey];
  // If --persona is supplied and --name isn't, use persona's default name.
  const effectiveName =
    args.persona && args.name === "Test Participant"
      ? persona.defaultName
      : args.name;

  console.log(
    `\n→ Seeding ${args.email} (${effectiveName}) as '${args.status}' [persona=${personaKey}]`
  );

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
      .update({ name: effectiveName })
      .eq("id", participantId);
    console.log(`  participant: updated ${participantId}`);
  } else {
    const { data, error } = await supabase
      .from("participants")
      .insert({
        email: args.email,
        name: effectiveName,
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
    { worksheet_number: 1, answers: persona.w1 },
    { worksheet_number: 2, answers: persona.w2 },
    { worksheet_number: 3, answers: persona.w3 },
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
    ai_draft: hasDraft ? persona.feedback : null,
    human_edit: hasDraft ? persona.feedback : null,
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
    await triggerApprove(participantId, persona.feedback);
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

async function triggerApprove(
  participantId: string,
  feedback: FeedbackDraft
) {
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const cookie = await adminCookie();
  const url = `${appUrl}/api/approve`;
  console.log(`  → POST ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      participantId,
      humanEdit: feedback,
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
      case "--persona":
        out.persona = argv[++i] as PersonaKey;
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
  const validPersonas: PersonaKey[] = [
    "default",
    "maria_chen",
    "james_ochieng",
    "sarah_thompson",
    "david_kim",
    "elena_vasquez",
    "marcus_johnson",
  ];
  if (out.persona && !validPersonas.includes(out.persona)) {
    fail(`--persona must be one of: ${validPersonas.join(", ")}`);
  }
  return out as Args;
}

function printHelp() {
  console.log(
    `\nseed-test.ts — seed a participant + worksheets + feedback_job\n\n` +
      `  --email   <address>   required\n` +
      `  --name    <string>    default: persona's name, else "Test Participant"\n` +
      `  --status  <pending|generating|draft|approved|sent>   default: draft\n` +
      `  --error   <string>    sets feedback_jobs.error_message\n` +
      `  --trigger <generate|approve>   fire-and-forget a real API call after seeding\n` +
      `  --persona <default|maria_chen|james_ochieng|sarah_thompson>   default: default\n`
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
