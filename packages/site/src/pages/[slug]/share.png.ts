import type { ImageMetadata } from 'astro'
import { getPosts } from '../../lib/posts'
import { shareCard } from '../../lib/share-card'

// A post's share image (src/lib/share-card.ts), from its header photo. Only a
// draft may have none, and then it has no share image.
export async function getStaticPaths() {
  const posts = await getPosts()
  return posts.flatMap((post) => (post.data.image ? [{ params: { slug: post.id }, props: { image: post.data.image } }] : []))
}

export async function GET({ props }: { props: { image: ImageMetadata } }) {
  return new Response(new Uint8Array(await shareCard(props.image)), { headers: { 'Content-Type': 'image/png' } })
}
