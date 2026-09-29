import { DEFAULT_LANG, type Lang } from './lang'

// The index is a tracklist: each post is a track, numbered in the order it
// was published (the first post is 01). A track is one post in every language
// it is written in; its number and its place come from the original, the
// French one (or the earliest, for a post that has none), so they are the
// same on every page. Pure on purpose (posts.ts hands it the collection), so
// the rules can be tested.

// A post's id is <lang>/<slug> (urls.ts).
export const langOf = (post: { id: string }) => post.id.split('/')[0] as Lang
export const slugOf = (post: { id: string }) => post.id.split('/')[1]!

interface Version {
  id: string
  data: { date: Date }
}

export interface Track<Post extends Version = Version> {
  slug: string
  number: number
  original: Post
  versions: Post[]
}

// Newest first, by the original's date; the versions of a track newest first too.
export function groupTracks<Post extends Version>(posts: Post[]): Track<Post>[] {
  const bySlug = new Map<string, Post[]>()
  for (const post of [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime())) {
    bySlug.set(slugOf(post), [...(bySlug.get(slugOf(post)) ?? []), post])
  }
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
export function versionIn<Post extends Version>(track: Track<Post>, lang: Lang): Post {
  return track.versions.find((post) => langOf(post) === lang) ?? track.original
}
