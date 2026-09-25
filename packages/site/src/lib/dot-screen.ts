// The dot screen: a photograph printed again in one ink, as a clustered-dot
// ordered screen at 45°. Pure arithmetic on a luma array, so the page script
// runs it on a canvas and a build step can run it on sharp's raw pixels.
//
// The tile is a whole number of device pixels and holds two dots, one on its
// corners and one in its middle: a square lattice turned 45°. Each dot grows
// from its centre, one pixel per step of tone: a brighter photo prints a
// bigger dot of ink.

// CSS pixels per tile: the dots sit 4/√2 ≈ 2.83px apart on the diagonal.
export const TILE_CSS = 4

// An even tile, so the middle dot sits on a whole pixel; never under 6, or a
// dot has too few pixels to say a tone.
export function tileFor(dpr: number): number {
  return Math.max(6, 2 * Math.round((TILE_CSS * dpr) / 2))
}

// The order in which a tile's pixels print, as thresholds in 0..1.
export function dotOrder(tile: number): Float32Array {
  const middle = tile / 2
  const centres = [
    [0, 0],
    [tile, 0],
    [0, tile],
    [tile, tile],
    [middle, middle],
  ] as const
  const dots: { i: number; rank: number }[][] = [[], []]
  for (let y = 0; y < tile; y++)
    for (let x = 0; x < tile; x++) {
      let best = Infinity
      let dot = 0
      let angle = 0
      centres.forEach(([cx, cy], k) => {
        const d = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2
        if (d < best) [best, dot, angle] = [d, k === 4 ? 1 : 0, Math.atan2(y + 0.5 - cy, x + 0.5 - cx)]
      })
      // Nearest the centre first; the angle only breaks ties, so dots grow round.
      dots[dot]!.push({ i: y * tile + x, rank: best + angle * 1e-4 })
    }
  const threshold = new Float32Array(tile * tile)
  for (const pixels of dots) {
    pixels.sort((a, b) => a.rank - b.rank)
    pixels.forEach(({ i }, r) => (threshold[i] = (r + 0.5) / pixels.length))
  }
  return threshold
}

// A box blur of radius r, in two passes: the base of an unsharp mask.
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  const span = 2 * r + 1
  const at = (v: number, max: number) => (v < 0 ? 0 : v > max ? max : v)
  for (let y = 0; y < h; y++) {
    let acc = 0
    for (let x = -r; x <= r; x++) acc += src[y * w + at(x, w - 1)]!
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / span
      acc += src[y * w + at(x + r + 1, w - 1)]! - src[y * w + at(x - r, w - 1)]!
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0
    for (let y = -r; y <= r; y++) acc += tmp[at(y, h - 1) * w + x]!
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / span
      acc += tmp[at(y + r + 1, h - 1) * w + x]! - tmp[at(y - r, h - 1) * w + x]!
    }
  }
  return out
}

// The luma below which `share` of the pixels fall.
function percentile(luma: Float32Array, share: number): number {
  const histogram = new Uint32Array(256)
  for (const v of luma) histogram[v < 0 ? 0 : v > 255 ? 255 : v | 0]!++
  let seen = 0
  for (let v = 0; v < 256; v++) {
    seen += histogram[v]!
    if (seen >= luma.length * share) return v
  }
  return 255
}

// luma: 0..255 per pixel, w × h. Returns 1 where the ink prints, 0 elsewhere.
export function dotScreen(luma: Float32Array, w: number, h: number, tile: number): Uint8Array {
  // Unsharp mask at the scale of the screen, so edges survive the dots.
  const soft = boxBlur(luma, w, h, tile)
  const sharp = luma.map((v, i) => v + 0.8 * (v - soft[i]!))
  // Levels: the darkest 1% prints nothing, the brightest 1% prints solid.
  const lo = percentile(sharp, 0.01)
  const hi = Math.max(lo + 1, percentile(sharp, 0.99))
  const threshold = dotOrder(tile)
  const ink = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = (y % tile) * tile
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      // A touch more contrast, then midtones sink toward the black card: the
      // white ink prints the light, and the sleeve stays a dark object.
      const tone = Math.min(1, Math.max(0, 0.5 + ((sharp[i]! - lo) / (hi - lo) - 0.5) * 1.1)) ** 1.7
      ink[i] = tone > threshold[row + (x % tile)]! ? 1 : 0
    }
  }
  return ink
}
