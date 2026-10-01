-- Applied by scripts/apply-post-migrations.js after every `firebase dataconnect:sql:migrate`.
-- Redirects the feature-toggle system from the portfolio Company table to the new
-- Organization table (the angel fund/tenant itself) — "company-level features" in the
-- permissions-overhaul plan means the angel investing group, not a portfolio startup.
-- Hand-applied here (brownfield-protected database) rather than via
-- `dataconnect:sql:migrate --force`; DDL below matches `firebase dataconnect:sql:diff`'s
-- output exactly, made idempotent (IF NOT EXISTS / IF EXISTS) for safe re-runs.
-- company_feature/member_company_feature have zero rows and zero remaining consumers —
-- safe to drop.

-- Plain CREATE TYPE (not DO $$ ... $$) — apply-post-migrations.js's statement splitter is a
-- naive `;`-split and breaks dollar-quoted blocks; relies on the script's existing
-- duplicate_object (42710) skip-on-rerun handling instead.
CREATE TYPE "public"."organization_feature_key" AS ENUM(
  'DEALS', 'AI_DEAL_MATCHING', 'AI_CHAT', 'AI_DOCUMENT_ANALYSIS',
  'MULTIPLE_LEDGERS', 'AI_MODEL_PROMPT_CONFIG', 'AI_MODEL_SELECTION',
  'MEMBERSHIP_DUES', 'COSTS'
);

CREATE TYPE "public"."member_organization_feature_key" AS ENUM(
  'DEALS_SCREENING', 'DEAL_VIEW', 'COMPANY_MANAGEMENT', 'AI_DEAL_MATCHING',
  'AI_CHAT', 'AI_DOCUMENT_ANALYSIS', 'MULTIPLE_LEDGERS', 'MEMBER_MANAGEMENT',
  'MEMBER_PORTFOLIO_VIEW', 'AI_MODEL_PROMPT_CONFIG', 'AI_MODEL_SELECTION',
  'MEMBERSHIP_DUES', 'COSTS'
);

CREATE TABLE IF NOT EXISTS "public"."organization_feature" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4 (),
  "organization_id" uuid NOT NULL,
  "updated_by_id" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "feature_key" "public"."organization_feature_key" NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "organization_feature_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization" ("id") ON DELETE CASCADE,
  CONSTRAINT "organization_feature_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "organization_feature_organizationId_idx" ON "public"."organization_feature" ("organization_id");
CREATE INDEX IF NOT EXISTS "organization_feature_updatedById_idx" ON "public"."organization_feature" ("updated_by_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_organization_feature_key" ON "public"."organization_feature" ("organization_id", "feature_key");

CREATE TABLE IF NOT EXISTS "public"."member_organization_feature" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4 (),
  "member_id" text NOT NULL,
  "organization_id" uuid NOT NULL,
  "updated_by_id" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "feature_key" "public"."member_organization_feature_key" NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "member_organization_feature_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE,
  CONSTRAINT "member_organization_feature_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization" ("id") ON DELETE CASCADE,
  CONSTRAINT "member_organization_feature_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "member_organization_feature_memberId_idx" ON "public"."member_organization_feature" ("member_id");
CREATE INDEX IF NOT EXISTS "member_organization_feature_organizationId_idx" ON "public"."member_organization_feature" ("organization_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_member_organization_feature_key" ON "public"."member_organization_feature" ("organization_id", "member_id", "feature_key");

DROP TABLE IF EXISTS "public"."company_feature";
DROP TABLE IF EXISTS "public"."member_company_feature";
DROP TYPE IF EXISTS "public"."company_feature_key";
DROP TYPE IF EXISTS "public"."member_company_feature_key";
