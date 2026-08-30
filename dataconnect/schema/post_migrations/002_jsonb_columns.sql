-- Data Connect's SDL has no queryable JSON scalar (confirmed against the emulator per the
-- jsonb spike, plan §2) — these columns are generated as text; convert to real jsonb so
-- ledger-customEventWrite/-Read (raw `pg`, bypassing the generated SDK) can filter/aggregate.
--
-- Table/column names are Data Connect's generated Postgres identifiers (snake_case) —
-- confirmed against the actual `dataconnect:sql:migrate` DDL output.

ALTER TABLE "custom_event_detail"
  ALTER COLUMN data TYPE jsonb USING data::jsonb;

ALTER TABLE "event_type_definition"
  ALTER COLUMN "field_schema" TYPE jsonb USING "field_schema"::jsonb;

CREATE INDEX IF NOT EXISTS idx_custom_event_detail_data_gin
  ON "custom_event_detail" USING GIN (data);
