// Pixel drawing, shared by the build and the browser. Every shape is a set of
// cells on a grid, drawn as one SVG path of horizontal runs (as the mark is),
// with shape-rendering: crispEdges, at a whole number of pixels per cell.

export type Cells = Set<string>
const key = (x: number, y: number) => `${x},${y}`

// Rows of '#' and '.' as cells, offset by (dx, dy).
export function cellsOf(rows: readonly string[], dx = 0, dy = 0): Cells {
  const out: Cells = new Set()
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') out.add(key(x + dx, y + dy))
  })
  return out
}

// One path of horizontal runs: separate rectangles seam at a fractional device ratio.
export function runs(cells: Iterable<string>): string {
  const rows = new Map<number, number[]>()
  for (const k of cells) {
    const [x, y] = k.split(',').map(Number) as [number, number]
    const r = rows.get(y)
    if (r) r.push(x)
    else rows.set(y, [x])
  }
  let d = ''
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const xs = rows.get(y)!.sort((a, b) => a - b)
    let start = xs[0]!
    let prev = start
    for (let i = 1; i <= xs.length; i++) {
      const x = xs[i]
      if (x === prev + 1) {
        prev = x
        continue
      }
      d += `M${start} ${y}h${prev - start + 1}v1h-${prev - start + 1}z`
      if (x === undefined) break
      start = prev = x
    }
  }
  return d
}

// The cells of a shape that touch its outside: a filled silhouette becomes its outline.
export function outline(cells: Cells): Cells {
  const out: Cells = new Set()
  for (const k of cells) {
    const [x, y] = k.split(',').map(Number) as [number, number]
    if (![key(x + 1, y), key(x - 1, y), key(x, y + 1), key(x, y - 1)].every((n) => cells.has(n))) out.add(k)
  }
  return out
}

// THE ICONS. 9×9, a 7×7 live area with a 1-cell margin. A filled silhouette is
// the state reached; its outline (computed, never drawn twice) is the state open.
// One ink each, from its context. Diagonals step 1:1 or 2:1.
export const ICONS = {
  // Level states
  available: ['.........', '..#####..', '.#.....#.', '.#.....#.', '.#.....#.', '.#.....#.', '.#.....#.', '..#####..', '.........'],
  progress: ['.........', '..#####..', '.#.....#.', '.#.....#.', '.#.....#.', '.#######.', '.#######.', '..#####..', '.........'],
  cleared: ['.........', '..#####..', '.#######.', '.#####.#.', '.####.##.', '.#.#.###.', '.##.####.', '..#####..', '.........'],
  // locked: a closed padlock (written, its gate unmet)
  locked: ['.........', '...###...', '..#...#..', '..#...#..', '.#######.', '.###.###.', '.###.###.', '.#######.', '.........'],
  planned: ['.........', '.........', '...##....', '..#..##..', '.#.....#.', '.#.....#.', '..#####..', '.........', '.........'],
  frontier: ['.........', '.........', '...##....', '..#..##..', '.#.....#.', '.#..#..#.', '..#####..', '.........', '.........'],
  new: ['.........', '....#....', '....#....', '...###...', '.###.###.', '...###...', '....#....', '....#....', '.........'],
  // The course's shape
  chapter: ['.........', '.#.#.#.#.', '.#######.', '.###.###.', '.##...##.', '.##...##.', '.##...##.', '.##...##.', '.........'],
  checkpoint: ['.........', '..##.....', '..####...', '..######.', '..####...', '..##.....', '..#......', '.###.....', '.........'],
  checkpointOpen: ['.........', '..##.....', '..#.##...', '..#...##.', '..#.##...', '..##.....', '..#......', '.###.....', '.........'],
  all: ['.........', '.######..', '.#....##.', '.#.##..#.', '.#.....#.', '.#.###.#.', '.#.....#.', '.#######.', '.........'],
  // Callouts
  derivation: ['.........', '.....###.', '.....###.', '...#####.', '...#####.', '.#######.', '.#######.', '.#######.', '.........'],
  piege: ['.........', '....#....', '...###...', '...#.#...', '..##.##..', '..#####..', '.###.###.', '.#######.', '.........'],
  note: ['.........', '.#######.', '.#######.', '.##...##.', '.#######.', '.#######.', '..##.....', '..#......', '.........'],
  incertain: ['.........', '...####..', '..##..##.', '......##.', '.....##..', '....##...', '.........', '....##...', '.........'],
  code: ['.........', '.#######.', '.#######.', '.#.....#.', '.#.#...#.', '.#..#..#.', '.#.#...#.', '.#######.', '.........'],
} as const

export type IconName = keyof typeof ICONS

// An icon as a standalone inline SVG at `px` pixels per cell.
export function iconSvg(rows: readonly string[], px: number, cls = ''): string {
  const d = runs(cellsOf(rows))
  const w = rows[0]!.length
  const h = rows.length
  return `<svg class="px${cls ? ' ' + cls : ''}" width="${w * px}" height="${h * px}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}"/></svg>`
}

export const icon = (name: IconName, px = 2, cls = '') => iconSvg(ICONS[name], px, cls)
// Every state a level can be in, as one 9×9 icon: CSS shows the one that holds.
const STATES = ['available', 'progress', 'cleared', 'locked', 'planned', 'frontier'] as const
export function statesSvg(px = 2, cls = ''): string {
  return (
    `<svg class="px st${cls ? ' ' + cls : ''}" width="${9 * px}" height="${9 * px}" viewBox="0 0 9 9" aria-hidden="true">` +
    STATES.map((s) => `<path class="st-${s}" d="${runs(cellsOf(ICONS[s]))}"/>`).join('') +
    '</svg>'
  )
}
// A level's own icon (its path of 11 x 11 cells), at `px` pixels a cell.
export const levelIcon = (d: string, px = 2, cls = 'li') => `<svg class="px ${cls}" width="${11 * px}" height="${11 * px}" viewBox="0 0 11 11" aria-hidden="true"><path d="${d}"/></svg>`

// Difficulty, as five cells.
export const cellsHtml = (n: number | null, of = 5) =>
  n ? `<span class="diff" role="img" aria-label="Difficulté ${n}/${of}">${Array.from({ length: of }, (_, i) => `<i${i < n ? ' class="on"' : ''}></i>`).join('')}</span>` : ''

// LEVEL TILES, at a page's foot.
// A square of side s around (cx, cy), corners cut by one cell.
export function tile(cx: number, cy: number, s: number): Cells {
  const h = (s - 1) / 2
  const out: Cells = new Set()
  for (let y = -h; y <= h; y++)
    for (let x = -h; x <= h; x++) {
      if (Math.abs(x) === h && Math.abs(y) === h) continue
      out.add(K(cx + x, cy + y))
    }
  return out
}
// The same square's ring.
export const ring = (cx: number, cy: number, s: number) => outline(tile(cx, cy, s))
// Filled, with a check cut out of it.
export function cleared(cx: number, cy: number, s: number): Cells {
  const out = tile(cx, cy, s)
  for (const [x, y] of [[-2, 0], [-1, 1], [0, 0], [1, -1], [2, -2]] as const) out.delete(K(cx + x, cy + y))
  return out
}
// A check, cut out of a cleared tile.
export const CHECK = ['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....'] as const

const K = key
