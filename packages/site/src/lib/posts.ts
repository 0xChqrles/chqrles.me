import { getCollection, render, type CollectionEntry } from 'astro:content'
import { frenchSpacing } from './french-spacing'
import type { Lang } from './lang'
import { groupTracks, langOf, slugOf, versionIn, type Track as TrackOf } from './tracks'

export type Post = CollectionEntry<'posts'>

export { langOf, slugOf, versionIn }

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

export type Track = TrackOf<Post>

export async function getTracks(): Promise<Track[]> {
  return groupTracks(await getPosts())
}

// Counted at render time by the section-cues rehype step.
export async function secondsOf(post: Post): Promise<number> {
  const { remarkPluginFrontmatter } = await render(post)
  return Number(remarkPluginFrontmatter.seconds ?? 0)
}
