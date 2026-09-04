-- Applied by scripts/apply-post-migrations.js after every `firebase dataconnect:sql:migrate`.
-- schema.gql's @default(value: BALANCED) on company_update_detail.viewpoint_scenario only
-- exists so the ADD COLUMN NOT NULL step succeeds against existing rows — it's an arbitrary
-- placeholder, not a real answer. Every row's viewpoint_analysis.scenario should equal its own
-- ledger entry's real scenario (that's what "the specific ledger risk profile being analyzed"
-- means for a CompanyUpdate drafted per-scenario), so correct it here instead of leaving the
-- placeholder in place. Safe to re-run: idempotent, and matches what new rows already get from
-- the write path.

UPDATE "company_update_detail" cud
SET "viewpoint_scenario" = le.scenario
FROM "ledger_entry" le
WHERE le.id = cud."ledger_entry_id" AND cud."viewpoint_scenario" IS DISTINCT FROM le.scenario;
