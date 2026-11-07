// ONE ICON FAMILY: every glyph is cells on a square grid, drawn at a whole number of device
// pixels a cell. Level icons are 11 × 11 (icones.json), the HUD's glyphs 7 × 7 (here), the q 5 × 7
// (the mark). A glyph follows the level icons' rules: solid masses, no lone pixel, one ink.
import { runs } from './pixels'
import { Q, type Pt } from './tree'

export const GLYPH: Record<string, string[]> = {
  // "go there": a filled dart pointing east, and its diagonal (south-east); edge beacons only
  east: ['.#.....', '.##....', '.###...', '.####..', '.###...', '.##....', '.#.....'],
  southeast: ['.......', '.....#.', '....##.', '...###.', '..####.', '.#####.', '.......'],
  next: ['.##....', '..##...', '...##..', '....##.', '...##..', '..##...', '.##....'],
  back: ['....##.', '...##..', '..##...', '.##....', '..##...', '...##..', '....##.'],
  check: ['.......', '......#', '.....##', '#...##.', '##.##..', '.###...', '..#....'],
  search: ['.###...', '##.##..', '#...#..', '##.##..', '.####..', '....##.', '.....##'],
  close: ['##...##', '###.###', '.#####.', '..###..', '.#####.', '###.###', '##...##'],
  flag: ['##.....', '######.', '######.', '##.....', '##.....', '##.....', '##.....'],
  chapters: ['#######', '#######', '.......', '#######', '#######', '.......', '#######'],
  map: ['###.#..', '#.###.#', '#.#.###', '#.#.#.#', '###.#.#', '..###.#', '....###'],
  // a closed padlock: the mark a locked plate carries
  lock: ['..###..', '.#...#.', '.#...#.', '#######', '###.###', '###.###', '#######'],
}
export const cells = (rows: readonly string[]): Pt[] => rows.flatMap((r, y) => [...r].flatMap((c, x) => (c === '#' ? [[x, y] as Pt] : [])))
// The eight turns of the dart: 0 = east, then clockwise in 45° steps (screen y down). Odd turns
// are the diagonal drawing; the rest are exact quarter turns.
const rot = (p: Pt[], n: number): Pt[] =>
  p.map(([x, y]) => {
    let [a, b] = [x - 3, y - 3]
    for (let i = 0; i < n; i++) [a, b] = [-b, a]
    return [a + 3, b + 3] as Pt
  })
export const DART: Pt[][] = Array.from({ length: 8 }, (_, d) => rot(cells(d % 2 ? GLYPH.southeast! : GLYPH.east!), Math.floor(d / 2)))

// THE LOCK on a locked plate (the map's, a mini node's, a share card's): the padlock at half the
// icon's cell (one at the least), wholly inside the plate's lower-right face, keylined by one of
// its cells in the plate's fill, so it cuts the icon it stands over and never meets the frame.
export const LOCK = GLYPH.lock!
export const lockCell = (cell: number) => Math.max(1, Math.floor(cell / 2))
// Its box's top-left corner, from the plate's centre (on both axes), for a plate inner flat F.
export const lockAt = (F: number, c: number) => Math.floor(F / 2 / Math.SQRT2 - 7 * c - c)
// Its keyline: the padlock's cells grown by one, from (-1, -1).
export const LOCK_KEY: Pt[] = (() => {
  const own = new Set(cells(LOCK).map(([x, y]) => `${x},${y}`))
  const out: Pt[] = []
  for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) if ([-1, 0, 1].some((a) => [-1, 0, 1].some((b) => own.has(`${x + a},${y + b}`)))) out.push([x, y])
  return out
})()

