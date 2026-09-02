// One-off, interactive: run once to obtain a refresh token for a real (non-Workspace) Google
// account, since a bare service account has no Drive storage quota and Shared Drives require
// Workspace. Opens a local loopback listener, prints a consent URL for the human to open, and
// exchanges the resulting code for a refresh token — which is what lets Cloud Functions later
// call the Drive API AS that account (using their real personal storage quota), without ever
// storing their password.
//
// Usage: node scripts/get-drive-oauth-token.js <clientId> <clientSecret>
const http = require("node:http");
const { OAuth2Client } = require("google-auth-library");

const [clientId, clientSecret] = process.argv.slice(2);
if (!clientId || !clientSecret) {
  console.error("Usage: node scripts/get-drive-oauth-token.js <clientId> <clientSecret>");
  process.exit(1);
}

const PORT = 8085;
const redirectUri = `http://127.0.0.1:${PORT}`;
const client = new OAuth2Client(clientId, clientSecret, redirectUri);

const authUrl = client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive.file"],
});

console.log("\nOpen this URL, log in as the Drive-owner account, and approve access:\n");
console.log(authUrl);
console.log("\nWaiting for the redirect back to this script...\n");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, redirectUri);
    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400).end("No code in redirect.");
      return;
    }
    const { tokens } = await client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/plain" }).end("Done — you can close this tab.");
    console.log("Refresh token:", tokens.refresh_token ?? "(none returned — see note below)");
    console.log("Access token (short-lived, not needed):", tokens.access_token ? "(received)" : "(none)");
    if (!tokens.refresh_token) {
      console.log(
        "\nNo refresh_token was returned — this happens if you've already authorized this " +
          "exact client before without revoking it. Revoke access at " +
          "https://myaccount.google.com/permissions for this app, then re-run this script."
      );
    }
    server.close();
  } catch (err) {
    res.writeHead(500).end("Token exchange failed — see the terminal.");
    console.error(err);
    server.close();
    process.exitCode = 1;
  }
});

server.listen(PORT);
