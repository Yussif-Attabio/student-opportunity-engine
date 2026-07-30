# Synchronization lifecycle

1. Cron selects due enabled sources.
2. QStash queues a signed per-source message.
3. The worker creates a `RUNNING` run; a database uniqueness lock blocks overlap.
4. The adapter validates and fetches the complete public board.
5. Each posting is validated, normalized, deduplicated, and upserted.
6. New or materially changed records are queued for classification.
7. Missing counters advance only after a completely successful sync.
8. Run statistics and source health are finalized.

A failed fetch never deactivates opportunities. Partial normalization, upsert, or queue
failures produce a `PARTIAL` run and skip deactivation. QStash retries worker failures
with backoff; retryable provider responses preserve `Retry-After` when supplied.

Structured-data validation downloads the career page once and reuses that same bounded
response during the following fetch step. Valid JSON-LD records continue even when
another script or individual `JobPosting` record is malformed.

Per-item failures produce a `PARTIAL` run and a degraded health signal, but they do not
increase the source's consecutive request-failure counter. Only a failed source-level
validation or fetch advances that counter toward `FAILING`.

The default deactivation threshold is three successful complete syncs. Configure it with
`MISSED_SYNC_THRESHOLD`.
