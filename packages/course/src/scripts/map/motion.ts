// MOTION TOKENS (direction 1.7) and a small tween store. Every state change is a tween keyed by
// what it moves; the frame loop runs only while a tween, an effect or an idle loop needs it.
import { bezier, ease as inout } from '../../lib/camera'

export const out = bezier(0.2, 0.8, 0.2, 1)
export const easeIn = bezier(0.55, 0, 1, 0.45)
export const back = bezier(0.34, 1.56, 0.64, 1)
export const linear = (t: number) => t
export { inout }
export const T = { hover: 120, hoverOut: 90, pressDown: 90, pressUp: 180, state: 220, panelIn: 240, panelOut: 140, reveal: 360, camIn: 480, camTravel: 520, camOut: 420, stagger: 24, staggerNode: 32, staggerCap: 240, reward: 1800, bob: 600, breathe: 2400, focusIn: 140 }

export const still = matchMedia('(prefers-reduced-motion: reduce)')
export let now = performance.now()
export const tick = (t: number) => (now = t)

type Tw = { from: number; to: number; t0: number; dur: number; ease: (t: number) => number }
const tws = new Map<string, Tw>()
export function val(k: string, d = 0): number {
  const t = tws.get(k)
  if (!t) return d
  const p = t.dur <= 0 ? 1 : Math.min(1, Math.max(0, (now - t.t0) / t.dur))
  return p <= 0 ? t.from : t.from + (t.to - t.from) * t.ease(p)
}
// A key's value before it was ever moved: 1 for scales and shares that rest at 1, 0 for the rest
// (a lift, a ring, a hover): a first hover tweens from rest, never lands at once.
const REST1 = /^(sec|pr|pop|stamp|flood|dash):/
export const restOf = (k: string) => (REST1.test(k) ? 1 : 0)
// Move `k` to `to` over `dur` (from its current value, or `from`), after `delay`.
export function tw(k: string, to: number, dur: number, e = out, from?: number, delay = 0) {
  const f = from ?? val(k, restOf(k))
  if (still.matches) dur = 0
  tws.set(k, { from: f, to, t0: now + (still.matches ? 0 : delay), dur, ease: e })
}
export const set = (k: string, v: number) => tws.set(k, { from: v, to: v, t0: 0, dur: 0, ease: linear })
export const busy = () => {
  for (const t of tws.values()) if (now < t.t0 + t.dur) return true
  return false
}
// A press: down to `lo` in 60 ms, then back past 1 to rest in 180 ms (≈ 10 % overshoot).
export function press(k: string, lo = 0.94) {
  tw(k, lo, T.pressDown, linear)
}
export function release(k: string) {
  tw(k, 1, T.pressUp, back)
}
