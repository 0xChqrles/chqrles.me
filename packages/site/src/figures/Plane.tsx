import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatNumber, type Lang } from './format'

// A plane: points on two axes, optionally linked, drawn as vectors, moved by
// the reader, or switched between arrangements. Coordinates are percentages of
// a square, so the drawing scales with the column while its type keeps its
// size, and everything is an attribute: nothing needs an inline style.

export interface Point {
  id: string
  label?: string
  x: number
  y: number
}

export interface Link {
  from: string
  to: string
  // The distance between the two points, written at the link's middle.
  distance?: boolean
}

export interface Arrangement {
  label: string
  points: Point[]
}

export interface PlaneProps {
  // The points, or several arrangements of the same points (same ids) that the
  // reader switches between.
  points?: Point[]
  states?: Arrangement[]
  links?: Link[]
  // Each point is drawn as a vector from the origin.
  arrows?: boolean
  // Each labelled point shows its coordinates.
  coordinates?: boolean
  // The reader moves the points: drag one, or focus it and use the arrow keys.
  move?: boolean
  // The visible square; by default it fits every point with some room.
  domain?: { x: [number, number]; y: [number, number] }
  // Decimals written for coordinates and distances.
  digits?: number
  lang?: Lang
}

type Positions = Record<string, { x: number; y: number }>

const TWEEN_FRAMES = 12
const TWEEN_MS = 40

