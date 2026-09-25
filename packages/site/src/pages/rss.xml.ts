import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { getPosts, typeset } from '../lib/posts'
import { postPath } from '../lib/urls'
import { SITE_DESCRIPTION, SITE_NAME } from '../site'

export async function GET(context: APIContext) {
  const posts = await getPosts()
  return rss({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    site: context.site!,
    trailingSlash: true,
    customData: '<language>fr</language>',
    items: posts.map(({ id, data }) => ({
      title: typeset(data.title, data.lang),
      description: typeset(data.description, data.lang),
      pubDate: data.date,
      link: postPath(id),
    })),
  })
}
