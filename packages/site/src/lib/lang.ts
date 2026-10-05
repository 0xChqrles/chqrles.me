// The site's languages. A page lives at /<lang>/…, and a post is written once
// per language (see urls.ts). The two edge functions that pick and remember a
// visitor's language keep their own copy of these constants
// (packages/infra/functions/*.js); a test keeps them in step.
export const LANGS = ['fr', 'en'] as const
export type Lang = (typeof LANGS)[number]

// The language of a post file that names none, and of a visitor we know nothing about.
export const DEFAULT_LANG: Lang = 'fr'

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value)
}

// Each language in its own words (for a link's accessible name) and as Open
// Graph writes its locale.
export const LANGUAGES: Record<Lang, { name: string; locale: string }> = {
  fr: { name: 'Français', locale: 'fr_FR' },
  en: { name: 'English', locale: 'en_US' },
}
