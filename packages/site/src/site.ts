import type { Lang } from './lib/lang'

export const SITE_NAME = 'chqrles.me'
// The index's meta description, for search results and link previews.
export const SITE_DESCRIPTION: Record<Lang, string> = {
  fr: 'Des articles, de temps en temps.',
  en: 'Articles, from time to time.',
}
// The site's id in Umami Cloud, which counts the visits. Public: every page carries it.
export const UMAMI_WEBSITE_ID = '9ea117d1-ca99-4d43-bfe3-8d8eb608f46c'
