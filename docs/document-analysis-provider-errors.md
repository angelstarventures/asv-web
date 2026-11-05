# Document analysis provider failures

The Vesteck five-document failure on October 24, 2026 was an OpenRouter response from
ModelRun for `deepseek/deepseek-v4.1-flash`. Its HTTP status was 200, but its first choice
had `finish_reason: "error"`, code 502 and `error_type: "provider_unavailable"` with a
connection-lost message. The previous adapter inspected only visible content, masking
this provider error as “OpenRouter returned no text content.”

The adapter now checks both top-level and choice-level errors before accepting any
text, including partial text. Temporary provider/network errors and empty responses
receive at most one retry with the original model, routing and attachments. Both
attempts, backoff and response-body reads share the caller's existing timeout.
`Retry-After` is honored when the remaining budget allows it. Authentication, credits,
policy and input/output-limit errors return actionable messages without retrying.
Logs contain generation/routing/error metadata rather than documents or reasoning.

Run `node scripts/openrouter.test.cjs` for the production failure shape, five-file
preservation, bounded retry/deadline behavior, terminal failures and log privacy.
The configured live model also extracted all facts from five tiny synthetic PDFs;
that test did not use investment documents, write records or send email. The original
Vesteck attachments were not available to replay, so retry their analysis in the UI.

Deploy `functions:documentsAnalyze` after `npm --prefix functions run build`.
Provider error formats: <https://openrouter.ai/docs/api_reference/errors-and-debugging>.
