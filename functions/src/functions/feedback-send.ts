import { onCall, HttpsError } from "firebase-functions/v2/https";
import { sendEmail } from "../lib/gmail";
import { driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";

// Sends member feedback to the configured recipient using the same OAuth identity
// that already has gmail.send scope. Called from the member-facing Feedback button.
export interface FeedbackSendInput {
  name: string;
  comment: string;
}

export interface FeedbackSendOutput {
  sent: boolean;
}

export const feedbackSend = onCall<FeedbackSendInput, Promise<FeedbackSendOutput>>(
  { secrets: [driveOAuthClientSecret, driveOAuthRefreshToken] },
  async (request) => {
    const { name, comment } = request.data;
    if (!name || !comment) {
      throw new HttpsError("invalid-argument", "Name and comment are required.");
    }

    try {
      await sendEmail({
        to: "angelstarventures@gmail.com",
        subject: `Feedback from ${name}`,
        body: comment,
      });
    } catch (err) {
      console.error("feedbackSend: email send failed", err);
      throw new HttpsError(
        "internal",
        "Could not send the email. The configured email account may not have granted email-send permission yet, or the OAuth credentials need to be refreshed."
      );
    }

    return { sent: true };
  }
);