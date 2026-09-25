import { getCollection, render, type CollectionEntry } from 'astro:content'
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

// The index is a tracklist: each post is a track, numbered in the order it
// was published (the first post is 01), with its length in seconds.
export interface Track {
  post: Post
  number: number
  seconds: number
}

export async function getTracks(): Promise<Track[]> {
  const posts = await getPosts()
  return Promise.all(posts.map(async (post, i) => ({ post, number: posts.length - i, seconds: await secondsOf(post) })))
}

// Counted at render time by the section-cues rehype step.
export async function secondsOf(post: Post): Promise<number> {
  const { remarkPluginFrontmatter } = await render(post)
  return Number(remarkPluginFrontmatter.seconds ?? 0)
}
