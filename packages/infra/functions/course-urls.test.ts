import { readFileSync } from 'node:fs'
import { createContext, Script } from 'node:vm'
import { describe, expect, it } from 'vitest'

// Load the function the way CloudFront runs it: a bare script that declares
// handler(), with no module system.
const source = readFileSync(new URL('./course-urls.js', import.meta.url), 'utf8')
const sandbox: { handler?: (event: unknown) => unknown } = {}
createContext(sandbox)
new Script(source).runInContext(sandbox)
const handler = sandbox.handler!

type Query = Record<string, { value: string; multiValue?: { value: string }[] }>

const run = (uri: string, query: Query = {}, headers: Record<string, { value: string }> = {}) =>
  handler({
    version: '1.0',
    context: { eventType: 'viewer-request' },
    request: { uri, method: 'GET', querystring: query, headers, cookies: {} },
  })
const redirect = (location: string) => ({
  statusCode: 301,
  statusDescription: 'Moved Permanently',
  headers: { location: { value: location } },
})

describe('course URLs', () => {
  it('serves the canonical form from its index.html', () => {
    expect(run('/')).toMatchObject({ uri: '/index.html' })
    expect(run('/some-card/')).toMatchObject({ uri: '/some-card/index.html' })
    expect(run('/tout/')).toMatchObject({ uri: '/tout/index.html' })
  })

  it('redirects the form without the slash to the canonical one', () => {
    expect(run('/some-card')).toEqual(redirect('/some-card/'))
  })

  it('redirects an explicit index.html to the canonical form', () => {
    expect(run('/some-card/index.html')).toEqual(redirect('/some-card/'))
    expect(run('/index.html')).toEqual(redirect('/'))
  })

  it('passes files through untouched', () => {
    for (const uri of ['/_astro/page.B1a2c3.css', '/_astro/font.woff2', '/math.css', '/search.js', '/favicon.svg', '/apple-touch-icon.png', '/404.html']) {
      expect(run(uri)).toMatchObject({ uri })
    }
  })

  it('never redirects off the site', () => {
    expect(run('//evil.com')).toMatchObject({ uri: '/evil.com' })
    expect(run('//evil.com/')).toMatchObject({ uri: '/evil.com/index.html' })
    expect(run('//evil.com/login')).toEqual(redirect('/evil.com/login/'))
    expect(run('//evil.com/index.html')).toEqual(redirect('/evil.com/'))
    expect(run('/\\evil.com/login')).toEqual(redirect('/evil.com/login/'))
    expect(run('/some-card//evil.com/index.html')).toEqual(redirect('/some-card/evil.com/'))
  })

  it('keeps the query string', () => {
    const query = { utm_source: { value: 'x' }, tag: { value: 'a', multiValue: [{ value: 'a' }, { value: 'b' }] }, empty: { value: '' } }
    expect(run('/some-card', query)).toEqual(redirect('/some-card/?utm_source=x&tag=a&tag=b&empty'))
    expect(run('/some-card/index.html', { a: { value: '1' } })).toEqual(redirect('/some-card/?a=1'))
  })

  it('keeps a control character, a space or a # out of the Location header', () => {
    const location = (run('/some-card', { a: { value: 'x\r\nSet-Cookie: y=1 #z' } }) as any).headers.location.value
    expect(location).toBe('/some-card/?a=x%0d%0aSet-Cookie:%20y=1%20%23z')
    expect(location).not.toMatch(/[\r\n ]/)
  })

  it('names no language: whoever asks gets the same path', () => {
    const headers = { 'accept-language': { value: 'en' }, cookie: { value: 'lang=en' } }
    expect(run('/some-card/', {}, headers)).toMatchObject({ uri: '/some-card/index.html' })
    expect(run('/en/', {}, headers)).toMatchObject({ uri: '/en/index.html' })
  })
})
