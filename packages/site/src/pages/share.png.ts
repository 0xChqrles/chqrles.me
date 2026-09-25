import { getPosts } from '../lib/posts'
import { shareCard } from '../lib/share-card'

// The index's share image (src/lib/share-card.ts), from the newest post.
export async function GET() {
  const [newest] = await getPosts()
  return new Response(new Uint8Array(await shareCard(newest?.data.image)), { headers: { 'Content-Type': 'image/png' } })
}
