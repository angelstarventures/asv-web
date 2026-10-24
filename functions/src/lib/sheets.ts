import { google } from "googleapis";
import { driveOAuthClientSecret, driveOAuthRefreshToken } from "./dealsDrive";
export async function readFirstTransactionSheet(spreadsheetId: string) {
    const auth = new google.auth.OAuth2(process.env.DRIVE_OAUTH_CLIENT_ID, driveOAuthClientSecret.value());
    auth.setCredentials({ refresh_token: driveOAuthRefreshToken.value() });
    const sheets = google.sheets({ version: "v4", auth });
    const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" });
    const title = meta.data.sheets?.[0]?.properties?.title;
    if (!title)
        throw new Error("Spreadsheet has no first tab.");
    const values = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${title.replace(/'/g, "''")}'!A1:ZZ`, valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER" });
    // Google-native Sheets may not expose headRevisionId; modifiedTime is a useful fallback.
    const revision = await google.drive({ version: "v3", auth }).files.get({ fileId: spreadsheetId, fields: "headRevisionId,modifiedTime" });
    return { grid: values.data.values ?? [], revision: revision.data.headRevisionId ?? revision.data.modifiedTime ?? null };
}
