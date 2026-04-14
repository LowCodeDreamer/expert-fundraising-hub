export type FeedbackStatus =
  | "pending"
  | "generating"
  | "draft"
  | "approved"
  | "sent";

export interface Participant {
  id: string;
  email: string;
  name: string;
  course_started_at: string;
  created_at: string;
}

export interface WorksheetSubmission {
  id: string;
  participant_id: string;
  worksheet_number: 1 | 2 | 3;
  answers: Worksheet1Answers | Worksheet2Answers | Worksheet3Answers;
  submitted_at: string;
}

export interface Worksheet1Answers {
  q1_working: string;
  q2_stuck: string;
}

export interface Worksheet2Answers {
  q1_led_with: "Impact" | "Outputs" | "I'm not sure";
  q2_impact_statement: string;
  q3_mindset:
    | "Confident and grounded"
    | "Nervous but I manage it"
    | "Apologetic"
    | "I avoid asking altogether";
  q4_limiting_belief: string;
  q5_donor_list:
    | "Yes, a detailed list"
    | "I have a list but it's incomplete"
    | "No list";
  q6_meeting_prep: string;
}

export interface Worksheet3Answers {
  q1_donor_center: "Head" | "Heart" | "Hara";
  q2_breakdown: string;
  q3_redo: string;
}

export interface FeedbackDraft {
  worksheet_1: string;
  worksheet_2: string;
  worksheet_3: string;
}

export interface FeedbackJob {
  id: string;
  participant_id: string;
  status: FeedbackStatus;
  ai_draft: FeedbackDraft | null;
  human_edit: FeedbackDraft | null;
  reviewer_notes: string | null;
  error_message: string | null;
  triggered_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}
