-- Applied by scripts/apply-post-migrations.js after every `firebase dataconnect:sql:migrate`.
-- Adds password-reset token columns to the member table for the custom 48-hour expiry
-- flow (the Firebase default is 1 hour and can't be changed via API).

ALTER TABLE "public"."member"
  ADD COLUMN IF NOT EXISTS "password_reset_token" text,
  ADD COLUMN IF NOT EXISTS "password_reset_expires_at" timestamptz;