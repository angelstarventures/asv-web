-- Additive generated DDL for the brownfield ASV database.
-- Preserves existing startup schema, constraints, indexes and data.
-- Follow with post_migrations/008_real_estate.sql.

CREATE TYPE "public"."real_estate_kind" AS ENUM ('UNDER_CONSTRUCTION', 'RENTAL');

CREATE TYPE "public"."real_estate_ledger_entry_type" AS ENUM ('MEMBER_CONTRIBUTION', 'DEVELOPER_PAYMENT', 'ACQUISITION_COST', 'CAPITAL_IMPROVEMENT', 'FEE_OR_CHARGE', 'VALUATION_MARK', 'SHARE_TRANSFER', 'SALE', 'DISTRIBUTION', 'CARRY', 'FX_ADJUSTMENT', 'RENTAL_PERIOD', 'RENTAL_EXPENSE', 'DEPRECIATION', 'ESCROW_HOLD', 'ESCROW_RELEASE', 'STATUS_UPDATE');

CREATE TYPE "public"."real_estate_occupancy" AS ENUM ('RENTED', 'PARTIALLY_RENTED', 'VACANT', 'NOT_APPLICABLE');

CREATE TYPE "public"."real_estate_status" AS ENUM ('ACTIVE', 'COMPLETED', 'RENTED_INTERIM', 'SOLD', 'WRITTEN_OFF', 'ARCHIVED');

ALTER TYPE "public"."member_organization_feature_key" ADD VALUE 'REAL_ESTATE_VIEW' BEFORE 'DEALS_SCREENING';

ALTER TYPE "public"."member_organization_feature_key" ADD VALUE 'REAL_ESTATE_MANAGEMENT' AFTER 'REAL_ESTATE_VIEW';

ALTER TYPE "public"."organization_feature_key" ADD VALUE 'REAL_ESTATE' BEFORE 'DEALS';

CREATE TABLE "public"."real_estate_investment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_by_id" text NOT NULL, "actual_completion_date" date NULL, "brochure_drive_file_id" text NULL, "brochure_drive_url" text NULL, "carry_percent" double precision NOT NULL DEFAULT 5::double precision, "created_at" timestamptz NOT NULL, "currency" text NOT NULL DEFAULT 'USD', "default_fx_rate_to_usd" double precision NOT NULL DEFAULT 1::double precision, "developer_name" text NULL, "drive_folder_id" text NULL, "drive_folder_url" text NULL, "estimated_completion_date" date NULL, "first_investment_date" date NULL, "kind" "public"."real_estate_kind" NOT NULL, "location_label" text NULL, "name" text NOT NULL, "project_name" text NULL, "public_blurb" text NULL, "sale_date" date NULL, "sale_price" double precision NULL, "schedule_doc_url" text NULL, "sheet_config" text NULL, "show_publicly" boolean NOT NULL DEFAULT false, "status" "public"."real_estate_status" NOT NULL DEFAULT 'ACTIVE'::"public"."real_estate_status", "total_property_cost" double precision NULL, "transaction_sheet_id" text NULL, "transaction_sheet_url" text NULL, "unit_identifier" text NULL, PRIMARY KEY ("id"), CONSTRAINT "real_estate_investment_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE);

CREATE INDEX "real_estate_investment_createdById_idx" ON "public"."real_estate_investment" ("created_by_id");

CREATE UNIQUE INDEX "real_estate_investment_name_uidx" ON "public"."real_estate_investment" ("name");

