import {
  workflow,
  node,
  trigger,
  newCredential,
  expr,
} from "@n8n/workflow-sdk";

// Webhook: path /efh-delivery, header-auth via X-Webhook-Secret
const approvalWebhook = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "Approval Webhook",
    position: [240, 304],
    parameters: {
      httpMethod: "POST",
      path: "efh-delivery",
      authentication: "headerAuth",
      options: {},
    },
    credentials: {
      httpHeaderAuth: newCredential("EFH Webhook Secret"),
    },
  },
  output: [
    {
      body: {
        participantId: "00000000-0000-0000-0000-000000000000",
        participantName: "Jane Fundraiser",
        participantEmail: "jane@example.com",
        callbackUrl: "https://example.com/api/delivery-callback",
        pdfBase64: "JVBERi0xLjMK...",
        pdfFilename: "Donor Alignment Feedback — Jane Fundraiser.pdf",
      },
    },
  ],
});

// Decode pdfBase64 to a binary file on property `data`
const decodePdf = node({
  type: "n8n-nodes-base.convertToFile",
  version: 1.1,
  config: {
    name: "Decode PDF From Base64",
    position: [544, 304],
    parameters: {
      operation: "toBinary",
      sourceProperty: "body.pdfBase64",
      binaryPropertyName: "data",
      options: {
        fileName: expr("{{ $json.body.pdfFilename }}"),
        mimeType: "application/pdf",
      },
    },
  },
  output: [{}],
});

// Send email with PDF attachment
const sendFeedbackEmail = node({
  type: "n8n-nodes-base.gmail",
  version: 2.2,
  config: {
    name: "Send Feedback Email",
    position: [848, 304],
    parameters: {
      resource: "message",
      operation: "send",
      sendTo: expr('{{ $("Approval Webhook").item.json.body.participantEmail }}'),
      subject:
        "Your personalized feedback — Foundations of Donor Alignment",
      emailType: "html",
      message: expr(
        'Hi {{ $("Approval Webhook").item.json.body.participantName }},<br><br>' +
          "Thank you for completing the <em>Foundations of Donor Alignment</em> course. " +
          "Your personalized feedback from Alex is attached as a PDF.<br><br>" +
          "If you have questions, reply to this email or reach us at support@expertfundraising.org.<br><br>" +
          "— Expert Fundraising"
      ),
      options: {
        appendAttribution: false,
        attachmentsUi: {
          attachmentsBinary: [{ property: "data" }],
        },
        senderName: "Expert Fundraising",
        replyTo: "support@expertfundraising.org",
      },
    },
    credentials: {
      gmailOAuth2: newCredential("EFH Gmail"),
    },
  },
  output: [{ id: "msg-id", threadId: "thread-id" }],
});

// Notify the app that delivery completed
const notifyAppSent = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Notify App: Sent",
    position: [1152, 304],
    parameters: {
      method: "POST",
      url: expr('{{ $("Approval Webhook").item.json.body.callbackUrl }}'),
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      sendHeaders: true,
      specifyHeaders: "keypair",
      headerParameters: {
        parameters: [{ name: "Content-Type", value: "application/json" }],
      },
      sendBody: true,
      contentType: "json",
      specifyBody: "keypair",
      bodyParameters: {
        parameters: [
          {
            name: "participantId",
            value: expr(
              '{{ $("Approval Webhook").item.json.body.participantId }}'
            ),
          },
          { name: "status", value: "sent" },
        ],
      },
      options: {},
    },
    credentials: {
      httpHeaderAuth: newCredential("EFH Webhook Secret"),
    },
  },
  output: [{ success: true }],
});

export default workflow("7KA1rR3pxTOlQfhh", "EFH — Deliver Feedback PDF")
  .add(approvalWebhook)
  .to(decodePdf)
  .to(sendFeedbackEmail)
  .to(notifyAppSent);
