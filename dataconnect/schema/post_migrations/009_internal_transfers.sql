-- CHECK constraints and uniqueness for internal transfers and share lots.
-- Apply after pre_migrations/009_internal_transfers.sql. Idempotent where possible.
-- There is deliberately NO share-lot backfill: a seller's holding is declared on their first
-- transfer (holdings_before), so share counts are never re-derived from historical rounds.

ALTER TABLE internal_transfer_detail ADD CONSTRAINT internal_transfer_detail_check_0 CHECK (total_shares > 0 AND gross_gain >= 0 AND (round_price_per_share IS NULL OR round_price_per_share >= 0) AND (transfer_price_per_share IS NULL OR transfer_price_per_share >= 0));
ALTER TABLE internal_transfer_detail ADD CONSTRAINT internal_transfer_detail_check_1 CHECK (kind = 'REPLACEMENT' OR (round_price_per_share IS NOT NULL AND transfer_price_per_share IS NOT NULL));
ALTER TABLE transfer_party ADD CONSTRAINT transfer_party_check_0 CHECK (shares > 0 AND cost_basis_per_share >= 0 AND amount >= 0 AND (gain IS NULL OR gain >= 0) AND (fees_charged IS NULL OR fees_charged >= 0));
CREATE UNIQUE INDEX transfer_party_one_per_side ON transfer_party(ledger_entry_id, member_id, side);
ALTER TABLE fee_line ADD CONSTRAINT fee_line_check_0 CHECK (amount >= 0 AND (percent IS NULL OR percent BETWEEN 0 AND 100));
-- A transfer writes at most one lot of each kind per member (an OPENING correction plus the
-- TRANSFER_OUT/IN lot), so deleting the transfer removes exactly its lots.
CREATE UNIQUE INDEX share_lot_one_per_source_member_kind ON share_lot(source_entry_id, member_id, kind) WHERE source_entry_id IS NOT NULL;
