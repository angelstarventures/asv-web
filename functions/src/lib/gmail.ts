import { google } from "googleapis";
import { driveOAuthClientSecret, driveOAuthRefreshToken } from "./dealsDrive";
import { tenantConfig } from "./tenantConfig";

// Reuses the SAME OAuth-delegated identity as dealsDrive.ts — one refresh token, requested with
// drive.file + gmail.send together via scripts/get-drive-oauth-token.js, rather than a second
// Google account/credential set. Sending email as this account requires that refresh token to
// actually carry the gmail.send scope (granted via a one-time re-consent — see that script's
// own header comment); until that's done, calls here fail with an insufficient-scope error from
// Google, not from this code.

// Name used in the From header; sourced from tenant config so a new deployment identifies
// itself correctly without forking this file.
const FROM_ADDRESS = tenantConfig.fromAddress;

function getGmailClient() {
  const clientId = process.env.DRIVE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("DRIVE_OAUTH_CLIENT_ID is not set.");
  }
  const auth = new google.auth.OAuth2(clientId, driveOAuthClientSecret.value());
  auth.setCredentials({ refresh_token: driveOAuthRefreshToken.value() });
  return google.gmail({ version: "v1", auth });
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sendEmail(input: { to: string; subject: string; body: string }): Promise<void> {
  const gmail = getGmailClient();
  const mime = [
    `From: ${FROM_ADDRESS}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    input.body,
  ].join("\r\n");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: base64UrlEncode(mime) },
  });
}
