import { readFileSync } from 'node:fs'
import { createContext, Script } from 'node:vm'
import { describe, expect, it } from 'vitest'

// Load the function the way CloudFront runs it: a bare script that declares
// handler(), with no module system.
const source = readFileSync(new URL('./directory-urls.js', import.meta.url), 'utf8')
const sandbox: { handler?: (event: unknown) => unknown } = {}
createContext(sandbox)
new Script(source).runInContext(sandbox)
const handler = sandbox.handler!

interface Visitor {
  languages?: string
  cookie?: string
  query?: Record<string, { value: string; multiValue?: { value: string }[] }>
}

const run = (uri: string, { languages, cookie, query = {} }: Visitor = {}) =>
  handler({
    version: '1.0',
    context: { eventType: 'viewer-request' },
    request: {
      uri,
      method: 'GET',
      querystring: query,
      headers: languages === undefined ? {} : { 'accept-language': { value: languages } },
      cookies: cookie === undefined ? {} : { lang: { value: cookie } },
    },
  })
const redirect = (statusCode: number, location: string) => ({
  statusCode,
  statusDescription: statusCode === 301 ? 'Moved Permanently' : 'Found',
  headers: { location: { value: location } },
})

describe('directory URLs', () => {
  it('serves the canonical form from its index.html', () => {
    expect(run('/fr/')).toMatchObject({ uri: '/fr/index.html' })
    expect(run('/en/cemantix/')).toMatchObject({ uri: '/en/cemantix/index.html' })
  })

  it('redirects the form without the slash to the canonical one', () => {
    expect(run('/fr/cemantix')).toEqual(redirect(301, '/fr/cemantix/'))
    expect(run('/en')).toEqual(redirect(301, '/en/'))
  })

  it('redirects an explicit index.html to the canonical form', () => {
    expect(run('/fr/cemantix/index.html')).toEqual(redirect(301, '/fr/cemantix/'))
    expect(run('/en/index.html')).toEqual(redirect(301, '/en/'))
  })

  it('passes files through untouched', () => {
    for (const uri of ['/fr/rss.xml', '/en/cemantix/share.png', '/sitemap.xml', '/404.html', '/_astro/page.B1a2c3.css', '/robots.txt', '/share.png', '/favicon.svg', '/apple-touch-icon.png']) {
      expect(run(uri)).toMatchObject({ uri })
    }
  })

  it('never redirects off the site', () => {
    expect(run('//evil.example/login')).toEqual(redirect(302, '/fr/evil.example/login/'))
    expect(run('//evil.example/index.html')).toEqual(redirect(302, '/fr/evil.example/'))
    expect(run('/\\evil.example/login')).toEqual(redirect(302, '/fr/evil.example/login/'))
    expect(run('//fr/x')).toEqual(redirect(301, '/fr/x/'))
    expect(run('/fr//evil.example/index.html')).toEqual(redirect(301, '/fr/evil.example/'))
  })
})

