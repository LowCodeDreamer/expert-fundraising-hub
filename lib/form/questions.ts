export type QuestionType = "text" | "textarea" | "radio";

export interface QuestionConfig {
  id: string;
  type: QuestionType;
  label: string;
  placeholder?: string;
  options?: string[];
  rows?: number;
}

export interface WorksheetConfig {
  number: 1 | 2 | 3;
  title: string;
  subtitle: string;
  questions: QuestionConfig[];
}

export const WORKSHEETS: WorksheetConfig[] = [
  {
    number: 1,
    title: "Self-Assessment",
    subtitle: "Let's start with how things are going in your fundraising work.",
    questions: [
      { id: "q1_working", type: "textarea", label: "What's working in your current donor relationships or fundraising approach?", placeholder: "Take your time — there's no wrong answer here.", rows: 4 },
      { id: "q2_stuck", type: "textarea", label: "What feels stuck or unclear?", placeholder: "Be honest — this helps Alex give you the most useful feedback.", rows: 4 },
    ],
  },
  {
    number: 2,
    title: "Applying the Framework",
    subtitle: "Reflect on how you're applying the Donor Alignment framework in practice.",
    questions: [
      { id: "q1_led_with", type: "radio", label: "In your most recent donor conversation, did you lead with Impact (the transformed world you're creating) or with Outputs (the programs you run and the budget you need)?", options: ["Impact", "Outputs", "I'm not sure"] },
      { id: "q2_impact_statement", type: "textarea", label: "Complete this sentence: The impact we exist to create in the world is...", placeholder: "Describe the transformed world your organization exists to create.", rows: 3 },
      { id: "q3_mindset", type: "radio", label: "Which statement best describes how you feel when asking for money?", options: ["Confident and grounded", "Nervous but I manage it", "Apologetic", "I avoid asking altogether"] },
      { id: "q4_limiting_belief", type: "textarea", label: "What's one belief you have about money, wealth, or asking that might be getting in your way?", placeholder: "Be honest with yourself — awareness is the first step.", rows: 3 },
      { id: "q5_donor_list", type: "radio", label: "Do you have a written list of your top 10–20 major donor prospects with notes on capacity, interests, and next steps?", options: ["Yes, a detailed list", "I have a list but it's incomplete", "No list"] },
      { id: "q6_meeting_prep", type: "textarea", label: "When you prepare for a donor meeting, what do you typically do?", placeholder: "Walk us through your typical preparation process.", rows: 3 },
    ],
  },
  {
    number: 3,
    title: "Head-Heart-Hara Mapping",
    subtitle: "Reflect on a recent donor conversation through the lens of the three centers.",
    questions: [
      { id: "q1_donor_center", type: "radio", label: "Think about a recent donor conversation. Which center do you think the donor was in most of the time?", options: ["Head", "Heart", "Hara"] },
      { id: "q2_breakdown", type: "textarea", label: "Looking back, where do you think the conversation broke down or could have gone deeper?", placeholder: "What moment or shift might have changed the outcome?", rows: 4 },
      { id: "q3_redo", type: "textarea", label: "If you could redo that conversation, what would you do differently?", placeholder: "With what you know now, what would you change?", rows: 4 },
    ],
  },
];

export function getWorksheetByNumber(n: number): WorksheetConfig | undefined {
  return WORKSHEETS.find((w) => w.number === n);
}