export default function Plane({ points, states, links = [], arrows = false, coordinates = false, move = false, domain, digits = 1, lang = 'fr' }: PlaneProps) {
  const arrangements = states ?? [{ label: '', points: points ?? [] }]
  const all = arrangements.flatMap((a) => a.points)
  const box = domain ?? fit(all, arrows)
  const [x0, x1] = box.x
  const [y0, y1] = box.y
  const first = arrangements[0]!.points
  const labels = Object.fromEntries(first.map((p) => [p.id, p.label]))

  const [state, setState] = useState(0)
  const [at, setAt] = useState<Positions>(() => positions(first))
  const [active, setActive] = useState<string | null>(null)
  const dragging = useRef<string | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const timer = useRef<number | undefined>(undefined)
  // Points become controls once the island runs; before, they are a drawing.
  const [live, setLive] = useState(false)
  useEffect(() => setLive(true), [])
  useEffect(() => () => window.clearInterval(timer.current), [])
  // Chromium ignores touch-action on SVG children, so a finger on a point would
  // scroll the page: a touch that starts on a point is kept for the drag.
  useEffect(() => {
    const el = svg.current
    if (!move || !el) return
    const hold = (e: TouchEvent) => {
      if (e.target instanceof Element && e.target.closest('.plane-point')) e.preventDefault()
    }
    el.addEventListener('touchstart', hold, { passive: false })
    return () => el.removeEventListener('touchstart', hold)
  }, [move])

  const X = (x: number) => `${((x - x0) / (x1 - x0)) * 100}%`
  const Y = (y: number) => `${((y1 - y) / (y1 - y0)) * 100}%`
  const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v))
  const place = (id: string, x: number, y: number) => setAt((now) => ({ ...now, [id]: { x: clamp(x, box.x), y: clamp(y, box.y) } }))
  const fmt = (v: number) => formatNumber(v, lang, digits)

  // Switching arrangements travels, stepped and eased out; reduced motion lands at once.
  const show = (next: number) => {
    setState(next)
    const target = positions(arrangements[next]!.points)
    window.clearInterval(timer.current)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setAt(target)
    const from = at
    let frame = 0
    timer.current = window.setInterval(() => {
      frame += 1
      const k = 1 - (1 - frame / TWEEN_FRAMES) ** 3
      setAt(Object.fromEntries(Object.entries(target).map(([id, t]) => [id, { x: lerp(from[id]?.x ?? t.x, t.x, k), y: lerp(from[id]?.y ?? t.y, t.y, k) }])))
      if (frame >= TWEEN_FRAMES) window.clearInterval(timer.current)
    }, TWEEN_MS)
  }

  // Letting go ends the drag; the cue stays only while the point has keyboard focus.
  const release = (e: PointerEvent<SVGGElement>) => {
    dragging.current = null
    if (document.activeElement !== e.currentTarget) setActive(null)
  }

  const drag = (e: PointerEvent<SVGGElement>, id: string) => {
    if (dragging.current !== id || !svg.current) return
    const r = svg.current.getBoundingClientRect()
    place(id, x0 + ((e.clientX - r.left) / r.width) * (x1 - x0), y1 - ((e.clientY - r.top) / r.height) * (y1 - y0))
  }

  const nudge = (e: KeyboardEvent<SVGGElement>, id: string) => {
    const step = ((x1 - x0) / 50) * (e.shiftKey ? 5 : 1)
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key]
    if (!d) return
    e.preventDefault()
    const p = at[id]!
    place(id, p.x + d[0]!, p.y + d[1]!)
  }

  const ticks = { x: steps(x0, x1), y: steps(y0, y1) }

  return (
    <div className={move ? 'plane plane-move' : 'plane'}>
      {states && (
        <div className="plane-states" role="group">
          {states.map((s, i) => (
            <button key={s.label} type="button" aria-pressed={i === state} disabled={!live} onClick={() => show(i)}>
              {s.label}
            </button>
          ))}
        </div>
      )}
      <div className="plane-square">
        <svg ref={svg} className="plane-svg" width="100%" height="100%" overflow="visible">
          <g className="plane-grid" aria-hidden="true">
            {ticks.x.map((v) => (
              <line key={`x${v}`} x1={X(v)} x2={X(v)} y1="0%" y2="100%" />
            ))}
            {ticks.y.map((v) => (
              <line key={`y${v}`} y1={Y(v)} y2={Y(v)} x1="0%" x2="100%" />
            ))}
          </g>
          {arrows && (
            <g className="plane-axes" aria-hidden="true">
              <line x1={X(0)} x2={X(0)} y1="0%" y2="100%" />
              <line y1={Y(0)} y2={Y(0)} x1="0%" x2="100%" />
            </g>
          )}
          {links.map(({ from, to, distance }) => {
            const a = at[from]
            const b = at[to]
            if (!a || !b) return null
            // The distance sits beside the link, on its lower side: a point's
            // words are written above it. The square keeps the domain's
            // proportions, so the offset comes from the data alone.
            const ux = (b.x - a.x) / (x1 - x0)
            const uy = (a.y - b.y) / (y1 - y0)
            const norm = Math.hypot(ux, uy) || 1
            const down = ux >= 0 ? 1 : -1
            const nx = (-uy / norm) * down
            const ny = (ux / norm) * down
            return (
              <g key={`${from}-${to}`} className="plane-link">
                <line x1={X(a.x)} y1={Y(a.y)} x2={X(b.x)} y2={Y(b.y)} />
                {distance && (
                  <svg x={X((a.x + b.x) / 2)} y={Y((a.y + b.y) / 2)} overflow="visible">
                    <text className="plane-distance" textAnchor="middle" dx={nx * 12} dy={ny * 12 + 4}>
                      {fmt(Math.hypot(a.x - b.x, a.y - b.y))}
                    </text>
                  </svg>
                )}
              </g>
            )
          })}
          {arrows &&
            Object.entries(at).map(([id, p]) => (
              <g key={`v${id}`} className="plane-vector">
                <line x1={X(0)} y1={Y(0)} x2={X(p.x)} y2={Y(p.y)} />
                {/* The head, turned along the vector (the square keeps the proportions). */}
                <svg x={X(p.x)} y={Y(p.y)} overflow="visible">
                  <path d="M0 0L-8 -3.5L-8 3.5z" transform={`rotate(${(Math.atan2(-(p.y / (y1 - y0)), p.x / (x1 - x0)) * 180) / Math.PI})`} />
                </svg>
              </g>
            ))}
          {Object.entries(at).map(([id, p]) => {
            const label = labels[id]
            if (arrows && !label && !move) return null
            // Near the right edge, the words go to the point's left.
            const left = (p.x - x0) / (x1 - x0) > 0.62
            const side = { x: left ? -10 : 10, textAnchor: left ? 'end' : 'start' } as const
            return (
              <svg key={id} x={X(p.x)} y={Y(p.y)} overflow="visible">
                <g
                  className={active === id ? 'plane-point is-active' : 'plane-point'}
                  tabIndex={move && live ? 0 : undefined}
                  role={move && live ? 'button' : undefined}
                  aria-roledescription={move && live ? 'point' : undefined}
                  aria-label={label || move ? `${label ?? id}, x ${fmt(p.x)}, y ${fmt(p.y)}` : undefined}
                  onPointerDown={(e) => {
                    if (!move) return
                    // A drag moves the point; it never selects the label.
                    e.preventDefault()
                    e.currentTarget.setPointerCapture(e.pointerId)
                    dragging.current = id
                    setActive(id)
                  }}
                  onPointerMove={(e) => drag(e, id)}
                  onPointerUp={release}
                  onPointerCancel={release}
                  onLostPointerCapture={release}
                  onFocus={() => setActive(id)}
                  onBlur={() => setActive(null)}
                  onKeyDown={(e) => move && nudge(e, id)}
                >
                  {!arrows && <rect x="-4" y="-4" width="8" height="8" />}
                  {move && <rect className="plane-hit" x="-16" y="-16" width="32" height="32" />}
                  {label && (
                    <text className="plane-label" x={side.x} y="-9" textAnchor={side.textAnchor}>
                      {label}
                    </text>
                  )}
                  {label && coordinates && (
                    <text className="plane-coords" x={side.x} y="16" textAnchor={side.textAnchor}>
                      {`${fmt(p.x)} ; ${fmt(p.y)}`}
                    </text>
                  )}
                </g>
              </svg>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function positions(points: Point[]): Positions {
  return Object.fromEntries(points.map((p) => [p.id, { x: p.x, y: p.y }]))
}

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k
}

// A square around every point, with a margin; with arrows it holds the origin.
function fit(points: Point[], origin: boolean): { x: [number, number]; y: [number, number] } {
  const xs = points.map((p) => p.x).concat(origin ? [0] : [])
  const ys = points.map((p) => p.y).concat(origin ? [0] : [])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  const half = (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1) / 2) * 1.35
  return { x: [cx - half, cx + half], y: [cy - half, cy + half] }
}

// Grid lines on round values (1, 2 or 5 times a power of ten), about six across.
function steps(lo: number, hi: number): number[] {
  const raw = (hi - lo) / 6
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw)!
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(10)))
  return out
}
