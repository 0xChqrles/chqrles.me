// A course's one script. Every part is an enhancement: the pages read without it.
// The game's states and the save are in ./save; the home's map is ./map.
import { norm } from '../lib/norm'
import { rowIcon } from '../lib/rows'
import { icon } from '../lib/pixels'
import { lowerOct } from '../lib/glyphs'
import { etat, force, L, load, missing, reached, S, share, store, type Ici, WORLD } from './save'
import { ETATS } from '../lib/tree'
import { mapPage } from './map/map'
import { url } from '../lib/base'

declare global {
  // Set by /search.js: each written card's id and its text.
  var RECHERCHE: [string, string][] | undefined
}

const $ = <E extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<E>(s)
const all = <E extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll<E>(s)]
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const still = matchMedia('(prefers-reduced-motion: reduce)')

function paintStates(root: ParentNode = document) {
  for (const el of all('[data-lv],[data-st]', root)) {
    const id = el.dataset.lv ?? el.dataset.st!
    if (!L[id]) continue
    const e = etat(id)
    for (const x of ETATS) el.classList.toggle(`e-${x}`, x === e)
    // a mini node begun: its lower part filled to its share, as on the map
    const g = el.querySelector('.mn-g')
    if (g) g.setAttribute('points', lowerOct(Number(el.getAttribute('width')), 2, share(id)))
  }
  // A gate's rows: the ones its level still lacks are marked.
  for (const ul of all('[data-gate]', root)) {
    const lack = new Set(missing(ul.dataset.gate!))
    for (const r of all('[data-lv]', ul)) r.classList.toggle('miss', lack.has(r.dataset.lv!))
  }
  // A level part read fills from the bottom, a row per share of its checkpoints.
  for (const r of all<SVGRectElement>('[data-fin] .t-prog', root)) {
    const id = (r.closest('[data-fin]') as HTMLElement).dataset.fin!
    const n = L[id]!.sections.length
    const k = n ? Math.round((reached(id).length / n) * Number(r.dataset.h)) : 0
    r.setAttribute('height', String(k))
    r.setAttribute('y', String(Number(r.dataset.top) + Number(r.dataset.h) - k))
  }
  for (const el of all('[data-pc]', root)) {
    const id = el.dataset.pc!
    el.textContent = `${reached(id).length}/${L[id]!.sections.length}`
  }
}

// A LEVEL BEING READ. Locked (its gate unmet, lib/gate.ts), it shows its gate and the key that
// opens it anyway instead of its text, its checkpoints and its tick: /boot.js decides it before the
// first paint, the save here keeps it true (a page come back to from the history included).
const main = $('#main[data-level]')
const root = document.documentElement
function level(id: string) {
  const l = L[id]!
  const locked = () => etat(id) === 'verrou'
  const heads = l.sections.map((s) => document.getElementById(s)).filter((h): h is HTMLElement => !!h)
  const line = () => innerHeight * 0.3
  let current = ''
  let lastY = scrollY
  const ici = () => store.set('ici', { c: id, ...(current && { s: current }) })

  function paint() {
    root.classList.toggle('locked', locked())
    paintStates()
    const got = new Set(reached(id))
    for (const el of all('[data-sec]')) {
      el.classList.toggle('got', got.has(el.dataset.sec!))
      el.classList.toggle('here', el.dataset.sec === current)
    }
    const cont = $<HTMLAnchorElement>(`[data-cont="${id}"]`)
    const back = store.get<Ici | null>('ici', null)
    if (cont) {
      const s = back?.c === id && back.s && !S.lus.has(id) ? back.s : ''
      cont.hidden = !s || scrollY > 200
      if (s) cont.href = `#${s}`
    }
  }

  // A checkpoint is reached when the reader scrolls its heading across the reading line,
  // not when a link jumps past it.
  function onScroll() {
    if (locked()) return paint()
    const y = scrollY
    const from = lastY + line()
    const to = y + line()
    const crossed = Math.abs(y - lastY) < innerHeight * 1.5 && y > lastY
    lastY = y
    let changed = false
    const got = new Set(reached(id))
    for (const h of heads) {
      const top = h.getBoundingClientRect().top + y
      if (crossed && top > from - 1 && top <= to && !got.has(h.id)) {
        got.add(h.id)
        changed = true
      }
    }
    const now = heads.filter((h) => h.getBoundingClientRect().top <= line()).pop()?.id ?? ''
    if (changed) {
      S.points = store.get('points', {})
      S.points[id] = l.sections.filter((s) => got.has(s))
      store.set('points', S.points)
    }
    if (changed || now !== current) {
      current = now
      ici()
      paint()
    } else paint()
  }
  let ticking = false
  addEventListener(
    'scroll',
    () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        onScroll()
      })
    },
    { passive: true },
  )
  // Arriving keeps where the reader stopped in this level, for « Continuer », until they read on;
  // a locked level is not where they stopped.
  if (!locked() && store.get<Ici | null>('ici', null)?.c !== id) ici()
  paint()
  // « Lire quand même »: the level opens for good, at its text.
  $(`[data-force="${id}"]`)?.addEventListener('click', () => {
    force(id)
    ici()
    paint()
    const col = $('.col', main!)
    if (col) {
      col.tabIndex = -1
      col.focus({ preventScroll: true })
    }
  })

  // ← and → turn the page, as a book does.
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    if ((e.target as Element).closest('input,textarea,select,[contenteditable],summary,.katex-display,pre,.tw')) return
    const a = $<HTMLAnchorElement>(e.key === 'ArrowLeft' ? '.hud-pn [rel=prev]' : e.key === 'ArrowRight' ? '.hud-pn [rel=next]' : 'x-none')
    if (a) location.href = a.href
  })
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return
    load()
    paint()
  })
}

