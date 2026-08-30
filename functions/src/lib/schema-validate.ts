import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import portfolioSchema from "../../schema/asv_master_portfolio_schema.json";

// One canonical "is this record valid" function, shared by ledger-massImportDiff/-Commit
// and functions/scripts/migrate-legacy-data.ts (plan §3/§5) — never re-implemented per caller.
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateFn = ajv.compile(portfolioSchema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateLedgerRecord(record: unknown): ValidationResult {
  const valid = validateFn(record);
  if (valid) return { valid: true, errors: [] };

  const errors = (validateFn.errors ?? []).map(
    (e) => `${e.instancePath || "(root)"} ${e.message ?? "invalid"}`
  );
  return { valid: false, errors };
}
