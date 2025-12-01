# MicroAlchemy

Marketing site and MDX blog for MicroAlchemy, built with Vite + React + TypeScript.

## What's inside

- Animated circuit-board hero with framer-motion reveals and SVG wiring.
- Product, investor, partner, and team cards configured in `src/components/CircuitBoardAnimation.tsx`.
- MDX-powered blog (see `src/blog`) with automatic frontmatter export, linting, and an RSS feed (`/rss.xml`).
- Routing with `react-router-dom` for the home page and blog detail pages.

## Getting started

```bash
npm install
npm run dev
```

Build, preview, and refresh supporting files:

```bash
npm run lint:blog   # frontmatter validation
npm run rss         # regenerate RSS feed
npm run build
npm run preview
```

## Content updates

- Hero copy, product links, investors, partners, and team members live in `src/components/CircuitBoardAnimation.tsx`.
- Blog posts are in `src/blog/*.mdx`; frontmatter must include `title`, `date`, `author`, and `summary`. `npm run lint:blog` will enforce this.
- The RSS feed is generated from MDX frontmatter via `npm run rss` (also run automatically before builds).

## Project structure

- `src/main.tsx` wires up routes.
- `src/App.tsx` renders the hero experience.
- `src/routes/BlogIndex.tsx` and `src/routes/BlogPost.tsx` handle the blog index/post views with shared styles in `src/routes/blog.css`.
- `scripts/check-blog-frontmatter.mjs` validates MDX metadata; `scripts/generate-rss.mjs` emits `public/rss.xml`.
