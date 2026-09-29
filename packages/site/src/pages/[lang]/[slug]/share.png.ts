import type { ImageMetadata } from 'astro'
import { getPosts, langOf, slugOf, typeset } from '../../../lib/posts'
import { shareCard } from '../../../lib/share-card'

// A post's share image (src/lib/share-card.ts), from its header photo and its
// title, in each language it is written in. Only a draft may have no photo, and
// then it has no share image.
export async function getStaticPaths() {
  const posts = await getPosts()
  return posts.flatMap((post) =>
    post.data.image
      ? [{ params: { lang: langOf(post), slug: slugOf(post) }, props: { image: post.data.image, title: typeset(post.data.title, langOf(post)) } }]
      : [],
  )
}

export async function GET({ props }: { props: { image: ImageMetadata; title: string } }) {
  return new Response(new Uint8Array(await shareCard(props.image, props.title)), { headers: { 'Content-Type': 'image/png' } })
}
