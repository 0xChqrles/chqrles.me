import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { contentSecurityPolicy, CSP_MAX_LENGTH } from './csp'

const SITE = 'https://demo.example.com'
const course = join(import.meta.dirname, '..', '..', 'course')
// Astro moves its files into the output by renaming them, which fails across disks (a CI
// runner's /tmp is not the checkout's), so the output sits beside the app, in its own cache.
const cache = join(course, 'node_modules', '.cache')
mkdirSync(cache, { recursive: true })
const out = mkdtempSync(join(cache, 'course-build-'))

const files = (extension: string) =>
  readdirSync(out, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => join(entry.parentPath, entry.name))
const page = (path: string) => readFileSync(join(out, path), 'utf8')

// A real build of the test course: never run it beside a course dev server.
beforeAll(() => {
  execFileSync('pnpm', ['exec', 'astro', 'build', '--force', '--site', SITE, '--outDir', out], {
    cwd: course,
    // Vitest's own BASE_URL would stand in for the course's path: a real build has none.
    env: { ...process.env, BASE_URL: undefined, NODE_ENV: 'production', COURSE_SLUG: '' },
    stdio: 'pipe',
  })
}, 120_000)

afterAll(() => rmSync(out, { recursive: true }))

describe('a course build', () => {
  it('fits the CSP with no inline code to allow', () => {
    const policy = contentSecurityPolicy(out)
    expect(policy).not.toContain('sha256-')
    expect(policy.length).toBeLessThanOrEqual(CSP_MAX_LENGTH)
  })

  it('loads every font from the site itself', () => {
    for (const file of [...files('.html'), ...files('.css')]) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(/\bdata:[a-z]+\//)
      expect(text, file).not.toContain('fonts.googleapis')
    }
  })

  it('emits the math fonts as files', () => {
    expect(readdirSync(join(out, '_astro')).filter((name) => /^KaTeX_.*\.woff2$/.test(name))).not.toEqual([])
  })

  it('takes its canonical URLs from the site it is built for, under the course’s path', () => {
    expect(page('index.html')).toContain(`<link rel="canonical" href="${SITE}/fixture/">`)
    expect(page('braquet/index.html')).toContain(`<link rel="canonical" href="${SITE}/fixture/braquet/">`)
  })

  it('writes every link and file it points at under the course’s path', () => {
    for (const file of files('.html')) {
      for (const [, path] of readFileSync(file, 'utf8').matchAll(/(?:href|src)="(\/[^"]*)"/g)) expect(path, file).toMatch(/^\/fixture\//)
    }
  })
})
