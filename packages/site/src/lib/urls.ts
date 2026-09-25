// The URL contract. A post lives at https://chqrles.me/<slug>/, with the
// trailing slash, forever. The slug is the name of the post's folder.

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// The glob loader hands over the entry path, e.g. "my-post/index.md".
export function slugOf(entry: string): string {
  const slug = entry.split('/')[0] ?? ''
  if (!SLUG.test(slug)) {
    throw new Error(
      `posts/${slug}: a post's folder name is its URL, so it may only hold lowercase letters, digits and single hyphens, like posts/my-post.`,
    )
  }
  return slug
}

export function postPath(slug: string): string {
  return `/${slug}/`
}
