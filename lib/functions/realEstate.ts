import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";
// Contracts are duplicated across independently deployed frontend/functions codebases.
export interface InvestmentFields {
    name: string;
    kind: 'UNDER_CONSTRUCTION' | 'RENTAL';
    status?: 'ACTIVE' | 'COMPLETED' | 'RENTED_INTERIM' | 'SOLD' | 'WRITTEN_OFF' | 'ARCHIVED';
    currency: string;
    defaultFxRateToUsd: number;
    carryPercent: number;
    totalPropertyCost?: number | null;
    firstInvestmentDate?: string | null;
    estimatedCompletionDate?: string | null;
    actualCompletionDate?: string | null;
    saleDate?: string | null;
    salePrice?: number | null;
    scheduleDocUrl: string;
    transactionSheetUrl: string;
    developerName?: string;
    projectName?: string;
    locationLabel?: string;
    unitIdentifier?: string;
    publicBlurb?: string;
    showPublicly: boolean;
    sheetConfig?: SheetConfig;
}
export interface SheetConfig {
    hubAliases?: string[];
    developerAliases?: string[];
    investorColumnMap?: Record<string, string>;
    columnOverrides?: Record<string, string>;
    typeRules?: {
        contains: string;
        type: 'MEMBER_CONTRIBUTION' | 'DEVELOPER_PAYMENT' | 'ACQUISITION_COST' | 'FEE_OR_CHARGE' | 'DISTRIBUTION' | 'FX_ADJUSTMENT';
    }[];
}
export interface BrochureFile {
    filename: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    contentBase64: string;
}
export interface SetRealEstateSharesInput {
    investmentId: string;
    effectiveFrom: string;
    shares: {
        memberId: string;
        shareUnits: number;
        committedAmount?: number | null;
    }[];
}
export interface RealEstateSheetSyncInput {
    investmentId: string;
    previewToken: string;
    acknowledgeWarnings: boolean;
}
export interface RecordRealEstateEntryInput {
    investmentId: string;
    type: 'VALUATION_MARK' | 'SHARE_TRANSFER' | 'SALE' | 'DISTRIBUTION' | 'CARRY' | 'STATUS_UPDATE';
    eventDate: string;
    amountNative: number;
    description: string;
    fxRateToUsd: number;
    fromMemberId?: string;
    toMemberId?: string;
    shareUnits?: number;
    sellingCosts?: number;
    docUrl?: string;
}
export interface SheetPreview {
    token: string;
    currency: string;
    revision: string | null;
    errors: string[];
    unresolvedInvestorLabels: string[];
    proposedInvestorColumnMap: Record<string, string>;
    warnings: {
        rowNumber: number;
        kind: string;
        rawValue: unknown;
        correctedValue: unknown;
        explanation: string;
    }[];
    rows: {
        rowKey: string;
        rowNumber: number;
        description: string;
        classification: string;
        existingId: string | null;
    }[];
    orphaned: {
        rowKey: string;
        classification: 'ORPHANED';
        existingId: string;
    }[];
    reconciliation: {
        memberId: string;
        expected: number;
        actual: number;
        matches: boolean;
    }[];
}
async function call<I, O>(name: string, data: I): Promise<O> {
    // Omit absent optional fields; the callable encoder otherwise turns undefined into null.
    const payload=JSON.parse(JSON.stringify(data)) as I;
    return (await httpsCallable<I, O>(functions, name, { timeout: 300000 })(payload)).data;
}
export const realEstateCreateInvestment = (data: InvestmentFields & {
    brochure?: BrochureFile;
}) => call<typeof data, {
    investmentId: string;
}>('realEstateCreateInvestment', data);
export const realEstateUpdateInvestment = (data: {
    investmentId: string;
    fields: Partial<InvestmentFields>;
}) => call<typeof data, {
    ok: true; sheetConfig: string;
}>('realEstateUpdateInvestment', data);
export const realEstateSetShares = (data: SetRealEstateSharesInput) => call<typeof data, {
    ok: true;
}>('realEstateSetShares', data);
export const realEstateImportSchedule = (data: {
    investmentId: string;
    text: string;
}) => call<typeof data, {
    imported: number;
}>('realEstateImportSchedule', data);
export const realEstateSheetPreview = (data: {
    investmentId: string;
}) => call<typeof data, SheetPreview>('realEstateSheetPreview', data);
export const realEstateSheetSync = (data: RealEstateSheetSyncInput) => call<typeof data, {
    imported: number;
    corrected: number;
}>('realEstateSheetSync', data);
export const realEstateRecordEntry = (data: RecordRealEstateEntryInput) => call<typeof data, {
    ok: true;
}>('realEstateRecordEntry', data);
export const realEstateRecomputeRollups = () => call<Record<string, never>, {
    ok: true;
}>('realEstateRecomputeRollups', {});
