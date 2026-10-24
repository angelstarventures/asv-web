-- Generated snake_case table names; apply after Data Connect SQL migration.
-- Reapply after every migration because SDL represents JSON as String.
ALTER TABLE real_estate_investment ALTER COLUMN sheet_config TYPE jsonb USING sheet_config::jsonb;
ALTER TABLE real_estate_investment ADD CONSTRAINT real_estate_investment_check_0 CHECK (carry_percent BETWEEN 0 AND 100);
ALTER TABLE real_estate_investment ADD CONSTRAINT real_estate_investment_check_1 CHECK (default_fx_rate_to_usd > 0);
ALTER TABLE real_estate_investment ADD CONSTRAINT real_estate_investment_check_2 CHECK (total_property_cost IS NULL OR total_property_cost >= 0);
ALTER TABLE real_estate_ledger_entry ADD CONSTRAINT real_estate_ledger_entry_check_0 CHECK (amount_usd >= 0);
ALTER TABLE real_estate_ledger_entry ADD CONSTRAINT real_estate_ledger_entry_check_1 CHECK (amount_native IS NULL OR amount_native >= 0);
ALTER TABLE real_estate_ledger_entry ADD CONSTRAINT real_estate_ledger_entry_check_2 CHECK (fx_rate_to_usd IS NULL OR fx_rate_to_usd > 0);
ALTER TABLE real_estate_ledger_entry ADD CONSTRAINT real_estate_ledger_entry_check_3 CHECK (cash_direction BETWEEN -1 AND 1);
ALTER TABLE real_estate_allocation ADD CONSTRAINT real_estate_allocation_check_0 CHECK (amount_usd >= 0);
ALTER TABLE real_estate_allocation ADD CONSTRAINT real_estate_allocation_check_1 CHECK (amount_native IS NULL OR amount_native >= 0);
ALTER TABLE real_estate_allocation ADD CONSTRAINT real_estate_allocation_check_2 CHECK (cash_direction BETWEEN -1 AND 1);
ALTER TABLE real_estate_member_share ADD CONSTRAINT real_estate_member_share_check_0 CHECK (share_units >= 0);
ALTER TABLE real_estate_member_share ADD CONSTRAINT real_estate_member_share_check_1 CHECK (committed_amount IS NULL OR committed_amount >= 0);
ALTER TABLE real_estate_payment_schedule ADD CONSTRAINT real_estate_payment_schedule_check_0 CHECK (percent IS NULL OR percent BETWEEN 0 AND 100);
ALTER TABLE real_estate_payment_schedule ADD CONSTRAINT real_estate_payment_schedule_check_1 CHECK (amount_due >= 0);
ALTER TABLE real_estate_payment_schedule ADD CONSTRAINT real_estate_payment_schedule_check_2 CHECK (vat >= 0);
ALTER TABLE real_estate_payment_schedule ADD CONSTRAINT real_estate_payment_schedule_check_3 CHECK (total >= 0);
ALTER TABLE real_estate_rental_terms ADD CONSTRAINT real_estate_rental_terms_check_0 CHECK (escrow_percent IS NULL OR escrow_percent BETWEEN 0 AND 100);
ALTER TABLE real_estate_rental_terms ADD CONSTRAINT real_estate_rental_terms_check_1 CHECK (rental_carry_percent IS NULL OR rental_carry_percent BETWEEN 0 AND 100);
ALTER TABLE real_estate_rental_terms ADD CONSTRAINT real_estate_rental_terms_check_2 CHECK (capital_gains_carry_percent IS NULL OR capital_gains_carry_percent BETWEEN 0 AND 100);
CREATE UNIQUE INDEX real_estate_one_reversal ON real_estate_ledger_entry(reverses_entry_id) WHERE reverses_entry_id IS NOT NULL;
CREATE UNIQUE INDEX real_estate_member_allocation ON real_estate_allocation(ledger_entry_id, member_id);
ALTER TABLE real_estate_share_transfer_detail ADD CONSTRAINT real_estate_transfer_nonnegative CHECK (share_units > 0 AND price_per_share_unit >= 0 AND seller_cost_basis >= 0 AND carry_amount >= 0);
ALTER TABLE real_estate_sale_detail ADD CONSTRAINT real_estate_sale_nonnegative CHECK (gross_sale_price >= 0 AND selling_costs >= 0 AND net_proceeds >= 0 AND cost_basis >= 0 AND accumulated_depreciation >= 0 AND carry_amount >= 0);
