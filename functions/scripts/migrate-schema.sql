Execution failed. All statements are aborted. Details: pq: invalid input value for enum role_new: "MEMBER"-- =============================================================
-- migrate-schema.sql (trimmed) — run AFTER migrate-roles.ts
-- The company_feature_key and member_company_feature_key types
-- may already exist from prior attempts — skip them.
-- Uses CREATE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- =============================================================

-- 1. Replace role enum (create new, migrate column, drop old, rename)
CREATE TYPE "public"."role_new" AS ENUM('DEVELOPER','DEV_SITE_ADMIN','SITE_ADMIN','ADMIN','USER');
ALTER TABLE "member" ALTER COLUMN "role" TYPE "public"."role_new" USING "role"::text::"public"."role_new";
DROP TYPE "public"."role";
ALTER TYPE "public"."role_new" RENAME TO "role";
ALTER TABLE "member" ALTER COLUMN "role" SET DEFAULT 'USER'::"public"."role";

-- 2. New tables (with IF NOT EXISTS so they're safe to re-run)
CREATE TABLE IF NOT EXISTS "public"."company_member" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL, "company_id" uuid NOT NULL,
  "member_id" varchar(5) NOT NULL, "role_in_company" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE,
  FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "company_member_company_id_idx" ON "public"."company_member"("company_id");
CREATE INDEX IF NOT EXISTS "company_member_member_id_idx" ON "public"."company_member"("member_id");

CREATE TABLE IF NOT EXISTS "public"."company_feature" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL, "company_id" uuid NOT NULL,
  "feature_key" "public"."company_feature_key" NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by_id" varchar(5) NOT NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE,
  FOREIGN KEY ("updated_by_id") REFERENCES "member"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "company_feature_company_id_idx" ON "public"."company_feature"("company_id");
CREATE INDEX IF NOT EXISTS "company_feature_updated_by_id_idx" ON "public"."company_feature"("updated_by_id");

CREATE TABLE IF NOT EXISTS "public"."member_company_feature" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL, "company_id" uuid NOT NULL,
  "member_id" varchar(5) NOT NULL,
  "feature_key" "public"."member_company_feature_key" NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by_id" varchar(5) NOT NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE,
  FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE,
  FOREIGN KEY ("updated_by_id") REFERENCES "member"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "member_company_feature_company_id_idx" ON "public"."member_company_feature"("company_id");
CREATE INDEX IF NOT EXISTS "member_company_feature_member_id_idx" ON "public"."member_company_feature"("member_id");
CREATE INDEX IF NOT EXISTS "member_company_feature_updated_by_id_idx" ON "public"."member_company_feature"("updated_by_id");