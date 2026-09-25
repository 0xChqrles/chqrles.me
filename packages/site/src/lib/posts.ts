import { getCollection, type CollectionEntry } from 'astro:content'
import { frenchSpacing } from './french-spacing'

export type Post = CollectionEntry<'posts'>
export type Lang = Post['data']['lang']

// Newest first. A draft renders under `pnpm dev` and never reaches a
// production build, so it is never in the index, the feed or the sitemap.
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft)
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}

export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}

// Frontmatter text (titles, descriptions) gets the same French typography as
// the body.
export function typeset(text: string, lang: Lang): string {
  return lang === 'fr' ? frenchSpacing(text) : text
}
