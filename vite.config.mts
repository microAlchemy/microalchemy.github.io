import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import matter from 'gray-matter'

const exportMdxFrontmatter = () => ({
  name: 'export-mdx-frontmatter',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.endsWith('.mdx')) return null
    const parsed = matter(code)
    const frontmatterExport = `export const frontmatter = ${JSON.stringify(parsed.data ?? {})};\n`
    return { code: `${frontmatterExport}${parsed.content}`, map: null }
  },
})

export default defineConfig({
  plugins: [
    exportMdxFrontmatter(),
    mdx({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
    }),
    react(),
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.mdx', '.js'],
  },
  base: '/',
})
