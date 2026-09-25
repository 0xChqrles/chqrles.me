// The mark: the q that stands where the a should be in chqrles, drawn on a
// grid of cells ('#' is ink). A bowl no wider than it is tall, thick verticals
// and thin horizontals, and a 2-cell stem running past the bowl's foot. The
// notch where the bowl's top meets the stem, and a stem with no hook, say q
// and not 9.
export const MARK = ['.##.#', '##.##', '##.##', '##.##', '.####', '...##', '...##']

export const MARK_WIDTH = 5
export const MARK_HEIGHT = MARK.length

// The lit cells as one path of horizontal runs, filled once: separate
// rectangles seam at a fractional device pixel ratio.
export function markPath(): string {
  let d = ''
  MARK.forEach((row, y) => {
    for (const run of row.matchAll(/#+/g)) d += `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`
  })
  return d
}

export function isLit(x: number, y: number): boolean {
  return MARK[y]?.[x] === '#'
}
