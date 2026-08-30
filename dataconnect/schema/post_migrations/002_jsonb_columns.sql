-- Data Connect's SDL has no queryable JSON scalar (confirmed against the emulator per the
-- jsonb spike, plan §2) — these columns are generated as text; convert to real jsonb so
-- ledger-customEventWrite/-Read (raw `pg`, bypassing the generated SDK) can filter/aggregate.

ALTER TABLE "CustomEventDetail"
  ALTER COLUMN data TYPE jsonb USING data::jsonb;

ALTER TABLE "EventTypeDefinition"
  ALTER COLUMN "fieldSchema" TYPE jsonb USING "fieldSchema"::jsonb;

CREATE INDEX IF NOT EXISTS idx_custom_event_detail_data_gin
  ON "CustomEventDetail" USING GIN (data);
