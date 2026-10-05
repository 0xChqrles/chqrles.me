import type { APIContext } from 'astro'
import { LANGS } from '../lib/lang'
import { getTracks, langOf } from '../lib/posts'
import { languagePath, postPath } from '../lib/urls'

// The pages that have content, each with the same page in the other languages
// (hreflang). The un-translated pages of a post are redirects, and the edge
// answers /: none of them is listed.
export async function GET({ site }: APIContext) {
  const absolute = (path: string) => new URL(path, site).href
  const groups = [
    LANGS.map((lang) => ({ lang, path: languagePath(lang) })),
    ...(await getTracks()).map((track) => track.versions.map((post) => ({ lang: langOf(post), path: postPath(post.id) }))),
  ]
  const urls = groups.flatMap((group) =>
    group.map(({ path }) => {
      const alternates = group.length > 1 ? group.map((alt) => `<xhtml:link rel="alternate" hreflang="${alt.lang}" href="${absolute(alt.path)}"/>`).join('') : ''
      return `<url><loc>${absolute(path)}</loc>${alternates}</url>`
    }),
  )
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
}
