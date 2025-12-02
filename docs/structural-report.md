# Structural Weakness Report

Date: 2025-12-01 (re-evaluated)

## Resolved
- CI guardrails now exist (lint:blog + RSS + build) via `.github/workflows/ci.yml`, with `npm run check` and a Dockerfile for parity.
- Blog frontmatter validation is centralized and strict (required fields, slug uniqueness, tag types) and reused by both the linter and RSS generator; runtime also throws on invalid data.
- RSS feed is richer (author/categories) and regenerated via `prebuild`; the feed file is no longer tracked in git to avoid timestamp drift.
- Blog post rendering is wrapped in an error boundary so MDX import/render issues surface clearly.
- `.editorconfig` and `.gitattributes` are present to normalize line endings/formatting; `.nvmrc` documents Node 18+.
- Oversized hero/team media trimmed (Aditya portrait ~17MB → ~184KB) to keep bundle size reasonable.
- Posts loader now uses a single dynamic glob (no eager + lazy duplication), removing Vite double-import warnings and keeping RSS/slugs deduplicated.

## Remaining risks / follow-ups
- Enforce Node 18+ everywhere (CI already does; local dev on older runtimes still fails). Consider a preflight that checks engines before scripts run.
