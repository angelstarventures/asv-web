-- Single-round transfers: which round the shares come from, and the seller's total company cost
-- basis before the transfer (moves recorded value). Additive columns only; apply after 009.

ALTER TABLE "public"."internal_transfer_detail" ADD COLUMN "source_round_name" text NULL;

ALTER TABLE "public"."internal_transfer_detail" ADD COLUMN "source_round_date" date NULL;

ALTER TABLE "public"."transfer_party" ADD COLUMN "cost_basis_before" double precision NULL;
