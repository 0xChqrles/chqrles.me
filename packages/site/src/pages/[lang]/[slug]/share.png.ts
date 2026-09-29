import type { ImageMetadata } from 'astro'
import { getTracks, langOf, slugOf, typeset, versionIn } from '../../../lib/posts'
import { shareCard } from '../../../lib/share-card'
import { LANGS } from '../../../lib/lang'

// A post's share image (src/lib/share-card.ts), from its header photo and its
// title, in every language: a page that is not translated has the original's,
// so a link made before its translation still finds its image. Only a draft
// may have no photo, and then it has no share image.
export async function getStaticPaths() {
  const tracks = await getTracks()
  return LANGS.flatMap((lang) =>
    tracks.flatMap((track) => {
      const post = versionIn(track, lang)
      return post.data.image
        ? [{ params: { lang, slug: slugOf(post) }, props: { image: post.data.image, title: typeset(post.data.title, langOf(post)) } }]
        : []
    }),
  )
}

export async function GET({ props }: { props: { image: ImageMetadata; title: string } }) {
  return new Response(new Uint8Array(await shareCard(props.image, props.title)), { headers: { 'Content-Type': 'image/png' } })
}
