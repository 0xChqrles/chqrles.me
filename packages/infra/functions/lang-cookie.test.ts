import { readFileSync } from 'node:fs'
import { createContext, Script } from 'node:vm'
import { describe, expect, it } from 'vitest'

const sandbox: { handler?: (event: any) => any } = {}
createContext(sandbox)
new Script(readFileSync(new URL('./lang-cookie.js', import.meta.url), 'utf8')).runInContext(sandbox)
const handler = sandbox.handler!

const answer = (uri: string, { statusCode = 200, type = 'text/html' }: { statusCode?: number; type?: string | null } = {}) =>
  handler({
    version: '1.0',
    context: { eventType: 'viewer-response' },
    request: { uri, method: 'GET', querystring: {}, headers: {}, cookies: {} },
    response: {
      statusCode,
      statusDescription: '',
      headers: type === null ? {} : { 'content-type': { value: type } },
      cookies: {},
    },
  })

describe('the language cookie', () => {
  it('remembers the language of a page, for a year, out of reach of scripts', () => {
    expect(answer('/en/cemantix/index.html').cookies.lang).toEqual({
      value: 'en',
      attributes: 'Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax',
    })
    expect(answer('/fr/index.html').cookies.lang.value).toBe('fr')
  })

  it('takes a page with a charset', () => {
    expect(answer('/en/index.html', { type: 'text/html; charset=utf-8' }).cookies.lang.value).toBe('en')
  })

  it('is not set by a file, an error, a path with no language or one that is not a language', () => {
    expect(answer('/en/rss.xml', { type: 'application/xml' }).cookies).toEqual({})
    expect(answer('/en/cemantix/share.png', { type: 'image/png' }).cookies).toEqual({})
    expect(answer('/en/missing/index.html', { statusCode: 404 }).cookies).toEqual({})
    expect(answer('/en/index.html', { type: null }).cookies).toEqual({})
    expect(answer('/404.html').cookies).toEqual({})
    expect(answer('/index.html').cookies).toEqual({})
    expect(answer('/de/index.html').cookies).toEqual({})
    expect(answer('/cemantix/index.html').cookies).toEqual({})
  })

  it('changes nothing else in the response', () => {
    const response = answer('/en/index.html')
    expect(response.statusCode).toBe(200)
    expect(response.headers).toEqual({ 'content-type': { value: 'text/html' } })
  })
})
