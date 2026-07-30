# Deduplication

Identity is resolved in this order:

1. Source ID plus provider external ID.
2. Canonical application URL.
3. SHA-256 fingerprint of normalized organization, title, locations, and type.

Canonical URLs remove fragments, tracking parameters, default ports, and cosmetic
trailing slashes. Material normalized fields produce a separate stable content hash.
An unchanged hash refreshes lifecycle timestamps without reclassification. A changed
hash updates the existing row and marks classification pending. Transaction advisory
locks and uniqueness constraints make repeated syncs idempotent.

Similarity matching is intentionally deferred until measured data justifies its
false-positive risk; deterministic matches remain safer for production.
