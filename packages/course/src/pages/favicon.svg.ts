import { markPath } from '@chqrles/design/mark'

// The course's icon: the q, you, in the ink on the sea.
export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><rect width="8" height="8" fill="#0d0c15"/><path transform="translate(1 1)" d="${markPath()}" fill="#f2f0fa"/></svg>`
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } })
}
