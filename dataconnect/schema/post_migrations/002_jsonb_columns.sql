-- Data Connect's SDL has no queryable JSON scalar (confirmed against the emulator per the
-- jsonb spike, plan §2) — these columns are generated as text; convert to real jsonb so
-- ledger-customEventWrite/-Read (raw `pg`, bypassing the generated SDK) can filter/aggregate.
--
-- Table/column names are Data Connect's generated Postgres identifiers (snake_case) —
-- confirmed against the actual `dataconnect:sql:migrate` DDL output.
--
-- Gotcha: since schema.gql doesn't declare this jsonb conversion, EVERY future
-- `dataconnect:sql:migrate`/`deploy` will propose reverting these columns back to text and
-- dropping the GIN index below fails that revert (text has no default GIN opclass). Before
-- re-deploying dataconnect after any schema.gql change, run
-- `node scripts/drop-gin-index.js` first, let the deploy revert this migration, then
-- re-run `node scripts/apply-post-migrations.js` to restore it.

ALTER TABLE "custom_event_detail"
  ALTER COLUMN data TYPE jsonb USING data::jsonb;

ALTER TABLE "event_type_definition"
  ALTER COLUMN "field_schema" TYPE jsonb USING "field_schema"::jsonb;

CREATE INDEX IF NOT EXISTS idx_custom_event_detail_data_gin
  ON "custom_event_detail" USING GIN (data);
