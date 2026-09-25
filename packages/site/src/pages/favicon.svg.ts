import type { APIRoute } from 'astro'
import { MARK_CELLS, markPath } from '../lib/mark'

// The favicon is the mark on a square of the ground, drawn from the same grid
// as the page's mark, so the two never drift. A tab shows it at 16px (2px per
// cell) or 32px (4px per cell). The colours are the palette's ground and ink.
export const GET: APIRoute = () =>
  new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_CELLS} ${MARK_CELLS}" shape-rendering="crispEdges">` +
      `<path fill="#121110" d="M0 0h${MARK_CELLS}v${MARK_CELLS}H0z"/><path fill="#e4e2dc" d="${markPath()}"/></svg>`,
    { headers: { 'Content-Type': 'image/svg+xml' } },
  )
