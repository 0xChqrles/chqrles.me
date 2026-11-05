// THE MAP'S COLOURS. Every tone of a region is one of the ten inks mixed into the ground (sRGB,
// as the stylesheet's region tokens are); a tone that must be read is mixed until it stands at
// its contrast. The peripheral set (a neighbour seen while another region is zoomed) is the same
// tone with 40 % less chroma, one value step down (OKLab). Vivid colour is spent on marks (icons,
// lit grooves, cleared plates, rims) and on one 10 % tint per region's land.
//
// `paletteCss()` writes the HUD's region tokens; a contrast that does not hold is a fault, and a
// fault fails the build (pages/palette.css.ts).

export const GROUND = '#0d0c15'
export const RAISE = '#161521'
export const HUD = '#100f1a'
export const LINE = '#2a2840'
export const LINE_STRONG = '#4a4664'
export const MUTED = '#9a95b2'
export const TEXT = '#d6d3e4'
export const INK = '#f2f0fa'
export const SOCKET = '#08070e'
// The field's marks outside every land.
export const FIELD = '#1c1a2a'
// The ten region inks: the same as `--hue` in styles/course.css (a test keeps them in step).
export const INKS = ['#ffd23c', '#ff9a3c', '#ff78c0', '#4fdc7c', '#8fa8ff', '#38c4ff', '#a6d94c', '#ff7f7a', '#2fe0d0', '#d48bff'] as const
// THE NEUTRAL groove, in a gutter between lands: a true grey (OKLCH chroma NEUTRAL_CHROMA at
// most), so no groove in a gutter reads as a region's: each region's wire stands NEUTRAL_DE or
// more from it (OKLab distance). Its channel is a dark grey.
export const NEUTRAL = '#737373'
export const NEUTRAL_CORE = '#17161c'
export const NEUTRAL_CHROMA = 0.01
export const NEUTRAL_DE = 0.12
// Every region's wire (its grooves, its rim) carries WIRE_CHROMA of OKLCH chroma at least: a
// groove reads as its region's at 1×, never as a grey.
export const WIRE_CHROMA = 0.06

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const toHex = (c: number[]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
// a mixed into b by t (t = 0 is a, t = 1 is b).
export const mix = (a: string, b: string, t: number) => toHex(hex(a).map((v, i) => v + (hex(b)[i]! - v) * t))
const lum = (h: string) => {
  const [r, g, b] = hex(h).map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
export const contrast = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
export function oklab(h: string): [number, number, number] {
  const [r, g, b] = hex(h).map((v) => {
    v /= 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
function fromLab([L, a, b]: [number, number, number]): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
  return '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(1, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)) * 255).toString(16).padStart(2, '0')).join('')
}
export const chroma = (h: string) => Math.hypot(oklab(h)[1], oklab(h)[2])
export const deltaE = (a: string, b: string) => Math.hypot(...oklab(a).map((v, i) => v - oklab(b)[i]!))

export type Tone = {
  ink: string // marks: lit grooves, cleared plates, frames of readable nodes, corner marks
  wire: string // a groove's rails inside its region; its land's rim
  core: string // an unlit groove's channel
  rim: string // frames at rest (soft, front)
  plate: string // a readable node's fill
  hi: string // its bevel's lit faces
  shade: string // its bevel's shaded faces
  fog: string // an unwritten icon
  fogd: string // the same, out of reach: a step under
  tint: string // the land: 10 % of the ink
  tintHi: string // the land pointed at
  dot: string // the land's texture dots
  dotHi: string // the same, pointed at
  num: string // the level's number
  sock: string // a socket's 1-px frame (a level not written, out of reach)
}
const until = (bg: string, ink: string, target: number, from = 0.2) => {
  for (let t = from; t <= 1.0001; t += 0.01) if (contrast(mix(bg, ink, t), bg) >= target) return mix(bg, ink, t)
  return ink
}
// The wire: the least mix of the ink that stands at 3.3:1 on the land's tint, NEUTRAL_DE from the
// neutral groove and WIRE_CHROMA of chroma.
const wireOf = (ink: string, tint: string) => {
  for (let t = 0.4; t <= 1.0001; t += 0.01) {
    const c = mix(GROUND, ink, t)
    if (contrast(c, tint) >= 3.3 && deltaE(c, NEUTRAL) >= NEUTRAL_DE && chroma(c) >= WIRE_CHROMA) return c
  }
  return ink
}
export function toneOf(ink: string): Tone {
  const tint = mix(GROUND, ink, 0.1)
  return {
    ink,
    wire: wireOf(ink, tint),
    core: mix(GROUND, ink, 0.16),
    rim: mix(GROUND, ink, 0.58),
    plate: mix(GROUND, ink, 0.42),
    hi: mix(GROUND, ink, 0.6),
    shade: mix(GROUND, ink, 0.27),
    fog: until(SOCKET, mix(GROUND, ink, 0.7), 3, 0.3),
    fogd: until(SOCKET, mix(GROUND, ink, 0.6), 3, 0.3),
    tint,
    tintHi: mix(GROUND, ink, 0.15),
    dot: mix(GROUND, ink, 0.26),
    dotHi: mix(GROUND, ink, 0.5),
    num: until(tint, ink, 4.5, 0.55),
    sock: mix(GROUND, ink, 0.34),
  }
}
// The peripheral tone: 40 % less chroma, one value step (0.07 L) down, never under the ground.
export const periph = (h: string) => {
  const [L, a, b] = oklab(h)
  return fromLab([Math.max(oklab(GROUND)[0], L - 0.07), a * 0.6, b * 0.6])
}
export const TONES: Tone[] = INKS.map((i) => toneOf(i))
export const PERIPH: Tone[] = TONES.map((t) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, periph(v)])) as Tone)

// Every contrast a tone must hold.
export function paletteFaults(): string[] {
  const out: string[] = []
  TONES.forEach((t, i) => {
    const c = (what: string, a: string, b: string, least: number) => {
      const r = contrast(a, b)
      if (r < least) out.push(`region h${i}: ${what} stands at ${r.toFixed(2)}:1 (${least}:1 at least)`)
    }
    c('its ink, on the ground', t.ink, GROUND, 7)
    c('its wire (a groove, the rim), on its land', t.wire, t.tint, 3)
    c('the ink, on a readable plate', INK, t.plate, 4.5)
    c('a fog icon, on its socket', t.fog, SOCKET, 3)
    c('a number, on its land', t.num, t.tint, 4.5)
    c('the ground (a cleared icon), on its ink', GROUND, t.ink, 4.5)
    c('an open groove (its ink), against a closed rail (its wire)', t.ink, t.wire, 1.6)
    const d = deltaE(NEUTRAL, t.wire)
    if (d < NEUTRAL_DE) out.push(`region h${i}: its wire stands ${d.toFixed(3)} from the neutral groove (${NEUTRAL_DE} at least)`)
    if (chroma(t.wire) < WIRE_CHROMA) out.push(`region h${i}: its wire has a chroma of ${chroma(t.wire).toFixed(3)} (${WIRE_CHROMA} at least)`)
  })
  if (chroma(NEUTRAL) > NEUTRAL_CHROMA) out.push(`the neutral groove (${NEUTRAL}) has a chroma of ${chroma(NEUTRAL).toFixed(3)} (${NEUTRAL_CHROMA} at most)`)
  if (contrast(NEUTRAL, GROUND) < 3) out.push(`the neutral groove stands at ${contrast(NEUTRAL, GROUND).toFixed(2)}:1 on the ground (3:1 at least)`)
  if (contrast(INK, NEUTRAL) < 3) out.push(`an open neutral groove (the ink) stands at ${contrast(INK, NEUTRAL).toFixed(2)}:1 against a closed one (3:1 at least)`)
  return out
}

// The HUD's region tokens, one rule per region: its ink, a lighter ink for hover, its wire, plate,
// rim, soft plate, fog icon and tint.
export function paletteCss(): string {
  return (
    "/* The HUD's region tokens, mixed from each region's ink at build time (lib/palette.ts). */\n" +
    TONES.map((t, i) => `.h${i}{--hi:${t.ink};--hi2:${mix(t.ink, INK, 0.3)};--hw:${t.wire};--hp:${t.plate};--hr:${t.rim};--hs:${mix(SOCKET, t.plate, 0.6)};--hf:${t.fog};--ht:${mix(GROUND, t.ink, 0.12)};--hn:${t.num}}`).join('\n') +
    '\n'
  )
}

// rgba() strings, cached (the page only).
const cache = new Map<string, string>()
export function rgba(h: string, a: number): string {
  if (a >= 1) return h
  const k = h + a.toFixed(3)
  let v = cache.get(k)
  if (!v) {
    const n = parseInt(h.slice(1), 16)
    v = `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`
    cache.set(k, v)
  }
  return v
}
