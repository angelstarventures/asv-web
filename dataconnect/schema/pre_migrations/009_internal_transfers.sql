-- Additive DDL for internal (member-to-member) transfers, carry fee lines and share lots.
-- Hand-derived from schema.gql in the style of Data Connect's generated DDL (see
-- pre_migrations/008_real_estate.sql); verify against `firebase dataconnect:sql:diff` before
-- applying. Touches no existing table. Follow with post_migrations/009_internal_transfers.sql.

ALTER TYPE "public"."ledger_entry_type" ADD VALUE 'INTERNAL_TRANSFER';

ALTER TYPE "public"."document_type" ADD VALUE 'TRANSFER_AGREEMENT';

CREATE TYPE "public"."transfer_side" AS ENUM ('SELLER', 'BUYER');

CREATE TYPE "public"."fee_kind" AS ENUM ('DD_LEAD_CARRY', 'MANAGEMENT_CARRY', 'LEGAL_COSTS', 'OTHER');

CREATE TYPE "public"."transfer_kind" AS ENUM ('SALE', 'REPLACEMENT');

CREATE TYPE "public"."lot_kind" AS ENUM ('OPENING', 'TRANSFER_IN', 'TRANSFER_OUT');

CREATE TABLE "public"."internal_transfer_detail" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ledger_entry_id" uuid NOT NULL, "doc_link" text NULL, "gross_gain" double precision NOT NULL, "kind" "public"."transfer_kind" NOT NULL DEFAULT 'SALE', "notes" text NULL, "reference_round_name" text NULL, "round_price_per_share" double precision NULL, "total_shares" double precision NOT NULL, "transfer_price_per_share" double precision NULL, PRIMARY KEY ("id"), CONSTRAINT "internal_transfer_detail_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entry" ("id") ON DELETE CASCADE);

CREATE INDEX "internal_transfer_detail_ledgerEntryId_idx" ON "public"."internal_transfer_detail" ("ledger_entry_id");

CREATE UNIQUE INDEX "internal_transfer_detail_ledgerEntryId_uidx" ON "public"."internal_transfer_detail" ("ledger_entry_id");

CREATE TABLE "public"."transfer_party" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ledger_entry_id" uuid NOT NULL, "member_id" text NOT NULL, "amount" double precision NOT NULL, "cost_basis_per_share" double precision NOT NULL, "fees_charged" double precision NULL, "gain" double precision NULL, "realized_gain" double precision NULL, "shares" double precision NOT NULL, "shares_held_before" double precision NULL, "side" "public"."transfer_side" NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "transfer_party_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entry" ("id") ON DELETE CASCADE, CONSTRAINT "transfer_party_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE);

CREATE INDEX "transfer_party_ledgerEntryId_idx" ON "public"."transfer_party" ("ledger_entry_id");

CREATE INDEX "transfer_party_memberId_idx" ON "public"."transfer_party" ("member_id");

CREATE TABLE "public"."fee_line" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "charged_to_member_id" text NULL, "ledger_entry_id" uuid NOT NULL, "recipient_id" text NULL, "amount" double precision NOT NULL, "kind" "public"."fee_kind" NOT NULL, "note" text NULL, "percent" double precision NULL, PRIMARY KEY ("id"), CONSTRAINT "fee_line_charged_to_member_id_fkey" FOREIGN KEY ("charged_to_member_id") REFERENCES "public"."member" ("id") ON DELETE SET NULL, CONSTRAINT "fee_line_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entry" ("id") ON DELETE CASCADE, CONSTRAINT "fee_line_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."member" ("id") ON DELETE SET NULL);

CREATE INDEX "fee_line_ledgerEntryId_idx" ON "public"."fee_line" ("ledger_entry_id");

CREATE INDEX "fee_line_recipientId_idx" ON "public"."fee_line" ("recipient_id");

CREATE INDEX "fee_line_chargedToMemberId_idx" ON "public"."fee_line" ("charged_to_member_id");

CREATE TABLE "public"."share_lot" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "member_id" text NOT NULL, "source_entry_id" uuid NULL, "acquired_date" date NOT NULL, "cost_basis" double precision NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "kind" "public"."lot_kind" NOT NULL, "shares" double precision NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "share_lot_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company" ("id") ON DELETE CASCADE, CONSTRAINT "share_lot_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE, CONSTRAINT "share_lot_source_entry_id_fkey" FOREIGN KEY ("source_entry_id") REFERENCES "public"."ledger_entry" ("id") ON DELETE SET NULL);

CREATE INDEX "share_lot_memberId_idx" ON "public"."share_lot" ("member_id");

CREATE INDEX "share_lot_companyId_idx" ON "public"."share_lot" ("company_id");

CREATE INDEX "share_lot_sourceEntryId_idx" ON "public"."share_lot" ("source_entry_id");
