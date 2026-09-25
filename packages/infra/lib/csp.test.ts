import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, CSP_MAX_LENGTH } from './csp'

function site(pages: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'csp-'))
  for (const [path, html] of Object.entries(pages)) {
    mkdirSync(join(dir, path, '..'), { recursive: true })
    writeFileSync(join(dir, path), html)
  }
  return dir
}

const sha = (text: string) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`

describe('contentSecurityPolicy', () => {
  it('allows only the site itself when the build has no inline code', () => {
    const dir = site({ 'index.html': '<link rel="stylesheet" href="/_astro/a.css"><script type="module" src="/_astro/a.js"></script>' })
    expect(contentSecurityPolicy(dir)).toBe(
      "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    )
  })

  it('allows each inline script and style of any page by its hash, once', () => {
    const dir = site({
      'index.html': '<style>a{b:c}</style><script>run()</script>',
      'post/index.html': '<script>run()</script><script type="module">go()</script>',
      'post/data.html': '<script type="application/ld+json">{"a":1}</script>',
    })
    const policy = contentSecurityPolicy(dir)
    expect(policy).toContain(`script-src 'self' ${[sha('run()'), sha('go()')].sort().join(' ')};`)
    expect(policy).toContain(`style-src 'self' ${sha('a{b:c}')};`)
    expect(policy).not.toContain(sha('{"a":1}'))
  })

  it('fails on an inline style or event attribute, naming the page', () => {
    expect(() => contentSecurityPolicy(site({ 'a/index.html': '<pre style="color:red">x</pre>' }))).toThrow('a/index.html: <pre style')
    expect(() => contentSecurityPolicy(site({ 'index.html': '<img src="x.png" onload="go()">' }))).toThrow('index.html: <img onload')
  })

  it('fails when the policy outgrows what CloudFront accepts', () => {
    const scripts = Array.from({ length: 40 }, (_, i) => `<script>f(${i})</script>`).join('')
    expect(() => contentSecurityPolicy(site({ 'index.html': scripts }))).toThrow(`CloudFront accepts ${CSP_MAX_LENGTH}`)
  })
})
