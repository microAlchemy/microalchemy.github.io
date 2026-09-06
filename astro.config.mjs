import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'

const excludedFromSitemap = new Set([
  '/404/',
  '/apply/',
  '/build-with-us/',
  '/invest-with-us/',
])

export default defineConfig({
  site: 'https://microalchemy.xyz',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [
    react(),
    mdx(),
    sitemap({
      filter: (page) => !excludedFromSitemap.has(new URL(page).pathname),
    }),
  ],
})