// One path of runs (a row's consecutive cells as one rectangle): no seams at a fractional ratio.
export function runsPath(rows: readonly string[]): string {
  let d = ''
  rows.forEach((r, y) => {
    for (const m of r.matchAll(/#+/g)) d += `M${m.index} ${y}h${m[0].length}v1h-${m[0].length}z`
  })
  return d
}
export const glyphSvg = (name: keyof typeof GLYPH, px = 2, cls = 'g') => {
  const g = GLYPH[name]!
  return `<svg class="${cls}" width="${g[0]!.length * px}" height="${g.length * px}" viewBox="0 0 ${g[0]!.length} ${g.length}" aria-hidden="true"><path d="${runsPath(g)}"/></svg>`
}
export const qSvg = (px = 3, cls = 'qm') => `<svg class="${cls}" width="${5 * px}" height="${7 * px}" viewBox="0 0 5 7" aria-hidden="true"><path d="${runsPath(Q)}"/></svg>`
// The lower part of an octagon of side px inset i, under the line `share` of its height up (a
// quarter at least): a level begun fills from the bottom, on the map and in every list alike.
export function lowerOct(px: number, i: number, share: number): string {
  const k = Math.round(((px - 2 * i) / 2) * (2 - Math.SQRT2))
  const o: [number, number][] = [[i + k, i], [px - i - k, i], [px - i, i + k], [px - i, px - i - k], [px - i - k, px - i], [i + k, px - i], [i, px - i - k], [i, i + k]]
  const y0 = px - i - (px - 2 * i) * Math.max(0.25, Math.min(1, share))
  const out: [number, number][] = []
  for (let a = 0; a < 8; a++) {
    const p = o[a]!
    const q = o[(a + 1) % 8]!
    if (p[1] >= y0) out.push(p)
    if ((p[1] - y0) * (q[1] - y0) < 0) out.push([p[0] + ((q[0] - p[0]) * (y0 - p[1])) / (q[1] - p[1]), y0])
  }
  return out.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(' ')
}
// A level's mini node: an octagon in its state (CSS), its icon at 2 or 3 px a cell; begun, its
// lower part filled as on the map (one plate renderer a state, for the map's HUD and the pages).
export function miniNode(rows: readonly string[] | null, hue: number, etat: string, px = 32, fill = 0.5): string {
  const c = px >= 40 ? 3 : 2
  const k = Math.round((px / 2) * (2 - Math.SQRT2))
  const pts = `${k},0 ${px - k},0 ${px},${k} ${px},${px - k} ${px - k},${px} ${k},${px} 0,${px - k} 0,${k}`
  const i = 2
  const ki = Math.round(((px - 2 * i) / 2) * (2 - Math.SQRT2))
  const inner = `${i + ki},${i} ${px - i - ki},${i} ${px - i},${i + ki} ${px - i},${px - i - ki} ${px - i - ki},${px - i} ${i + ki},${px - i} ${i},${px - i - ki} ${i},${i + ki}`
  const g = rows ?? GLYPH.chapters!
  const n = g[0]!.length
  const off = (px - n * c) / 2
  // the stamp ring a cleared plate carries inside its frame (drawn round when it is stamped)
  const j = 4.5
  const kj = Math.round(((px - 2 * j) / 2) * (2 - Math.SQRT2) * 10) / 10
  const stamp = `${j + kj},${j} ${px - j - kj},${j} ${px - j},${j + kj} ${px - j},${px - j - kj} ${px - j - kj},${px - j} ${j + kj},${px - j} ${j},${px - j - kj} ${j},${j + kj}`
  // locked: the padlock over the icon's lower right (CSS shows it)
  const lc = lockCell(c)
  const lo = px / 2 + lockAt(px - 2 * i, lc)
  const lock = `<g class="mn-l" transform="translate(${lo} ${lo}) scale(${lc})"><path class="mn-lk" d="${runs(LOCK_KEY.map(([x, y]) => `${x},${y}`))}"/><path class="mn-lp" d="${runsPath(LOCK)}"/></g>`
  return `<svg class="mn h${hue} e-${etat}" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" aria-hidden="true"><polygon class="mn-f" points="${pts}"/><polygon class="mn-p" points="${inner}"/><polygon class="mn-g" points="${lowerOct(px, i, fill)}"/><path class="mn-i" transform="translate(${off} ${off}) scale(${c})" d="${runsPath(g)}"/>${lock}<polygon class="mn-k" points="${stamp}" pathLength="1"/></svg>`
}
