-- Applied by scripts/apply-post-migrations.ts after every `firebase dataconnect:sql:migrate`.
-- Data Connect's GraphQL SDL cannot express CHECK constraints; mirror every minimum/maximum
-- from mock-data/asv_master_portfolio_schema.json here by hand.
--
-- Table/column names are Data Connect's generated Postgres identifiers (snake_case),
-- confirmed against the actual `dataconnect:sql:migrate` DDL output — not the PascalCase/
-- camelCase names from schema.gql.

ALTER TABLE "safe_round_detail"
  ADD CONSTRAINT chk_safe_discount CHECK (discount BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_safe_asv_total CHECK ("asv_total" >= 0),
  ADD CONSTRAINT chk_safe_post_money_val_cap CHECK ("post_money_val_cap" >= 0);

ALTER TABLE "priced_round_detail"
  ADD CONSTRAINT chk_priced_asv_total CHECK ("asv_total" >= 0),
  ADD CONSTRAINT chk_priced_price_per_share CHECK ("price_per_share" >= 0),
  ADD CONSTRAINT chk_priced_post_money_valuation CHECK ("post_money_valuation" >= 0);

ALTER TABLE "non_participating_round_detail"
  ADD CONSTRAINT chk_nonpart_price CHECK ("new_price_per_share" >= 0),
  ADD CONSTRAINT chk_nonpart_valuation CHECK ("new_post_money_valuation" >= 0);

ALTER TABLE "exit_event_detail"
  ADD CONSTRAINT chk_exit_total_value CHECK ("total_exit_value" >= 0),
  ADD CONSTRAINT chk_exit_asv_payout CHECK ("asv_total_payout" >= 0);

ALTER TABLE "valuation_assessment_detail"
  ADD CONSTRAINT chk_val_fmv CHECK ("asv_total_fair_market_value" >= 0),
  ADD CONSTRAINT chk_val_enterprise_value CHECK ("implied_enterprise_value" IS NULL OR "implied_enterprise_value" >= 0);

ALTER TABLE "allocation"
  ADD CONSTRAINT chk_allocation_amount CHECK (amount >= 0);

ALTER TABLE "member_valuation"
  ADD CONSTRAINT chk_member_valuation_value CHECK (value >= 0);

-- watchlist_rating (and its chk_watchlist_rating_range constraint) was dropped and superseded
-- by deal_rating, added for the deal-flow feature.
ALTER TABLE "deal_rating"
  ADD CONSTRAINT chk_deal_rating_range CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE "deal"
  ADD CONSTRAINT chk_deal_discount_percent CHECK ("discount_percent" IS NULL OR "discount_percent" BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_deal_valuation_cap CHECK ("valuation_cap" IS NULL OR "valuation_cap" >= 0),
  ADD CONSTRAINT chk_deal_pre_money_valuation CHECK ("pre_money_valuation" IS NULL OR "pre_money_valuation" >= 0);

ALTER TABLE "deal_funding_round_entry"
  ADD CONSTRAINT chk_deal_funding_round_amount CHECK (amount >= 0);