CREATE TABLE "public"."real_estate_ledger_entry" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_by_id" text NOT NULL, "investment_id" uuid NOT NULL, "member_id" text NULL, "reverses_entry_id" uuid NULL, "amount_native" double precision NULL, "amount_usd" double precision NOT NULL, "cash_direction" integer NOT NULL DEFAULT 0, "counterparty" text NULL, "created_at" timestamptz NOT NULL, "currency" text NOT NULL, "description" text NULL, "event_date" date NOT NULL, "funded_outside_hub" boolean NOT NULL DEFAULT false, "fx_rate_to_usd" double precision NULL, "installment_code" text NULL, "needs_review" boolean NOT NULL DEFAULT false, "source_sheet_row_hash" text NULL, "source_sheet_row_key" text NULL, "source_sheet_row_number" integer NULL, "type" "public"."real_estate_ledger_entry_type" NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "real_estate_ledger_entry_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE, CONSTRAINT "real_estate_ledger_entry_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "public"."real_estate_investment" ("id") ON DELETE CASCADE, CONSTRAINT "real_estate_ledger_entry_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."member" ("id") ON DELETE SET NULL, CONSTRAINT "real_estate_ledger_entry_reverses_entry_id_fkey" FOREIGN KEY ("reverses_entry_id") REFERENCES "public"."real_estate_ledger_entry" ("id") ON DELETE SET NULL);

CREATE INDEX "real_estate_ledger_entry_investmentId_eventDate_idx" ON "public"."real_estate_ledger_entry" ("investment_id", "event_date" DESC);

CREATE INDEX "real_estate_ledger_entry_createdById_idx" ON "public"."real_estate_ledger_entry" ("created_by_id");

CREATE INDEX "real_estate_ledger_entry_investmentId_idx" ON "public"."real_estate_ledger_entry" ("investment_id");

CREATE INDEX "real_estate_ledger_entry_memberId_idx" ON "public"."real_estate_ledger_entry" ("member_id");

CREATE INDEX "real_estate_ledger_entry_reversesEntryId_idx" ON "public"."real_estate_ledger_entry" ("reverses_entry_id");

CREATE INDEX "real_estate_ledger_entry_sourceSheetRowHash_idx" ON "public"."real_estate_ledger_entry" ("source_sheet_row_hash");

CREATE INDEX "real_estate_ledger_entry_sourceSheetRowKey_idx" ON "public"."real_estate_ledger_entry" ("source_sheet_row_key");

CREATE INDEX "real_estate_ledger_entry_type_idx" ON "public"."real_estate_ledger_entry" ("type");

CREATE TABLE "public"."real_estate_allocation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ledger_entry_id" uuid NOT NULL, "member_id" text NOT NULL, "amount_native" double precision NULL, "amount_usd" double precision NOT NULL, "cash_direction" integer NOT NULL DEFAULT 0, PRIMARY KEY ("id"), CONSTRAINT "real_estate_allocation_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."real_estate_ledger_entry" ("id") ON DELETE CASCADE, CONSTRAINT "real_estate_allocation_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE);

CREATE INDEX "real_estate_allocation_ledgerEntryId_idx" ON "public"."real_estate_allocation" ("ledger_entry_id");

CREATE INDEX "real_estate_allocation_memberId_idx" ON "public"."real_estate_allocation" ("member_id");

CREATE TABLE "public"."real_estate_member_share" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_by_id" text NOT NULL, "investment_id" uuid NOT NULL, "member_id" text NOT NULL, "source_ledger_entry_id" uuid NULL, "superseded_by_id" uuid NULL, "committed_amount" double precision NULL, "created_at" timestamptz NOT NULL, "effective_from" date NOT NULL, "share_units" double precision NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "real_estate_member_share_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE, CONSTRAINT "real_estate_member_share_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "public"."real_estate_investment" ("id") ON DELETE CASCADE, CONSTRAINT "real_estate_member_share_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE, CONSTRAINT "real_estate_member_share_source_ledger_entry_id_fkey" FOREIGN KEY ("source_ledger_entry_id") REFERENCES "public"."real_estate_ledger_entry" ("id") ON DELETE SET NULL, CONSTRAINT "real_estate_member_share_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."real_estate_member_share" ("id") ON DELETE SET NULL);

