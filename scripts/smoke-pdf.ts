/**
 * Standalone smoke test for the PDF renderer.
 *
 *   npx tsx scripts/smoke-pdf.ts
 *
 * Writes /tmp/feedback-smoke.pdf. Open it to eyeball: no blank cover,
 * fonts load, three sections, W3 closes with the mandatory question.
 */
import fs from "node:fs";
import path from "node:path";
import { renderFeedbackPdf } from "../lib/pdf/render";
import { DEFAULT_PDF_TEMPLATE } from "../lib/pdf/feedback-pdf";

async function main() {
  const buffer = await renderFeedbackPdf({
    participant: { name: "Jane Fundraiser" },
    feedback: {
      worksheet_1:
        "Strong relationships with long-term donors are a real asset — what you want to investigate now is what has made those relationships work so you can replicate it intentionally.\n\nYour hesitation to ask is worth exploring honestly. What specifically are you afraid will happen if you make a direct request? That answer will tell you what belief is in your way.",
      worksheet_2:
        "Leading with programs is where most fundraisers start — the shift to leading with impact will change the energy in every conversation you have.",
      worksheet_3:
        "Data confirms commitment — it doesn't create it. Even a Head-centered donor needs their Heart activated first: what do they care about, and why?",
    },
    answers: {
      worksheet_1: {
        q1_working:
          "I have steady relationships with a handful of multi-year donors who believe in the mission.",
        q2_stuck:
          "I feel awkward making direct asks — I keep hinting instead of naming a number.",
      },
      worksheet_2: {
        q1_led_with: "Outputs",
        q2_impact_statement:
          "A world where formerly incarcerated youth have safe, permanent housing within 30 days of release.",
        q3_mindset: "Nervous but I manage it",
        q4_limiting_belief:
          "Rich people will think I'm just after their money.",
        q5_donor_list: "I have a list but it's incomplete",
        q6_meeting_prep:
          "I review our latest impact numbers and jot down a rough agenda.",
      },
      worksheet_3: {
        q1_donor_center: "Head",
        q2_breakdown:
          "When I pivoted to the budget shortfall, I could feel the donor's energy drop.",
        q3_redo:
          "I'd spend longer on what first drew them in and build from there instead of rushing to the ask.",
      },
    },
    template: DEFAULT_PDF_TEMPLATE,
  });

  const out = path.join("/tmp", "feedback-smoke.pdf");
  fs.writeFileSync(out, buffer);
  console.log(`Wrote ${buffer.length} bytes → ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
