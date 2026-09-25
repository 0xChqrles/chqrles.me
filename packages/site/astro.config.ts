import { unified } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'
import { remarkFigurePlaceholders } from './src/lib/figure-placeholders'
import { rehypeFrenchSpacing } from './src/lib/french-spacing'

export default defineConfig({
  site: 'https://chqrles.me',
  // Canonical URLs end in a slash and each page is a folder: /<slug>/index.html.
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Every stylesheet and script is a file, so the CSP needs no inline hashes.
    inlineStylesheets: 'never',
  },
  vite: { build: { assetsInlineLimit: 0 } },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkFigurePlaceholders],
      rehypePlugins: [rehypeFrenchSpacing],
    }),
    syntaxHighlight: false,
  },
  integrations: [mdx(), sitemap()],
})
