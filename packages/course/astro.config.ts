import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'http://localhost:4322', // the build's --site overrides it
  // Same as the blog: a page is a folder, and two routes claiming one URL fail the build.
  trailingSlash: 'always',
  prerenderConflictBehavior: 'error',
  build: { format: 'directory', inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } },
  server: { port: 4322 },
})
