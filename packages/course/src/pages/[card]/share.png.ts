import { getCourse, sharePng } from '../../lib/pages'

// Each written card's share image: its level chosen on the map (lib/share-card.ts).
export async function getStaticPaths() {
  const { pages } = await getCourse()
  return pages.map((page) => ({ params: { card: page.id } }))
}

export const GET = ({ params }: { params: { card: string } }) => sharePng(params.card)
