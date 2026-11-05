import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// ONE CORNER LANGUAGE: two cut sizes (--c: 4px for keys and chips, 8px for panels), always at the
// top left and the bottom right; a plate is an octagon; no radius. Any other clip-path fails.
const css = readFileSync(new URL('../styles/course.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const OCT = 'polygon(29% 0, 71% 0, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0 71%, 0 29%)'
// split a polygon's points at its top-level commas
function points(v: string): string[] {
  const body = v.slice(v.indexOf('(') + 1, v.lastIndexOf(')'))
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of body) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && !depth) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}
// split a point into its x and y at the top-level space
function xy(p: string): [string, string] {
  let depth = 0
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '(') depth++
    if (p[i] === ')') depth--
    if (p[i] === ' ' && !depth) return [p.slice(0, i), p.slice(i + 1)]
  }
  return [p, '']
}
const cut = (s: string) => s.includes('var(--c)')
// TL+BR: (c,0) (100%,0) (100%,100%-c) (100%-c,100%) (0,100%) (0,c), each cut a function of --c
function tlbr(pts: string[]): boolean {
  if (pts.length !== 6) return false
  const [p0, p1, p2, p3, p4, p5] = pts.map(xy)
  return cut(p0![0]) && p0![1] === '0' && p1![0] === '100%' && p1![1] === '0' && p2![0] === '100%' && cut(p2![1]) && cut(p3![0]) && p3![1] === '100%' && p4![0] === '0' && p4![1] === '100%' && p5![0] === '0' && cut(p5![1])
}
// the focus ring: an outer TL+BR outline less an inner one (evenodd)
function ring(pts: string[]): boolean {
  if (pts[0] !== 'evenodd') return false
  const rest = pts.slice(1)
  return rest.length === 14 && rest.every((p) => /var\(--c\)|^(0|100%|2px|calc\(100% - 2px\)) /.test(p) || /^(0|100%|2px|calc\(100% - 2px\))$/.test(xy(p)[0]))
}

describe('the corner language', () => {
  it('cuts 4 or 8 px only', () => {
    const cs = [...css.matchAll(/--c:\s*([^;]+);/g)].map((m) => m[1]!.trim())
    expect(cs.length).toBeGreaterThan(0)
    expect(cs.filter((c) => c !== '4px' && c !== '8px')).toEqual([])
  })
  it('clips only at the top left and the bottom right (or a plate, or nothing)', () => {
    const bad = [...css.matchAll(/clip-path:\s*([^;]+);/g)]
      .map((m) => m[1]!.replace(/\s+/g, ' ').trim())
      .filter((v) => !(v === 'none' || v === 'inset(50%)' || v === OCT || (v.startsWith('polygon(') && (tlbr(points(v)) || ring(points(v))))))
    expect(bad).toEqual([])
  })
  it('has no radius', () => {
    expect([...css.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1]!.trim()).filter((v) => v !== '0')).toEqual([])
  })
})