CREATE INDEX "real_estate_member_share_createdById_idx" ON "public"."real_estate_member_share" ("created_by_id");

CREATE INDEX "real_estate_member_share_investmentId_idx" ON "public"."real_estate_member_share" ("investment_id");

CREATE INDEX "real_estate_member_share_sourceLedgerEntryId_idx" ON "public"."real_estate_member_share" ("source_ledger_entry_id");

CREATE INDEX "real_estate_member_share_supersededById_idx" ON "public"."real_estate_member_share" ("superseded_by_id");

CREATE INDEX "real_estate_member_share_memberId_idx" ON "public"."real_estate_member_share" ("member_id");

CREATE TABLE "public"."real_estate_payment_schedule" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "investment_id" uuid NOT NULL, "amount_due" double precision NOT NULL, "due_date" date NULL, "event_date" date NULL, "installment_code" text NULL, "milestone_label" text NULL, "percent" double precision NULL, "sort_order" integer NOT NULL, "total" double precision NOT NULL, "vat" double precision NOT NULL DEFAULT 0::double precision, PRIMARY KEY ("id"), CONSTRAINT "real_estate_payment_schedule_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "public"."real_estate_investment" ("id") ON DELETE CASCADE);

CREATE INDEX "real_estate_payment_schedule_investmentId_idx" ON "public"."real_estate_payment_schedule" ("investment_id");

CREATE TABLE "public"."real_estate_rental_period_detail" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ledger_entry_id" uuid NOT NULL, "escrow_held" double precision NULL, "gross_rent" double precision NULL, "maintenance" double precision NULL, "manager_bonus_fee" double precision NULL, "manager_fixed_fee" double precision NULL, "occupancy" "public"."real_estate_occupancy" NOT NULL, "period_end" date NOT NULL, "period_start" date NOT NULL, "property_tax" double precision NULL, "qualitative_update" text NULL, "report_doc_url" text NULL, "state_subsidy_rent" double precision NULL, PRIMARY KEY ("id"), CONSTRAINT "real_estate_rental_period_detail_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."real_estate_ledger_entry" ("id") ON DELETE CASCADE);

CREATE INDEX "real_estate_rental_period_detail_ledgerEntryId_idx" ON "public"."real_estate_rental_period_detail" ("ledger_entry_id");

CREATE UNIQUE INDEX "real_estate_rental_period_detail_ledgerEntryId_uidx" ON "public"."real_estate_rental_period_detail" ("ledger_entry_id");

CREATE TABLE "public"."real_estate_rental_terms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "investment_id" uuid NOT NULL, "agreement_doc_url" text NULL, "capital_gains_carry_percent" double precision NULL, "depreciable_basis" double precision NULL, "depreciation_annual_percent" double precision NULL, "depreciation_start_date" date NULL, "distribution_cadence" text NULL DEFAULT 'QUARTERLY', "escrow_percent" double precision NULL, "manager_bonus_percent" double precision NULL, "manager_monthly_fee" double precision NULL, "projected_monthly_income" double precision NULL, "projected_monthly_maintenance" double precision NULL, "projected_monthly_property_tax" double precision NULL, "property_manager_name" text NULL, "rental_carry_percent" double precision NULL, PRIMARY KEY ("id"), CONSTRAINT "real_estate_rental_terms_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "public"."real_estate_investment" ("id") ON DELETE CASCADE);

CREATE INDEX "real_estate_rental_terms_investmentId_idx" ON "public"."real_estate_rental_terms" ("investment_id");

CREATE UNIQUE INDEX "real_estate_rental_terms_investmentId_uidx" ON "public"."real_estate_rental_terms" ("investment_id");

