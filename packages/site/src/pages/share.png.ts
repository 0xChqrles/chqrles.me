import { getTracks } from '../lib/posts'
import { shareCard } from '../lib/share-card'

// The index's share image (src/lib/share-card.ts), from the newest post: the
// one the index puts first, whatever the language.
export async function GET() {
  const [newest] = await getTracks()
  return new Response(new Uint8Array(await shareCard(newest?.original.data.image)), { headers: { 'Content-Type': 'image/png' } })
}
