import { getCollection, render, type CollectionEntry } from 'astro:content'
import { frenchSpacing } from './french-spacing'
import { DEFAULT_LANG, type Lang } from './lang'

export type Post = CollectionEntry<'posts'>

// A post's id is <lang>/<slug> (urls.ts).
export const langOf = (post: Post) => post.id.split('/')[0] as Lang
export const slugOf = (post: Post) => post.id.split('/')[1]!

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
// was published (the first post is 01). A track is one post in every language
// it is written in; its number and its place come from the original, the
// French one (or the earliest, for a post that has none), so they are the
// same on every page.
export interface Track {
  slug: string
  number: number
  original: Post
  versions: Post[]
}

export async function getTracks(): Promise<Track[]> {
  const bySlug = new Map<string, Post[]>()
  for (const post of await getPosts()) bySlug.set(slugOf(post), [...(bySlug.get(slugOf(post)) ?? []), post])
  const tracks = [...bySlug].map(([slug, versions]) => ({
    slug,
    versions,
    original: versions.find((post) => langOf(post) === DEFAULT_LANG) ?? versions.at(-1)!,
  }))
  tracks.sort((a, b) => b.original.data.date.getTime() - a.original.data.date.getTime())
  return tracks.map((track, i) => ({ ...track, number: tracks.length - i }))
}

// The version of a post a reader of `lang` gets: the one in their language,
// else the original.
export function versionIn(track: Track, lang: Lang): Post {
  return track.versions.find((post) => langOf(post) === lang) ?? track.original
}

// Counted at render time by the section-cues rehype step.
export async function secondsOf(post: Post): Promise<number> {
  const { remarkPluginFrontmatter } = await render(post)
  return Number(remarkPluginFrontmatter.seconds ?? 0)
}
