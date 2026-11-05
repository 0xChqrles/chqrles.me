// THE CAMERA's motion, shared by the page (scripts/map) and the build's audit. Where it frames is
// lib/place.ts; how it flies is here.
//
// A FLIGHT: the scale moves in log space and the point it is about moves straight across the
// screen, both on one ease-in-out, so the reader follows where they go: no dead start, no snap.
// The audit samples it (FLIGHT_CHECK): at a quarter of the time it has covered 15 to 40% of the
// way, at half the time 40 to 65%.
export const EASE = [0.32, 0, 0.5, 1] as const
export const FLIGHT = { in: 480, travel: 520, out: 420 }
export const FLIGHT_CHECK: [number, number, number][] = [
  [0.25, 0.15, 0.4],
  [0.5, 0.4, 0.65],
]
export function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const X = (s: number) => ((ax * s + bx) * s + cx) * s
  const Y = (s: number) => ((ay * s + by) * s + cy) * s
  return (t: number) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    let lo = 0
    let hi = 1
    for (let i = 0; i < 30; i++) {
      const m = (lo + hi) / 2
      if (X(m) < t) lo = m
      else hi = m
    }
    return Y((lo + hi) / 2)
  }
}
export const ease = bezier(...EASE)
export const flightFaults = () => FLIGHT_CHECK.filter(([t, lo, hi]) => ease(t) < lo || ease(t) > hi).map(([t, lo, hi]) => `the flight covers ${Math.round(ease(t) * 100)}% of its way at ${t * 100}% of its time (${lo * 100} to ${hi * 100}%)`)
// The first frame of a flight already covers EARLY of its way: feedback before motion.
export const EARLY = 0.1
