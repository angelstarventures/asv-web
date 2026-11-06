-- CHECK constraints, uniqueness and the share-lot backfill for internal transfers.
-- Apply after pre_migrations/009_internal_transfers.sql. Idempotent where possible.

ALTER TABLE internal_transfer_detail ADD CONSTRAINT internal_transfer_detail_check_0 CHECK (round_price_per_share >= 0 AND transfer_price_per_share >= 0 AND total_shares > 0 AND gross_gain >= 0);
ALTER TABLE transfer_party ADD CONSTRAINT transfer_party_check_0 CHECK (shares > 0 AND cost_basis_per_share >= 0 AND amount >= 0 AND (gain IS NULL OR gain >= 0) AND (fees_charged IS NULL OR fees_charged >= 0));
CREATE UNIQUE INDEX transfer_party_one_per_side ON transfer_party(ledger_entry_id, member_id, side);
ALTER TABLE fee_line ADD CONSTRAINT fee_line_check_0 CHECK (amount >= 0 AND (percent IS NULL OR percent BETWEEN 0 AND 100));
ALTER TABLE share_lot ADD CONSTRAINT share_lot_check_0 CHECK (shares IS NOT NULL OR pending_conversion);
ALTER TABLE share_lot ADD CONSTRAINT share_lot_check_1 CHECK (shares IS NULL OR shares <> 0);
-- One acquisition lot per (source round, member); disposal lots (negative shares) are keyed by
-- their transfer entry the same way, so a re-run of this file or of the backfill below is a no-op.
CREATE UNIQUE INDEX share_lot_one_per_source_member ON share_lot(source_entry_id, member_id) WHERE source_entry_id IS NOT NULL;

-- Backfill: one acquisition lot per member per existing priced round, shares = allocation / price.
-- Rounds are recorded identically across the three scenarios, so only BALANCED rows are read.
INSERT INTO share_lot (company_id, member_id, source_entry_id, acquired_date, cost_basis, shares, pending_conversion)
SELECT le.company_id, a.member_id, le.id, le.event_date, SUM(a.amount), SUM(a.amount) / prd.price_per_share, false
FROM allocation a
JOIN ledger_entry le ON le.id = a.ledger_entry_id
JOIN priced_round_detail prd ON prd.ledger_entry_id = le.id
WHERE le.type = 'PARTICIPATING_PRICED_ROUND' AND le.scenario = 'BALANCED' AND prd.price_per_share > 0 AND a.amount > 0
GROUP BY le.company_id, a.member_id, le.id, le.event_date, prd.price_per_share
ON CONFLICT DO NOTHING;

-- SAFE rounds have no share count until conversion: record dollars at cost, flagged pending.
INSERT INTO share_lot (company_id, member_id, source_entry_id, acquired_date, cost_basis, shares, pending_conversion)
SELECT le.company_id, a.member_id, le.id, le.event_date, SUM(a.amount), NULL, true
FROM allocation a
JOIN ledger_entry le ON le.id = a.ledger_entry_id
WHERE le.type = 'PARTICIPATING_SAFE_ROUND' AND le.scenario = 'BALANCED' AND a.amount > 0
GROUP BY le.company_id, a.member_id, le.id, le.event_date
ON CONFLICT DO NOTHING;
