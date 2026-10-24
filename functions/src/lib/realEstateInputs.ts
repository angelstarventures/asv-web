import { z } from "zod";
export const uuid = z.string().regex(/^(?:[a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})$/i).transform(s => s.replaceAll('-', '').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5'));
// Shared with startup investments: Member.id is varchar(5), never a property UUID.
export const memberId = z.string().regex(/^\d{5}$/, "Choose an existing five-digit Member.id.");
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s, "Invalid calendar date");
export const fields = z.object({
    name: z.string().trim().min(1).max(200), kind: z.enum(['UNDER_CONSTRUCTION', 'RENTAL']),
    status: z.enum(['ACTIVE', 'COMPLETED', 'RENTED_INTERIM', 'SOLD', 'WRITTEN_OFF', 'ARCHIVED']).default('ACTIVE'),
    currency: z.string().regex(/^[A-Z]{3}$/), defaultFxRateToUsd: z.number().positive(), carryPercent: z.number().min(0).max(100),
    firstInvestmentDate: day.nullable().optional(), estimatedCompletionDate: day.nullable().optional(), actualCompletionDate: day.nullable().optional(), saleDate: day.nullable().optional(),
    totalPropertyCost: z.number().nonnegative().nullable().optional(), salePrice: z.number().nonnegative().nullable().optional(),
    scheduleDocUrl: z.string().url(), transactionSheetUrl: z.string().url(),
    developerName: z.string().max(200).optional(), projectName: z.string().max(200).optional(), locationLabel: z.string().max(300).optional(), unitIdentifier: z.string().max(200).optional(), publicBlurb: z.string().max(4000).optional(), showPublicly: z.boolean(),
    sheetConfig: z.object({ hubAliases: z.array(z.string()).optional(), developerAliases: z.array(z.string()).optional(), investorColumnMap: z.record(memberId).optional(), columnOverrides: z.record(z.string()).optional(), typeRules: z.array(z.object({ contains: z.string().min(1), type: z.enum(['MEMBER_CONTRIBUTION', 'DEVELOPER_PAYMENT', 'ACQUISITION_COST', 'FEE_OR_CHARGE', 'DISTRIBUTION', 'FX_ADJUSTMENT']) })).optional() }).optional()
});
export const image = z.object({ filename: z.string().min(1).max(200), mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']), contentBase64: z.string().max(7000000) });
export function sheetId(url: string) {
    const u = new URL(url);
    if (u.hostname !== 'docs.google.com' || !/^\/spreadsheets\/d\/([\w-]+)/.test(u.pathname))
        throw new Error('Use a Google Sheets spreadsheet URL.');
    return /^\/spreadsheets\/d\/([\w-]+)/.exec(u.pathname)![1];
}
export const snake = (s: string) => s.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
