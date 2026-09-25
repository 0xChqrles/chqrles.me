import { unified } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'
import rehypeRaw from 'rehype-raw'
import { remarkFigurePlaceholders } from './src/lib/figure-placeholders'
import { rehypeFrenchSpacing } from './src/lib/french-spacing'

export default defineConfig({
  site: 'https://chqrles.me',
  // Canonical URLs end in a slash and each page is a folder: /<slug>/index.html.
  trailingSlash: 'always',
  // Two posts claiming one URL (index.md beside index.mdx, or a post named 404)
  // fail the build instead of one silently winning.
  prerenderConflictBehavior: 'error',
  build: {
    format: 'directory',
    // Every stylesheet and script is a file, so the CSP needs no inline hashes.
    inlineStylesheets: 'never',
  },
  vite: { build: { assetsInlineLimit: 0 } },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkFigurePlaceholders],
      rehypePlugins: [
        // Raw HTML becomes elements before French spacing runs, so a <code>
        // written as HTML is skipped too. MDX's own nodes pass through.
        [rehypeRaw, { passThrough: ['mdxFlowExpression', 'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression', 'mdxjsEsm'] }],
        rehypeFrenchSpacing,
      ],
    }),
    syntaxHighlight: false,
  },
  integrations: [mdx(), sitemap()],
})
