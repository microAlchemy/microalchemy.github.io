# Structural Weakness Report

Date: 2025-12-01

## Findings
- Deployment-only workflow leaves main unguarded; there is no CI gate for lint/build or an easy local/containers parity check before deploying.
- Blog content validation is duplicated and permissive (no slug uniqueness, weak type checks), so malformed frontmatter can ship and break runtime imports or the RSS feed.
- RSS output drifts easily (last build timestamp in the checked-in `public/rss.xml` is stale and the feed omits author/tags metadata), with no guardrails to keep it fresh.
- Lazy-loaded MDX posts lack an error boundary, so a bad post import renders a blank screen instead of a clear failure.
- Missing `.editorconfig`/`.gitattributes` means line endings and formatting churn across environments (current CRLF-only diffs are a symptom).

## Next actions
- Add a CI workflow (and a local/Docker path) that runs lint, frontmatter checks, RSS generation, and the build on PRs and protected branches.
- Centralize and harden blog frontmatter validation (including slug uniqueness) and reuse it for RSS generation and runtime normalization.
- Regenerate the RSS feed with richer metadata and ensure build steps keep it current.
- Introduce an error boundary around MDX post loading to surface failures gracefully.
- Lock in repository formatting defaults to prevent cross-platform diffs.
