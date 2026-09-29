import type { ImageMetadata } from 'astro'
import { getTracks, langOf, slugOf, typeset, versionIn } from '../../../lib/posts'
import { shareCard } from '../../../lib/share-card'
import { LANGS } from '../../../lib/lang'

// A post's share image (src/lib/share-card.ts), from its header photo and its
// title, in every language: a page that is not translated has the original's,
// so a link made before its translation still finds its image; and under each
// name the post used to have, so does a link made before it was renamed. Only a
// draft may have no photo, and then it has no share image.
export async function getStaticPaths() {
  const tracks = await getTracks()
  return LANGS.flatMap((lang) =>
    tracks.flatMap((track) => {
      const post = versionIn(track, lang)
      const props = { image: post.data.image!, title: typeset(post.data.title, langOf(post)) }
      return post.data.image ? [slugOf(post), ...track.aliases].map((slug) => ({ params: { lang, slug }, props })) : []
    }),
  )
}

// A card is drawn once per photo and title: a page and its aliases share it.
const cards = new Map<string, Promise<Uint8Array<ArrayBuffer>>>()

export async function GET({ props }: { props: { image: ImageMetadata; title: string } }) {
  const key = `${props.image.src}\n${props.title}`
  let card = cards.get(key)
  if (!card) {
    card = shareCard(props.image, props.title).then((png) => new Uint8Array(png))
    cards.set(key, card)
  }
  return new Response(await card, { headers: { 'Content-Type': 'image/png' } })
}
