# Password reset links

Invitation, admin-requested and self-service reset emails use `/set-password?token=...`.
The member row holds a random bearer token and a `timestamptz` expiry 48 hours after issue.
A new reset request replaces earlier links; completing a reset, changing account credentials
or disabling the account also invalidates older links. Never log these tokens or passwords.

The previous validator cleared the token immediately on page load and cleared the forced
password-change claim before a password was changed. Browser retries, repeat visits and mail
previews could therefore invalidate an unfinished reset. The public forgot-password form also
used Firebase's native email link instead of this application's 48-hour flow.

The current validator only reads and checks the token. The password form stays on the emailed
URL and submits the token with the chosen password. Completion locks the member row, checks
the expiry again, and generates/consumes a fresh Firebase action code through the official
reset-password API. Firebase password-policy checks and automatic session revocation remain
in effect. The server uses its IAM credential because the site's browser API key is restricted
to browser referrers. Only a successful password change clears the token and forced-change
claim; other claims are preserved. Invalid passwords and transient failures retain the link.

Self-service requests use App Check and a five-minute per-account resend cooldown, with the
same response for unknown and known accounts. Email failure rolls back replacement of the
stored token. Admin resets and invitations also retain an earlier link if sending fails.
Temporary validation failures offer Retry instead of an expired-link message.
No database migration was needed: the existing password-reset columns are reused.

`node scripts/password-reset.test.cjs` covers the 48-hour boundary, delayed completion,
repeat opens, single use, concurrent submissions, policy/network failures, account changes,
resend cooldown and email rollback. Browser checks cover Strict Mode duplicate effects,
form validation, service-error retry and self-service requests. A temporary isolated Firebase
Auth account verified the actual IAM-authenticated reset API and was deleted after testing;
that integration did not write to the member database or send email.

Deploy supporting `requestPasswordReset` and `completePasswordReset` functions first. Publish
the frontend next; it can still follow the previous validator's Firebase redirect during this
stage. Then publish `validatePasswordResetToken` and the updated issuance functions. The new
validator's redirect remains compatible with old `/set-password` clients through `/auth/action`.
Existing native Firebase action links still use the legacy handler; their expiry cannot be
extended retroactively. Already consumed, replaced or expired links require a fresh email.
