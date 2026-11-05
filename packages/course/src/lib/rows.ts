import type { Level } from './game'
import { miniNode } from './glyphs'
import { cellsHtml, cleared, icon, levelIcon, runs, statesSvg } from './pixels'
import { url } from './base'

// A level's mark in a list: its own icon, coloured by its state (the panel's, the sheet's, the
// level page's lists and the popover all use it); a card with no icon keeps the state icon.
export const rowIcon = (o: Level) => (o.icon ? levelIcon(o.icon, 2) : statesSvg(2))
// A row for a level in a list: its icon in its state, its number, its name. A door also says
// how hard it is, and when it is not written yet.
export const row = (o: Level, door = false) =>
  `<li class="row h${o.hue}${o.prevu ? ' prevu' : ''}${door ? ' door' : ''}" data-lv="${o.id}">` +
  (o.prevu ? '<span class="t">' : `<a href="${url(`${o.id}/`)}">`) +
  rowIcon(o) +
  `<span class="lbl-n num">${o.label}</span><span class="nm">${o.nom}</span>` +
  (door ? cellsHtml(o.complexite) + (o.prevu ? '<em>Pas encore écrit.</em>' : '') : '') +
  (o.prevu ? '</span>' : '</a>') +
  '</li>'

// One cell per level, the one being read marked.
export const meter = (ids: string[], me: string) => `<span class="meter">${ids.map((id) => `<i data-lv="${id}"${id === me ? ' class="moi"' : ''}></i>`).join('')}</span>`

// Each callout and derivation carries its pixel, so its kind shows before its words.
const KINDS = ['piege', 'note', 'incertain', 'code'] as const
export const withIcons = (html: string) =>
  html
    .replace(/<div class="bloc (piege|note|incertain|code)"><span class="tag">/g, (m, k: (typeof KINDS)[number]) => m + icon(k, 2))
    .replace(/<details class="der"><summary>/g, (m) => m + icon('derivation', 2))

// The rows of a cleared tile of side s, one path each, top to bottom, to fill it a row at a time.
export function fillRows(s: number): string[] {
  const c = (s - 1) / 2 + 1
  const cells = [...cleared(c, c, s)]
  return [...Array(s + 2).keys()].map((y) => runs(cells.filter((k) => k.endsWith(`,${y}`)))).filter(Boolean)
}

// THE BRIEFING'S ROW, on a level page too (the clear's « Ce que ça débloque »): the mini node in
// its state (painted by the script from `data-st`), the number, the name, the state's word.
export function mnRow(o: Level, icons: string[] | null): string {
  const mn = miniNode(icons, o.hue, o.prevu ? 'fog' : 'dispo', 32).replace('<svg ', `<svg data-st="${o.id}" `)
  const inner = `${mn}<span class="row-n num">${o.label}</span><span class="row-t">${o.nom}</span><span class="row-s">${o.prevu ? 'Pas encore écrit.' : ''}</span>`
  return `<li class="row way h${o.hue}" data-lv="${o.id}">${o.prevu ? `<span class="a">${inner}</span>` : `<a href="${url(`${o.id}/`)}">${inner}</a>`}</li>`
}
// THE CLEAR'S PLATE: the map's plate for a level at the goal's size (96), cut and bevelled as on
// the map, with the flood, the charge round its frame and the cleared ring drawn inside it. The
// stylesheet runs the beat when the reader claims it.
export function plateSvg(o: Level, F = 96): string {
  const k = (h: number) => Math.round(h * (2 - Math.SQRT2))
  const oct = (i: number) => {
    const a = i
    const b = F - i
    const c = k((F - 2 * i) / 2)
    return `${a + c},${a} ${b - c},${a} ${b},${a + c} ${b},${b - c} ${b - c},${b} ${a + c},${b} ${a},${b - c} ${a},${a + c}`
  }
  const cell = 6
  const off = (F - 11 * cell) / 2
  const P = F + 16
  const len = Math.round(8 * (F + 8) * Math.tan(Math.PI / 8))
  return (
    `<svg class="fp" width="${P}" height="${P}" viewBox="-8 -8 ${P} ${P}" aria-hidden="true">` +
    `<polygon class="fp-c" points="${oct(-4)}" stroke-dasharray="${len}" stroke-dashoffset="${len}"/>` +
    `<polygon class="fp-f" points="${oct(0)}"/>` +
    `<polygon class="fp-p" points="${oct(3)}"/>` +
    (o.icon ? `<path class="fp-i" transform="translate(${off} ${off}) scale(${cell})" d="${o.icon}"/>` : '') +
    // cleared: an inner ring in the ground, drawn round inside the plate from 12 o'clock
    `<polygon class="fp-k" points="${oct(7)}" pathLength="100"/>` +
    `</svg>`
  )
}
