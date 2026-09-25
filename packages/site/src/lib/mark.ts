// The mark: a "q" drawn on an 8×8 cell grid, which is also a record on its
// spindle: the bowl is the disc, its one lit cell the spindle, and the long
// descender the tonearm. One cell is one unit of the viewBox.
export const MARK = [
  '.####.##',
  '##...###',
  '##.#.###',
  '##...###',
  '.####.##',
  '......##',
  '......##',
  '......##',
]

export const MARK_CELLS = MARK.length

// The lit cells as one path of horizontal runs, filled once: separate
// rectangles seam at a fractional device pixel ratio.
export function markPath(grid: string[] = MARK): string {
  let d = ''
  grid.forEach((row, y) => {
    for (const run of row.matchAll(/#+/g)) d += `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`
  })
  return d
}
