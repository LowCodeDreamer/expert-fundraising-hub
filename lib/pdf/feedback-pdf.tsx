import path from "node:path";
import fs from "node:fs";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Font,
  StyleSheet,
  type Styles,
} from "@react-pdf/renderer";

type Style = Styles[string];
import type {
  Participant,
  FeedbackDraft,
  Worksheet1Answers,
  Worksheet2Answers,
  Worksheet3Answers,
  PdfTemplateConfig,
} from "@/types/database";
import {
  w1QuestionLabels,
  w2QuestionLabels,
  w3QuestionLabels,
} from "@/lib/form/questions";

const fontsDir = path.join(process.cwd(), "public", "fonts");
const localLogoPath = path.join(process.cwd(), "public", "brand", "logo.png");
const localLogoExists = fs.existsSync(localLogoPath);

// Register once at module load. Files live in /public/fonts — shipped with the deploy.
Font.register({
  family: "PlayfairDisplay",
  fonts: [
    { src: path.join(fontsDir, "PlayfairDisplay.ttf"), fontWeight: 400 },
    { src: path.join(fontsDir, "PlayfairDisplay.ttf"), fontWeight: 700 },
  ],
});
Font.register({
  family: "DMSans",
  fonts: [
    { src: path.join(fontsDir, "DMSans.ttf"), fontWeight: 400 },
    { src: path.join(fontsDir, "DMSans.ttf"), fontWeight: 500 },
    { src: path.join(fontsDir, "DMSans.ttf"), fontWeight: 700 },
  ],
});

// Don't break whole words across lines if react-pdf's default hyphenation decides to.
Font.registerHyphenationCallback((word) => [word]);

export const DEFAULT_PDF_TEMPLATE: Omit<
  PdfTemplateConfig,
  "id" | "version" | "is_active" | "created_at"
> = {
  name: "Built-in fallback",
  cover_title: "Worksheet Responses and Feedback",
  intro_paragraph:
    "Thank you for participating in the Foundations of Donor Alignment course. We hope the experience was enriching and helps to inform your work and fundraising efforts.\n\nBelow are the answers you provided in the worksheets with insights from Alex based on what you shared. If you have any questions or want to follow up please feel free to connect with us at support@expertfundraising.org or explore the website www.expertfundraising.org.",
  worksheet_1_heading: "Worksheet 1: Self-Assessment",
  worksheet_2_heading: "Worksheet 2: Applying the Framework",
  worksheet_3_heading: "Worksheet 3: Head-Heart-Hara Mapping",
  closing_paragraph:
    "If you haven't already, be sure to sign up for the free workshop to secure your seat before the next one fills up. You can do so by visiting www.expertfundraising.org.",
  signature_block:
    "Expert Fundraising\nThe Foundations of Donor Alignment\nsupport@expertfundraising.org",
  accent_color: "#0D2B5C",
  logo_url:
    "https://uwmugthxwcaoezawsgkp.supabase.co/storage/v1/object/public/pdf-assets/logos/1776695009551-e9c0300c-09e9-4c92-a7ed-7f3e11de42e6.jpg",
};

// Exact closing sentence required by the course. Appended if the feedback
// text doesn't already end with it — belt-and-suspenders against the prompt
// drifting.
const REQUIRED_W3_CLOSING =
  "How will this awareness prepare you for your next donor meeting?";

function ensureW3Closing(text: string): string {
  const trimmed = (text || "").trim();
  if (!trimmed) return REQUIRED_W3_CLOSING;
  if (trimmed.endsWith(REQUIRED_W3_CLOSING)) return trimmed;
  return `${trimmed}\n\n${REQUIRED_W3_CLOSING}`;
}

function makeStyles(accent: string) {
  return StyleSheet.create({
    page: {
      paddingTop: 56,
      paddingBottom: 96,
      paddingHorizontal: 56,
      fontFamily: "DMSans",
      fontSize: 11,
      lineHeight: 1.55,
      color: "#2A2A2A",
    },
    header: {
      marginBottom: 24,
      borderBottomWidth: 2,
      borderBottomColor: accent,
      paddingBottom: 16,
    },
    logo: {
      width: "100%",
      marginBottom: 12,
    },
    coverTitle: {
      fontFamily: "PlayfairDisplay",
      fontSize: 24,
      fontWeight: 700,
      color: accent,
      marginBottom: 8,
    },
    greeting: {
      marginBottom: 12,
      color: "#2A2A2A",
    },
    paragraph: {
      marginBottom: 10,
    },
    sectionHeading: {
      fontFamily: "PlayfairDisplay",
      fontSize: 16,
      fontWeight: 700,
      color: accent,
      marginTop: 18,
      marginBottom: 10,
    },
    questionLabel: {
      fontFamily: "DMSans",
      fontSize: 10,
      fontWeight: 700,
      color: "#555",
      marginBottom: 3,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    answerBlock: {
      marginBottom: 12,
    },
    answerText: {
      fontStyle: "normal",
      color: "#3a3a3a",
    },
    feedbackHeading: {
      fontFamily: "PlayfairDisplay",
      fontSize: 12,
      fontWeight: 700,
      color: accent,
      marginTop: 10,
      marginBottom: 6,
    },
    feedbackText: {
      marginBottom: 4,
    },
    closing: {
      marginTop: 24,
      marginBottom: 14,
    },
    footer: {
      position: "absolute",
      bottom: 36,
      left: 56,
      right: 56,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: "#E8E4DF",
      fontSize: 9,
      lineHeight: 1.2,
      color: "#555",
      textAlign: "center",
    },
    footerLine: {
      lineHeight: 1.2,
    },
    pageNumber: {
      position: "absolute",
      bottom: 20,
      left: 0,
      right: 0,
      textAlign: "center",
      fontSize: 9,
      color: "#999",
    },
  });
}

// Split text into alternating plain/URL segments so URLs can be styled inline.
function renderWithUrls(text: string) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <Text key={i} style={{ color: "#1d4ed8" }}>
        {part}
      </Text>
    ) : (
      <Text key={i}>{part}</Text>
    )
  );
}

