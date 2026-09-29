import { DEFAULT_LANG, isLang, LANGS, type Lang } from './lang'

// The URL contract. A post lives at https://chqrles.me/<lang>/<slug>/, with the
// trailing slash, forever. The slug is the name of the post's folder; the
// language is the name of its file: index.md (or .mdx) is French, index.en.md is
// the English one. A post has at most one file per language.

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const POST_FILE = /^index(?:\.([^.]+))?\.mdx?$/

export function isPostFile(file: string): boolean {
  return POST_FILE.test(file)
}

// The language of the post file at a path (a markdown plugin only sees the
// file): French when it names none.
export function langOfPath(path: string | undefined): Lang {
  const lang = POST_FILE.exec(path?.split('/').at(-1) ?? '')?.[1] ?? DEFAULT_LANG
  return isLang(lang) ? lang : DEFAULT_LANG
}

// The glob loader hands over the entry path, e.g. "my-post/index.en.md".
export function parseEntry(entry: string): { slug: string; lang: Lang } {
  const [slug = '', file = ''] = entry.split('/')
  if (!SLUG.test(slug)) {
    throw new Error(
      `posts/${slug}: a post's folder name is its URL, so it may only hold lowercase letters, digits and single hyphens, like posts/my-post.`,
    )
  }
  const match = POST_FILE.exec(file)
  if (!match) {
    throw new Error(`posts/${slug}/${file}: a post file is index.md (French) or index.<lang>.md, like index.en.md. Rename it or remove it.`)
  }
  const lang = match[1] ?? DEFAULT_LANG
  if (!isLang(lang)) {
    throw new Error(`posts/${slug}/${file}: "${lang}" is not a language of the site (${LANGS.join(', ')}).`)
  }
  return { slug, lang }
}

// A post's id is its path without the slashes: fr/my-post is at /fr/my-post/.
export function postId({ slug, lang }: { slug: string; lang: Lang }): string {
  return `${lang}/${slug}`
}

export function postPath(id: string): string {
  return `/${id}/`
}

export function languagePath(lang: Lang): string {
  return `/${lang}/`
}
