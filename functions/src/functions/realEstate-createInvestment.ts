import { randomUUID } from "node:crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { requireFeatureEnabled, requireMemberFeatureEnabled } from "../lib/organizationFeatureCheck";
import { driveOAuthClientSecret, driveOAuthRefreshToken, findOrCreateFolder, uploadDealFile } from "../lib/dealsDrive";
import { fields, image, sheetId, snake } from "../lib/realEstateInputs";
import { withTransaction } from "../lib/dataconnect-admin";
import { recomputeRealEstateRollups } from "../lib/realEstateRollups";
export const realEstateCreateInvestment = onCall({ timeoutSeconds: 300, secrets: [driveOAuthClientSecret, driveOAuthRefreshToken] }, async (request) => {
    const caller = await requireAdmin(request);
    await requireFeatureEnabled(caller, "REAL_ESTATE");
    await requireMemberFeatureEnabled(caller.memberId, caller, "REAL_ESTATE_MANAGEMENT");
    const parsed = fields.extend({ brochure: image.optional() }).safeParse(request.data);
    if (!parsed.success)
        throw new HttpsError("invalid-argument", parsed.error.message);
    const { brochure, ...values } = parsed.data;
    if (values.kind !== "UNDER_CONSTRUCTION")
        throw new HttpsError("invalid-argument", "Rental creation is available in phase 2.");
    if (values.currency === 'USD' && values.defaultFxRateToUsd !== 1)
        throw new HttpsError("invalid-argument", "USD exchange rate must be 1.");
    const parent = process.env.REAL_ESTATE_DRIVE_ROOT_FOLDER_ID;
    if (!parent)
        throw new HttpsError("failed-precondition", "Configure REAL_ESTATE_DRIVE_ROOT_FOLDER_ID.");
    const spreadsheetId = sheetId(values.transactionSheetUrl);
    const id = randomUUID();
    await withTransaction(async (client) => {
        // Serialize creates by natural key before doing any Drive work.
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [values.name]);
        if ((await client.query("SELECT id FROM real_estate_investment WHERE name=$1", [values.name])).rowCount)
            throw new HttpsError("already-exists", "Investment name already exists.");
        const folder = await findOrCreateFolder(parent, values.name);
        const file = brochure ? await uploadDealFile(folder, brochure.filename, brochure.mimeType, Buffer.from(brochure.contentBase64, 'base64')) : null;
        const data = { ...values, sheetConfig: JSON.stringify(values.sheetConfig ?? {}), transactionSheetId: spreadsheetId, driveFolderId: folder, driveFolderUrl: `https://drive.google.com/drive/folders/${folder}`, brochureDriveFileId: file?.driveFileId ?? null, brochureDriveUrl: file?.driveUrl ?? null };
        const keys = Object.keys(data);
        await client.query(`INSERT INTO real_estate_investment (id,${keys.map(snake).join(',')},created_by_id,created_at) VALUES ($1,${keys.map((_, i) => '$' + (i + 2)).join(',')},$${keys.length + 2},now())`, [id, ...Object.values(data), caller.memberId]);
    });
    await recomputeRealEstateRollups();
    return { investmentId: id };
});
