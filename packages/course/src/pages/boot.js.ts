import { saved, url } from '../lib/base'
import { getWorld } from '../lib/pages'

// Run before the page is drawn. It says a script runs, so the map is drawn for the camera from the
// first frame, never first as the page without a script. And it decides whether a level's page is
// locked (lib/gate.ts: its gate unmet, the reader neither begun nor « Lire quand même »), so a
// locked page never shows its text first: the rule of lib/gate.ts, on the course's table (each
// written level whose gate holds a written one: that gate, its checkpoints), read in the save as
// scripts/save.ts keeps it (a storage that throws is a first visit). Only a level's own page locks,
// never /tout/.
export async function GET() {
  const w = await getWorld()
  const prevu = new Set(w.levels.filter((l) => l.prevu).map((l) => l.id))
  const table = Object.fromEntries(
    w.levels
      .filter((l) => !l.prevu)
      .map((l) => [l.id, [l.need.filter((id) => !prevu.has(id)), l.sections]] as const)
      .filter(([, [need]]) => need.length),
  )
  const js = `document.documentElement.classList.add('js')
;(function () {
  var G = ${JSON.stringify(table)}
  var path = ${JSON.stringify(url())}
  var key = ${JSON.stringify(saved(''))}
  var p = location.pathname
  if (p.indexOf(path) !== 0) return
  var id = p.slice(path.length).replace(/\\/(index\\.html)?$/, '')
  var g = G[id]
  if (!g) return
  var get = function (k, d) {
    try {
      var v = localStorage.getItem(key + k)
      return v === null ? d : JSON.parse(v)
    } catch (e) {
      return d
    }
  }
  var lus = get('lus', [])
  var points = get('points', {})[id] || []
  if (lus.indexOf(id) >= 0 || get('forces', []).indexOf(id) >= 0) return
  if (points.some(function (s) { return g[1].indexOf(s) >= 0 })) return
  if (g[0].some(function (x) { return lus.indexOf(x) < 0 })) document.documentElement.classList.add('locked')
})()
`
  return new Response(js, { headers: { 'Content-Type': 'text/javascript' } })
}
