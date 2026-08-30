-- Applied by scripts/apply-post-migrations.ts after every `firebase dataconnect:sql:migrate`.
-- Data Connect's GraphQL SDL cannot express CHECK constraints; mirror every minimum/maximum
-- from mock-data/asv_master_portfolio_schema.json here by hand.

ALTER TABLE "SafeRoundDetail"
  ADD CONSTRAINT chk_safe_discount CHECK (discount BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_safe_asv_total CHECK ("asvTotal" >= 0),
  ADD CONSTRAINT chk_safe_post_money_val_cap CHECK ("postMoneyValCap" >= 0);

ALTER TABLE "PricedRoundDetail"
  ADD CONSTRAINT chk_priced_asv_total CHECK ("asvTotal" >= 0),
  ADD CONSTRAINT chk_priced_price_per_share CHECK ("pricePerShare" >= 0),
  ADD CONSTRAINT chk_priced_post_money_valuation CHECK ("postMoneyValuation" >= 0);

ALTER TABLE "NonParticipatingRoundDetail"
  ADD CONSTRAINT chk_nonpart_price CHECK ("newPricePerShare" >= 0),
  ADD CONSTRAINT chk_nonpart_valuation CHECK ("newPostMoneyValuation" >= 0);

ALTER TABLE "ExitEventDetail"
  ADD CONSTRAINT chk_exit_total_value CHECK ("totalExitValue" >= 0),
  ADD CONSTRAINT chk_exit_asv_payout CHECK ("asvTotalPayout" >= 0);

ALTER TABLE "ValuationAssessmentDetail"
  ADD CONSTRAINT chk_val_fmv CHECK ("asvTotalFairMarketValue" >= 0),
  ADD CONSTRAINT chk_val_enterprise_value CHECK ("impliedEnterpriseValue" IS NULL OR "impliedEnterpriseValue" >= 0);

ALTER TABLE "Allocation"
  ADD CONSTRAINT chk_allocation_amount CHECK (amount >= 0);

ALTER TABLE "MemberValuation"
  ADD CONSTRAINT chk_member_valuation_value CHECK (value >= 0);

ALTER TABLE "WatchlistRating"
  ADD CONSTRAINT chk_watchlist_rating_range CHECK (rating BETWEEN 1 AND 5);
