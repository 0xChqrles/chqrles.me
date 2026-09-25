import { getCollection, type CollectionEntry } from 'astro:content'
import { frenchSpacing } from './french-spacing'

export type Post = CollectionEntry<'posts'>
export type Lang = Post['data']['lang']

// Newest first. Drafts are here only under `pnpm dev`: a production build
// never loads them (content.config.ts).
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts')
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
