# Structural Weakness Report

Date: 2026-09-05 (re-evaluated)

## Resolved
- Astro statically generates the homepage, blog, careers, and job routes so every indexable URL ships complete HTML.
- Content collections validate blog and job frontmatter during the build.
- RSS and XML sitemaps are generated from the same collections as the public pages.
- CI checks titles, descriptions, canonicals, crawl directives, headings, schema, and required discovery files in the generated output.
- The custom 404 is a real error page and no longer redirects through browser storage.
- Homepage photos and raster partner logos have optimized WebP variants, explicit dimensions, and lazy loading.
- `.editorconfig`, `.gitattributes`, and `.nvmrc` normalize development and document Node 24+.

## Remaining risks / follow-ups
- Review `docs/seo-copy-review.md` before publishing product claims or job expiration dates.
- Add an approved 1200×630 social-sharing image when a brand-owned asset is available.
