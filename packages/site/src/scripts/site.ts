// FACE B's one script. Every part is an enhancement: the pages read
// perfectly without it. Two things:
//   1. each section cue decodes its digits when it reaches the reading zone;
//   2. the playhead follows the reading, in reading time.
import { formatDuration } from '../lib/duration'

const still = matchMedia('(prefers-reduced-motion: reduce)').matches
const root = document.documentElement

// ── 1. Cues decode into place ───────────────────────────────────────────
// Stepped at 25 frames a second, not smoothed. Each digit churns until its
// turn to lock, left to right; the brackets never move. The mono is
// fixed-width with tabular figures, so nothing around it shifts.

const DECODE_MS = 600
const STEP_MS = 40

function decode(cue: HTMLElement) {
  const nodes: Text[] = []
  const walker = document.createTreeWalker(cue, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  const targets = nodes.map((node) => [...node.data])
  const digits: [number, number][] = []
  targets.forEach((chars, n) => chars.forEach((ch, c) => /\d/.test(ch) && digits.push([n, c])))

  const start = performance.now()
  const step = () => {
    const progress = (performance.now() - start) / DECODE_MS
    const locked = progress >= 1 ? digits.length : Math.floor(progress * digits.length)
    const frame = targets.map((chars) => [...chars])
    digits.forEach(([n, c], k) => {
      if (k >= locked) frame[n]![c] = String(Math.floor(Math.random() * 10))
    })
    nodes.forEach((node, n) => (node.data = frame[n]!.join('')))
    cue.classList.add('is-read')
    if (progress < 1) setTimeout(step, STEP_MS)
  }
  step()
}

const cues = document.querySelectorAll<HTMLElement>('.cue')
if (cues.length && !still && 'IntersectionObserver' in window) {
  root.classList.add('cues-wait')
  // The reading zone: a cue decodes once it has come a fifth of the way up.
  const watcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        watcher.unobserve(entry.target)
        decode(entry.target as HTMLElement)
      }
    },
    { rootMargin: '0px 0px -20% 0px' },
  )
  cues.forEach((cue) => watcher.observe(cue))
}

// ── 2. The playhead ─────────────────────────────────────────────────────
// Where you are, in reading time: the reading line (40% down the viewport)
// is placed between the section cues it sits between, and its time is
// interpolated between theirs.

const prose = document.querySelector<HTMLElement>('.prose[data-total]')
const total = Number(prose?.dataset.total)
if (prose && total > 0) {
  const heads = [...prose.querySelectorAll<HTMLElement>('h2[data-t]')]
  const bar = document.querySelector<HTMLElement>('.playhead')
  const timeline = document.querySelector<HTMLElement>('.timeline')
  const fill = timeline?.querySelector<HTMLElement>('.fill')
  const head = timeline?.querySelector<HTMLElement>('.head')
  const time = timeline?.querySelector<HTMLElement>('.time')

  for (const h of heads) {
    const tick = document.createElement('i')
    tick.className = 'tick'
    tick.style.top = `${(Number(h.dataset.t) / total) * 100}%`
    timeline?.append(tick)
  }

  let points: [number, number][] = []
  const pageY = (el: HTMLElement) => el.getBoundingClientRect().top + scrollY
  const measure = () => {
    const top = pageY(prose)
    points = [[top, 0], ...heads.map((h): [number, number] => [pageY(h), Number(h.dataset.t)]), [top + prose.offsetHeight, total]]
  }

  let queued = false
  const update = () => {
    queued = false
    const line = scrollY + innerHeight * 0.4
    let t = 0
    if (line >= points.at(-1)![0] || scrollY + innerHeight >= root.scrollHeight - 2) t = total
    else
      for (let i = 1; i < points.length; i++) {
        const [y0, t0] = points[i - 1]!
        const [y1, t1] = points[i]!
        if (line < y1) {
          t = line <= y0 ? t0 : t0 + ((line - y0) / (y1 - y0)) * (t1 - t0)
          break
        }
      }
    const share = t / total
    if (bar) bar.style.transform = `scaleX(${share})`
    if (fill) fill.style.transform = `scaleY(${share})`
    if (head) head.style.top = `${share * 100}%`
    if (time) time.textContent = formatDuration(Math.round(t))
  }
  const queue = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(update)
  }

  measure()
  update()
  root.classList.add('is-live')
  addEventListener('scroll', queue, { passive: true })
  new ResizeObserver(() => {
    measure()
    queue()
  }).observe(prose)
}
