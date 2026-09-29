import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { LANGS, type Lang } from '../../lib/lang'
import { getTracks, langOf, typeset, versionIn } from '../../lib/posts'
import { postPath } from '../../lib/urls'
import { SITE_DESCRIPTION, SITE_NAME } from '../../site'

export function getStaticPaths() {
  return LANGS.map((lang) => ({ params: { lang } }))
}

// One feed per language, with every post: in that language when it has been
// translated, in its own when it has not.
export async function GET(context: APIContext) {
  const lang = context.params.lang as Lang
  const tracks = await getTracks()
  return rss({
    title: SITE_NAME,
    description: SITE_DESCRIPTION[lang],
    site: context.site!,
    trailingSlash: true,
    customData: `<language>${lang}</language>`,
    items: tracks.map((track) => {
      const post = versionIn(track, lang)
      return {
        title: typeset(post.data.title, langOf(post)),
        description: typeset(post.data.description, langOf(post)),
        pubDate: post.data.date,
        link: postPath(post.id),
      }
    }),
  })
}