// Render multi-line plain text as distinct paragraphs, preserving blank-line breaks.
function Paragraphs({
  text,
  style,
  renderUrls,
}: {
  text: string;
  style?: Style;
  renderUrls?: boolean;
}) {
  const blocks = (text || "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((block, i) => {
        const flat = block.replace(/\n/g, " ");
        return (
          <Text key={i} style={style}>
            {renderUrls ? renderWithUrls(flat) : flat}
          </Text>
        );
      })}
    </>
  );
}

interface FeedbackDocumentProps {
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

export function FeedbackDocument({
  participant,
  feedback,
  answers,
  template,
}: FeedbackDocumentProps) {
  const styles = makeStyles(template.accent_color || "#2D6A5F");

  // Prefer the uploaded logo URL; fall back to a committed public/brand/logo.png
  // so local-dev renders still work without a config row.
  const logoSrc: string | null = template.logo_url
    ? template.logo_url
    : localLogoExists
    ? localLogoPath
    : null;

  const w1Keys = Object.keys(w1QuestionLabels) as (keyof Worksheet1Answers)[];
  const w2Keys = Object.keys(w2QuestionLabels) as (keyof Worksheet2Answers)[];
  const w3Keys = Object.keys(w3QuestionLabels) as (keyof Worksheet3Answers)[];

  return (
    <Document
      title={`Donor Alignment Feedback — ${participant.name}`}
      author="Expert Fundraising"
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          {logoSrc ? (
            <Image src={logoSrc} style={styles.logo} />
          ) : (
            <Text style={styles.coverTitle}>{template.cover_title}</Text>
          )}
        </View>

        <Text style={styles.greeting}>Hi {participant.name},</Text>

        <Paragraphs text={template.intro_paragraph} style={styles.paragraph} />

        {/* Worksheet 1 */}
        <Text style={styles.sectionHeading}>{template.worksheet_1_heading}</Text>
        {w1Keys.map((key) => (
          <View key={key} style={styles.answerBlock}>
            <Text style={styles.questionLabel}>{w1QuestionLabels[key]}</Text>
            <Text style={styles.answerText}>{answers.worksheet_1[key]}</Text>
          </View>
        ))}
        <Text style={styles.feedbackHeading}>Alex&apos;s Response</Text>
        <Paragraphs text={feedback.worksheet_1} style={styles.feedbackText} />

        {/* Worksheet 2 */}
        <Text style={styles.sectionHeading}>{template.worksheet_2_heading}</Text>
        {w2Keys.map((key) => (
          <View key={key} style={styles.answerBlock}>
            <Text style={styles.questionLabel}>{w2QuestionLabels[key]}</Text>
            <Text style={styles.answerText}>{answers.worksheet_2[key]}</Text>
          </View>
        ))}
        <Text style={styles.feedbackHeading}>Alex&apos;s Response</Text>
        <Paragraphs text={feedback.worksheet_2} style={styles.feedbackText} />

        {/* Worksheet 3 */}
        <Text style={styles.sectionHeading}>{template.worksheet_3_heading}</Text>
        {w3Keys.map((key) => (
          <View key={key} style={styles.answerBlock}>
            <Text style={styles.questionLabel}>{w3QuestionLabels[key]}</Text>
            <Text style={styles.answerText}>{answers.worksheet_3[key]}</Text>
          </View>
        ))}
        <Text style={styles.feedbackHeading}>Alex&apos;s Response</Text>
        <Paragraphs
          text={ensureW3Closing(feedback.worksheet_3)}
          style={styles.feedbackText}
        />

        <Text style={styles.feedbackHeading}>Your Next Step</Text>
        <View style={styles.closing}>
          <Paragraphs
            text={template.closing_paragraph}
            style={styles.paragraph}
            renderUrls
          />
        </View>

        <View style={styles.footer}>
          {template.signature_block.split("\n").map((line, i) => (
            <Text key={i} style={styles.footerLine}>
              {line}
            </Text>
          ))}
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
