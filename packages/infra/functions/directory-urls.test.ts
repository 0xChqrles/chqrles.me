import { readFileSync } from 'node:fs'
import { createContext, Script } from 'node:vm'
import { describe, expect, it } from 'vitest'

// Load the function the way CloudFront runs it: a bare script that declares
// handler(), with no module system.
const sandbox: { handler?: (event: unknown) => unknown } = {}
createContext(sandbox)
new Script(readFileSync(new URL('./directory-urls.js', import.meta.url), 'utf8')).runInContext(sandbox)
const handler = sandbox.handler!

const request = (uri: string) => ({ uri, method: 'GET', querystring: {}, headers: {}, cookies: {} })
const run = (uri: string) => handler({ version: '1.0', context: { eventType: 'viewer-request' }, request: request(uri) })
const redirectTo = (location: string) => ({
  statusCode: 301,
  statusDescription: 'Moved Permanently',
  headers: { location: { value: location } },
})

describe('directory URLs', () => {
  it('serves the canonical form from its index.html', () => {
    expect(run('/')).toMatchObject({ uri: '/index.html' })
    expect(run('/cemantix/')).toMatchObject({ uri: '/cemantix/index.html' })
  })

  it('redirects the form without the slash to the canonical one', () => {
    expect(run('/cemantix')).toEqual(redirectTo('/cemantix/'))
  })

  it('redirects an explicit index.html to the canonical form', () => {
    expect(run('/cemantix/index.html')).toEqual(redirectTo('/cemantix/'))
    expect(run('/index.html')).toEqual(redirectTo('/'))
  })

  it('passes files through untouched', () => {
    for (const uri of ['/rss.xml', '/sitemap-index.xml', '/404.html', '/_astro/page.B1a2c3.css', '/robots.txt']) {
      expect(run(uri)).toMatchObject({ uri })
    }
  })
})
