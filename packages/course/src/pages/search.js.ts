import { norm } from '../lib/norm'
import { getCourse, plain } from '../lib/pages'

// Every card's text, in a file of its own: the CSP allows a script to load, not a fetch.
export async function GET() {
  const { pages } = await getCourse()
  const index = pages.map((p) => [p.id, norm(plain([p.quartier, p.titre, p.resume, p.meta, p.html, p.notions, p.suite, p.pn].join(' ')))])
  return new Response(`self.RECHERCHE=${JSON.stringify(index)}\n`, { headers: { 'Content-Type': 'text/javascript' } })
}