describe('the language of a path that names none', () => {
  it('sends the visitor to the same path in their browser language', () => {
    expect(run('/cemantix/', { languages: 'en-US,en;q=0.9' })).toEqual(redirect(302, '/en/cemantix/'))
    expect(run('/cemantix/', { languages: 'fr-CH, fr;q=0.9, en;q=0.8' })).toEqual(redirect(302, '/fr/cemantix/'))
    expect(run('/', { languages: 'en' })).toEqual(redirect(302, '/en/'))
  })

  it('fixes the slash and the index.html in the same redirect', () => {
    expect(run('/cemantix', { languages: 'en' })).toEqual(redirect(302, '/en/cemantix/'))
    expect(run('/cemantix/index.html', { languages: 'en' })).toEqual(redirect(302, '/en/cemantix/'))
    expect(run('/index.html', { languages: 'en' })).toEqual(redirect(302, '/en/'))
  })

  it('goes by the language they last read before it goes by the browser', () => {
    expect(run('/cemantix/', { cookie: 'fr', languages: 'en' })).toEqual(redirect(302, '/fr/cemantix/'))
    expect(run('/cemantix/', { cookie: 'en', languages: 'fr' })).toEqual(redirect(302, '/en/cemantix/'))
  })

  it('ignores a cookie that is not a language of the site', () => {
    expect(run('/', { cookie: 'de', languages: 'en' })).toEqual(redirect(302, '/en/'))
    expect(run('/', { cookie: '../evil', languages: 'en' })).toEqual(redirect(302, '/en/'))
    expect(run('/', { cookie: 'EN' })).toEqual(redirect(302, '/fr/'))
  })

  it('takes the visitor’s first language the site has, best weight first', () => {
    expect(run('/', { languages: 'de, en;q=0.5, fr;q=0.8' })).toEqual(redirect(302, '/fr/'))
    expect(run('/', { languages: 'de,en;q=0.5' })).toEqual(redirect(302, '/en/'))
    expect(run('/', { languages: 'en;q=0.7, fr;q=0.7' })).toEqual(redirect(302, '/en/'))
    expect(run('/', { languages: 'fr;q=0.4,EN-gb;q=0.9' })).toEqual(redirect(302, '/en/'))
  })

  it('skips a language the visitor refuses, and what it cannot read', () => {
    expect(run('/', { languages: 'en;q=0, fr;q=0.1' })).toEqual(redirect(302, '/fr/'))
    expect(run('/', { languages: 'en;q=0' })).toEqual(redirect(302, '/fr/'))
    expect(run('/', { languages: '*' })).toEqual(redirect(302, '/fr/'))
    expect(run('/', { languages: ',;q=,en;q=abc,,' })).toEqual(redirect(302, '/fr/'))
    expect(run('/', { languages: '' })).toEqual(redirect(302, '/fr/'))
  })

  it('falls back to French when it knows nothing', () => {
    expect(run('/')).toEqual(redirect(302, '/fr/'))
    expect(run('/cemantix/', { languages: 'de,es;q=0.8' })).toEqual(redirect(302, '/fr/cemantix/'))
  })

  it('carries the files of an old link along: the feed, a page’s share image', () => {
    expect(run('/rss.xml', { languages: 'en' })).toEqual(redirect(302, '/en/rss.xml'))
    expect(run('/cemantix/share.png', { languages: 'en' })).toEqual(redirect(302, '/en/cemantix/share.png'))
  })

  it('keeps the query string, so a shared link’s campaign reaches the page', () => {
    const query = { utm_source: { value: 'x' }, tag: { value: 'a', multiValue: [{ value: 'a' }, { value: 'b' }] }, empty: { value: '' } }
    expect(run('/cemantix/', { languages: 'en', query })).toEqual(redirect(302, '/en/cemantix/?utm_source=x&tag=a&tag=b&empty'))
    expect(run('/fr/cemantix', { query: { a: { value: '1' } } })).toEqual(redirect(301, '/fr/cemantix/?a=1'))
  })

  it('leaves alone the files every language shares, whoever asks', () => {
    for (const uri of ['/_astro/page.css', '/favicon.svg', '/share.png', '/sitemap.xml', '/robots.txt']) {
      expect(run(uri, { languages: 'en', cookie: 'en' })).toMatchObject({ uri })
    }
  })
})

describe('the languages', () => {
  it('are the ones the site is built in', () => {
    const site = readFileSync(new URL('../../site/src/lib/lang.ts', import.meta.url), 'utf8')
    const langs = (text: string) => /LANGS = \[([^\]]*)\]/.exec(text)?.[1]?.replace(/\s/g, '')
    const defaultLang = (text: string) => /DEFAULT_LANG[^=]*= '(\w+)'/.exec(text)?.[1]
    expect(langs(source)).toBeDefined()
    expect(langs(source)).toBe(langs(site))
    expect(defaultLang(source)).toBe(defaultLang(site))
    expect(readFileSync(new URL('./lang-cookie.js', import.meta.url), 'utf8')).toContain(`LANGS = [${langs(site)!.replace(/,/g, ', ')}]`)
  })
})
