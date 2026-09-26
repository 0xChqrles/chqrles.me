import type { ImageMetadata } from 'astro'
import { getPosts, typeset } from '../../lib/posts'
import { shareCard } from '../../lib/share-card'

// A post's share image (src/lib/share-card.ts), from its header photo and its
// title. Only a draft may have no photo, and then it has no share image.
export async function getStaticPaths() {
  const posts = await getPosts()
  return posts.flatMap(({ id, data }) =>
    data.image ? [{ params: { slug: id }, props: { image: data.image, title: typeset(data.title, data.lang) } }] : [],
  )
}

export async function GET({ props }: { props: { image: ImageMetadata; title: string } }) {
  return new Response(new Uint8Array(await shareCard(props.image, props.title)), { headers: { 'Content-Type': 'image/png' } })
}
