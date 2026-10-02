-- Applied by scripts/apply-post-migrations.js after every `firebase dataconnect:sql:migrate`.
-- Introduces the Organization/OrganizationMember tables (the angel fund/tenant itself,
-- distinct from the portfolio Company table) and drops the now-unused company_member
-- table it replaces (zero rows, zero consumers — see the permissions-overhaul plan).
-- Hand-applied here rather than via `dataconnect:sql:migrate --force` because this is a
-- brownfield-protected database; DDL below matches `firebase dataconnect:sql:diff`'s output
-- exactly, made idempotent (IF NOT EXISTS / IF EXISTS) for safe re-runs.

CREATE TABLE IF NOT EXISTS "public"."organization" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4 (),
  "name" text NOT NULL,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "organization_name_uidx" ON "public"."organization" ("name");

CREATE TABLE IF NOT EXISTS "public"."organization_member" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4 (),
  "member_id" text NOT NULL,
  "organization_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "role_in_organization" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "organization_member_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE,
  CONSTRAINT "organization_member_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "organization_member_memberId_idx" ON "public"."organization_member" ("member_id");
CREATE INDEX IF NOT EXISTS "organization_member_organizationId_idx" ON "public"."organization_member" ("organization_id");

-- Seed the Organization row is handled by the bootstrap script (scripts/seed-organization.js)
-- so a new tenant can seed their own name. This file remains pure DDL.

DROP TABLE IF EXISTS "public"."company_member";