CREATE TABLE "public"."real_estate_rollup_cache" ("investment_key" text NOT NULL, "investment_id" uuid NULL, "capital_committed_usd" double precision NOT NULL, "capital_deployed_usd" double precision NOT NULL, "computed_at" timestamptz NOT NULL, "cumulative_net_cash_flow_usd" double precision NOT NULL, "current_value_usd" double precision NOT NULL, "irr" double precision NULL, "kind" "public"."real_estate_kind" NOT NULL, "realized_profit_usd" double precision NOT NULL, "roi" double precision NULL, PRIMARY KEY ("investment_key"), CONSTRAINT "real_estate_rollup_cache_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "public"."real_estate_investment" ("id") ON DELETE SET NULL);

CREATE INDEX "real_estate_rollup_cache_investmentId_idx" ON "public"."real_estate_rollup_cache" ("investment_id");

CREATE TABLE "public"."real_estate_sale_detail" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ledger_entry_id" uuid NOT NULL, "accumulated_depreciation" double precision NOT NULL, "carry_amount" double precision NOT NULL, "cost_basis" double precision NOT NULL, "doc_url" text NULL, "gross_sale_price" double precision NOT NULL, "net_proceeds" double precision NOT NULL, "selling_costs" double precision NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "real_estate_sale_detail_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."real_estate_ledger_entry" ("id") ON DELETE CASCADE);

CREATE INDEX "real_estate_sale_detail_ledgerEntryId_idx" ON "public"."real_estate_sale_detail" ("ledger_entry_id");

CREATE UNIQUE INDEX "real_estate_sale_detail_ledgerEntryId_uidx" ON "public"."real_estate_sale_detail" ("ledger_entry_id");

CREATE TABLE "public"."real_estate_share_transfer_detail" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "from_member_id" text NOT NULL, "ledger_entry_id" uuid NOT NULL, "to_member_id" text NOT NULL, "carry_amount" double precision NOT NULL, "price_per_share_unit" double precision NOT NULL, "seller_cost_basis" double precision NOT NULL, "share_units" double precision NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "real_estate_share_transfer_detail_from_member_id_fkey" FOREIGN KEY ("from_member_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE, CONSTRAINT "real_estate_share_transfer_detail_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."real_estate_ledger_entry" ("id") ON DELETE CASCADE, CONSTRAINT "real_estate_share_transfer_detail_to_member_id_fkey" FOREIGN KEY ("to_member_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE);

CREATE INDEX "real_estate_share_transfer_detail_fromMemberId_idx" ON "public"."real_estate_share_transfer_detail" ("from_member_id");

CREATE INDEX "real_estate_share_transfer_detail_ledgerEntryId_idx" ON "public"."real_estate_share_transfer_detail" ("ledger_entry_id");

CREATE INDEX "real_estate_share_transfer_detail_toMemberId_idx" ON "public"."real_estate_share_transfer_detail" ("to_member_id");

CREATE UNIQUE INDEX "real_estate_share_transfer_detail_ledgerEntryId_uidx" ON "public"."real_estate_share_transfer_detail" ("ledger_entry_id");

CREATE TABLE "public"."real_estate_sheet_sync_run" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "investment_id" uuid NOT NULL, "run_by_id" text NOT NULL, "rows_corrected" integer NOT NULL, "rows_imported" integer NOT NULL, "rows_scanned" integer NOT NULL, "rows_unchanged" integer NOT NULL, "run_at" timestamptz NOT NULL, "sheet_revision_id" text NULL, "warnings" text NULL, PRIMARY KEY ("id"), CONSTRAINT "real_estate_sheet_sync_run_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "public"."real_estate_investment" ("id") ON DELETE CASCADE, CONSTRAINT "real_estate_sheet_sync_run_run_by_id_fkey" FOREIGN KEY ("run_by_id") REFERENCES "public"."member" ("id") ON DELETE CASCADE);

CREATE INDEX "real_estate_sheet_sync_run_investmentId_idx" ON "public"."real_estate_sheet_sync_run" ("investment_id");

CREATE INDEX "real_estate_sheet_sync_run_runById_idx" ON "public"."real_estate_sheet_sync_run" ("run_by_id");
