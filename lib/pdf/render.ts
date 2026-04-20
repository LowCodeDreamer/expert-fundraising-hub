import { pdf, type DocumentProps } from "@react-pdf/renderer";
import { FeedbackDocument } from "./feedback-pdf";
import type {
  Participant,
  FeedbackDraft,
  Worksheet1Answers,
  Worksheet2Answers,
  Worksheet3Answers,
  PdfTemplateConfig,
} from "@/types/database";
import type { ReactElement } from "react";

interface RenderInput {
  participant: Pick<Participant, "name">;
  feedback: FeedbackDraft;
  answers: {
    worksheet_1: Worksheet1Answers;
    worksheet_2: Worksheet2Answers;
    worksheet_3: Worksheet3Answers;
  };
  template: Pick<
    PdfTemplateConfig,
    | "cover_title"
    | "intro_paragraph"
    | "worksheet_1_heading"
    | "worksheet_2_heading"
    | "worksheet_3_heading"
    | "closing_paragraph"
    | "signature_block"
    | "accent_color"
    | "logo_url"
  >;
}

export async function renderFeedbackPdf(input: RenderInput): Promise<Buffer> {
  // Cast: FeedbackDocument returns a react-pdf Document element, but React 19's
  // global ReactElement typing doesn't narrow to DocumentProps.
  const instance = pdf(
    FeedbackDocument(input) as unknown as ReactElement<DocumentProps>
  );
  const stream = await instance.toBuffer();
  return await streamToBuffer(stream);
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