// THE CLEAR: the reader's own claim, and what it opens. It stays reversible.
document.addEventListener('change', (e) => {
  const i = (e.target as Element).closest<HTMLInputElement>('input[data-lu]')
  if (!i) return
  const id = i.dataset.lu!
  const before = new Map(WORLD.levels.map((l) => [l.id, etat(l.id)]))
  S.lus = new Set(store.get<string[]>('lus', []))
  if (i.checked) S.lus.add(id)
  else S.lus.delete(id)
  store.set('lus', [...S.lus])
  const fin = $(`[data-fin="${id}"]`)!
  fin.classList.toggle('won', i.checked)
  fin.classList.toggle('settled', !i.checked || still.matches)
  // The doors that this clear opened say so, once.
  for (const row of all('.way', fin)) {
    const o = row.dataset.lv!
    const opened = i.checked && before.get(o) !== etat(o) && ['dispo', 'front'].includes(etat(o))
    row.classList.toggle('ouvre', opened)
    $('.nv', row)?.remove()
    // an unlock row shows one state: « Nouveau » takes the state's place
    const st = $('.row-s', row)
    if (st) {
      st.dataset.was ??= st.textContent ?? ''
      st.textContent = opened ? '' : st.dataset.was
    }
    if (opened) row.firstElementChild!.insertAdjacentHTML('beforeend', `<span class="nv">${icon('new', 2)}Nouveau</span>`)
  }
  paintStates()
  paintLists()
})

function paintLists() {
  for (const i of all<HTMLInputElement>('input[data-lu]')) {
    i.checked = S.lus.has(i.dataset.lu!)
    $(`[data-fin="${i.dataset.lu}"]`)?.classList.toggle('won', i.checked)
  }
  paintStates()
}

// Popover on concept links, and on notions that have no page yet.
const pop = $('#pop')!
function popover(e: Event) {
  const a = (e.target as Element).closest<HTMLElement>('.c')
  if (!a) {
    pop.hidden = true
    return
  }
  const c = L[a.dataset.c!]
  if (!c) return
  pop.className = `h${c.hue}`
  pop.innerHTML = `<span class="p-id">${rowIcon(c)}${c.label ? `<span class="num">${c.label}</span>` : ''}</span><b>${esc(c.titre)}</b>${c.resume}${c.prevu ? '<em>Pas encore écrit.</em>' : ''}`
  pop.dataset.lv = c.id
  paintStates(pop.parentElement!)
  pop.hidden = false
  const r = a.getBoundingClientRect()
  const w = pop.offsetWidth
  const h = pop.offsetHeight
  pop.style.left = `${Math.max(8, Math.min(r.left + scrollX, scrollX + innerWidth - w - 8))}px`
  pop.style.top = `${r.top - h - 8 > 0 ? r.top + scrollY - h - 8 : r.bottom + scrollY + 8}px`
}
document.addEventListener('mouseover', popover)
document.addEventListener('focusin', popover)

// THE PLAN: every level, and the search. The text arrives with the first keystroke,
// as a script: the CSP allows no fetch.
const q = $<HTMLInputElement>('#q')!
function filtre() {
  const mot = norm(q.value.trim())
  const hit = new Set(self.RECHERCHE!.filter(([, t]) => t.includes(mot)).map(([id]) => id))
  for (const a of all('[data-nav]')) a.hidden = mot !== '' && !hit.has(a.dataset.nav!)
}
let charge = false
function cherche() {
  if (self.RECHERCHE) filtre()
  else if (!charge) {
    charge = true
    const s = document.createElement('script')
    s.src = url('search.js')
    s.onload = filtre
    s.onerror = () => {
      charge = false
    }
    document.head.append(s)
  }
}
q.addEventListener('input', cherche)

const planche = $('#planche')!
const bouton = $('#plan')
function closePlan() {
  planche.classList.remove('open')
  bouton?.setAttribute('aria-expanded', 'false')
}
bouton?.addEventListener('click', () => {
  const open = planche.classList.toggle('open')
  bouton.setAttribute('aria-expanded', String(open))
  if (open) q.focus()
})
$('#ferme')?.addEventListener('click', () => {
  closePlan()
  bouton?.focus()
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && planche.classList.contains('open')) {
    closePlan()
    bouton?.focus()
  }
})
planche.addEventListener('click', (e) => {
  if ((e.target as Element).closest('a')) closePlan()
})
// On the home the plan is a dialog over the map: the head's search key opens it, its close key,
// Escape or a link in it closes it, and the focus goes back to the key.
const home = $('.home')
const cle = $('#cherche')
function plan(open: boolean) {
  if (!home || !cle) return
  home.classList.toggle('open', open)
  cle.setAttribute('aria-expanded', String(open))
  if (open) q.focus({ preventScroll: true })
  else cle.focus({ preventScroll: true })
}
cle?.addEventListener('click', (e) => {
  e.preventDefault()
  plan(!home!.classList.contains('open'))
})
$('#plan-x')?.addEventListener('click', () => plan(false))
home?.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.stopPropagation()
    plan(false)
  }
})
home?.addEventListener('click', (e) => {
  if ((e.target as Element).closest('a[href^="/"]')) home.classList.remove('open')
})

// Leaving a page for the map says where the reader was, so the map opens there.
load()
paintLists()
if (document.getElementById('pane')) mapPage()
if (main) level(main.dataset.level!)
addEventListener('pageshow', (e) => {
  if (!e.persisted) return
  load()
  paintLists()
  if (q.value) cherche()
})
