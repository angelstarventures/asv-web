// One-time (re-)consent script: mints a new refresh token for the angelstarventures@gmail.com
// OAuth identity, requesting ALL scopes together (full `drive` — broadened from `drive.file`,
// which only ever let the app see files/folders it created itself, confirmed empirically: a
// folder created directly in Drive was invisible to the API even though it sat right inside a
// folder the app already had access to — plus gmail.send, needed for the dues-reminder email
// feature). Google issues one refresh token covering whatever scopes were consented to in that
// flow, so this must be run once, granting all of them — running it again with a narrower list
// would silently drop whichever scope wasn't requested this time.
//
// Usage:
//   1. node scripts/get-drive-oauth-token.js
//   2. Open the printed URL in a browser SIGNED IN AS angelstarventures@gmail.com (not your own
//      account) and approve both permissions.
//   3. This script prints the new refresh token — paste it into:
//      firebase functions:secrets:set DRIVE_OAUTH_REFRESH_TOKEN
//      (or hand it back to Claude to run that command for you).
const http = require("node:http");
const { google } = require("googleapis");

const CLIENT_ID = "345219246308-nm70j7ldmcsvltts4shas5v7phgcc5te.apps.googleusercontent.com";
const CLIENT_SECRET = process.argv[2];
const PORT = 8091;
const REDIRECT_URI = `http://localhost:${PORT}`;

if (!CLIENT_SECRET) {
  console.error("Usage: node scripts/get-drive-oauth-token.js <DRIVE_OAUTH_CLIENT_SECRET>");
  console.error('Get the secret value with: firebase functions:secrets:access DRIVE_OAUTH_CLIENT_SECRET');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // forces a fresh refresh token even if this account consented before
  scope: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/gmail.send"],
});

console.log("\nOpen this URL, signed in as angelstarventures@gmail.com:\n");
console.log(authUrl);
console.log(`\nWaiting for the redirect back to ${REDIRECT_URI} ...`);
console.log(
  'If Google shows "Error 400: redirect_uri_mismatch", this OAuth client is a "Web application" ' +
    `type that only allows pre-registered redirect URIs — add ${REDIRECT_URI} to it in Google Cloud ` +
    "Console (APIs & Services > Credentials > this OAuth client > Authorized redirect URIs) and re-run."
);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  if (!code) {
    res.end("No authorization code received. Check the terminal.");
    return;
  }
  res.end("Success — you can close this tab and return to the terminal.");
  server.close();

  const { tokens } = await oauth2Client.getToken(code);
  console.log("\nNew refresh token (store this in DRIVE_OAUTH_REFRESH_TOKEN):\n");
  console.log(tokens.refresh_token);
  console.log("\nGranted scopes:", tokens.scope);
});

server.listen(PORT);
