// The header photo as a one-bit ordered dither: a cell is lit in the ink when
// the photo is brighter there than an 8×8 Bayer matrix's threshold for that
// cell. Shared by the page (src/scripts/plate.ts, which develops it on load)
// and the build (the index share image), so both print the same picture.

// Tone: levels stretched between these percentiles; local contrast lifted by
// an unsharp mask about 6 cells wide, so a subject parts from a background of
// the same grey; then an exposure metered so about a quarter of the cells are
// lit, within a curve steep enough to keep the ground dark and gentle enough
// to keep a face.
const LEVELS = [0.05, 0.99] as const
const SHARPEN = { radius: 6, amount: 1 }
const METER = 0.24
const CURVE = [1.8, 2.6] as const

// The Bayer index matrix, built by recursion: each step tiles the previous
// matrix four times as 4m, 4m+2, 4m+3, 4m+1. Thresholds sit in (0, 1),
// centred in each of the 64 levels.
function bayer(size: number): number[] {
  let m = [0]
  for (let n = 1; n < size; n *= 2) {
    const next = new Array<number>(4 * n * n)
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 4 * m[y * n + x]!
        next[y * 2 * n + x] = v
        next[y * 2 * n + x + n] = v + 2
        next[(y + n) * 2 * n + x] = v + 3
        next[(y + n) * 2 * n + x + n] = v + 1
      }
    }
    m = next
  }
  return m.map((v) => (v + 0.5) / (size * size))
}

const THRESHOLD = bayer(8)

// Is the cell at (x, y) lit at exposure k (0 to 1)?
export function lit(tone: Float32Array, cols: number, x: number, y: number, k = 1): boolean {
  return tone[y * cols + x]! * k > THRESHOLD[(y & 7) * 8 + (x & 7)]!
}

// The photo's brightness per cell (0 to 1) → the tone the dither prints.
export function toneMap(luma: Float32Array, cols: number, rows: number): Float32Array {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const sorted = Float32Array.from(luma).sort()
  const lo = sorted[Math.floor(sorted.length * LEVELS[0])]!
  const hi = sorted[Math.floor(sorted.length * LEVELS[1])]!
  const tone = luma.map((v) => clamp((v - lo) / Math.max(hi - lo, 1e-3)))
  const soft = blur(tone, cols, rows, SHARPEN.radius)
  for (let i = 0; i < tone.length; i++) tone[i] = clamp(tone[i]! + SHARPEN.amount * (tone[i]! - soft[i]!))
  const curve = meter(tone, METER, CURVE)
  return tone.map((v) => v ** curve)
}

// A blur about `radius` cells wide: three passes of a box blur, across then
// down, which is close to a gaussian.
function blur(src: Float32Array, cols: number, rows: number, radius: number): Float32Array {
  const a = Float32Array.from(src)
  const b = new Float32Array(a.length)
  const box = (from: Float32Array, to: Float32Array, n: number, lines: number, at: (line: number, i: number) => number) => {
    for (let line = 0; line < lines; line++) {
      let sum = 0
      let count = 0
      for (let i = -radius; i < n; i++) {
        if (i + radius < n) {
          sum += from[at(line, i + radius)]!
          count++
        }
        if (i - radius - 1 >= 0) {
          sum -= from[at(line, i - radius - 1)]!
          count--
        }
        if (i >= 0) to[at(line, i)] = sum / count
      }
    }
  }
  for (let pass = 0; pass < 3; pass++) {
    box(a, b, cols, rows, (y, x) => y * cols + x)
    box(b, a, rows, cols, (x, y) => y * cols + x)
  }
  return a
}

// The curve whose mean lights `target` of the cells, found by bisection and
// kept within the curve's limits.
function meter(tone: Float32Array, target: number, [low, high]: readonly [number, number]): number {
  let a = low
  let z = high
  for (let step = 0; step < 20; step++) {
    const g = (a + z) / 2
    let mean = 0
    for (let i = 0; i < tone.length; i++) mean += tone[i]! ** g
    if (mean / tone.length > target) a = g
    else z = g
  }
  return (a + z) / 2
}
