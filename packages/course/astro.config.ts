import { basename } from 'node:path'
import { defineConfig } from 'astro/config'
import { courseDir } from './src/lib/course-dir'

// Every course lives on one host, under its folder's name: /<slug>/.
const dev = process.argv.includes('dev')
const slug = basename(courseDir({ dev, env: process.env }))

export default defineConfig({
  site: 'http://localhost:4322', // the build's --site overrides it
  base: `/${slug}/`,
  // Same as the blog: a page is a folder, and two routes claiming one URL fail the build.
  trailingSlash: 'always',
  prerenderConflictBehavior: 'error',
  build: { format: 'directory', inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } },
  server: { port: 4322 },
})
