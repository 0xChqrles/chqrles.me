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
  data: { date: Date; aliases?: string[] }
}

export interface Track<Post extends Version = Version> {
  slug: string
  number: number
  original: Post
  versions: Post[]
  // The names the post was published under before, from any of its files.
  aliases: string[]
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
    aliases: [...new Set(versions.flatMap((post) => post.data.aliases ?? []))],
  }))
  assertAliases(tracks)
  tracks.sort((a, b) => b.original.data.date.getTime() - a.original.data.date.getTime())
  return tracks.map((track, i) => ({ ...track, number: tracks.length - i }))
}

// An alias is a URL that redirects, so it may not be a post's own name or
// another post's, nor be claimed by two posts: two pages would claim one URL.
function assertAliases(tracks: { slug: string; aliases: string[] }[]): void {
  const names = new Map(tracks.map((track) => [track.slug, `is the name of posts/${track.slug}`]))
  for (const { slug, aliases } of tracks) {
    for (const alias of aliases) {
      if (alias === slug) throw new Error(`posts/${slug}: the alias "${alias}" is its own name. Remove it.`)
      const taken = names.get(alias)
      if (taken) throw new Error(`posts/${slug}: the alias "${alias}" ${taken}.`)
      names.set(alias, `is already an alias of posts/${slug}`)
    }
  }
}

// The version of a post a reader of `lang` gets: the one in their language,
// else the original.
export function versionIn<Post extends Version>(track: Track<Post>, lang: Lang): Post {
  return track.versions.find((post) => langOf(post) === lang) ?? track.original
}
