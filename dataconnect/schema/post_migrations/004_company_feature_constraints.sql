-- Applied by scripts/apply-post-migrations.ts after every `firebase dataconnect:sql:migrate`.
-- Adds unique constraints for feature-toggle tables and deduplication script.
-- The companyFeatures.ts Cloud Functions were using INSERT ... ON CONFLICT (id) which
-- cannot actually conflict (id is a fresh UUID on every insert), leading to duplicate
-- rows and non-deterministic reads. This adds the proper natural-key constraints.

-- Deduplicate company_feature: keep the most recently updated row per (company_id, feature_key)
DELETE FROM "company_feature" a
WHERE EXISTS (
  SELECT 1 FROM "company_feature" b
  WHERE a."company_id" = b."company_id"
    AND a."feature_key" = b."feature_key"
    AND a."id" < b."id"  -- keep the row with the larger UUID (arbitrary but deterministic)
);

-- Deduplicate member_company_feature: keep the most recently updated row per (company_id, member_id, feature_key)
DELETE FROM "member_company_feature" a
WHERE EXISTS (
  SELECT 1 FROM "member_company_feature" b
  WHERE a."company_id" = b."company_id"
    AND a."member_id" = b."member_id"
    AND a."feature_key" = b."feature_key"
    AND a."id" < b."id"
);

-- Add unique constraints (also creates indexes for query planning)
ALTER TABLE "company_feature"
  ADD CONSTRAINT uk_company_feature_key UNIQUE ("company_id", "feature_key");

ALTER TABLE "member_company_feature"
  ADD CONSTRAINT uk_member_company_feature_key UNIQUE ("company_id", "member_id", "feature_key");
