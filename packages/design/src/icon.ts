import sharp from 'sharp'
import { isLit, markPath } from './mark'
import { CUE, GROUND, hex } from './palette'

// The site's icon: the mark in the cue colour (the tab is where you are) on an
// 8×8 tile of the ground, one cell in from the left and the top, its stem
// running off the tile's bottom edge.
const TILE = 8
const LEFT = 1
const TOP = 1

export function iconSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE} ${TILE}" shape-rendering="crispEdges">` +
    `<rect width="${TILE}" height="${TILE}" fill="${hex(GROUND)}"/>` +
    `<path transform="translate(${LEFT} ${TOP})" d="${markPath()}" fill="${hex(CUE)}"/></svg>`
  )
}

// A PNG of the tile at a whole number of pixels per cell, centred on a square
// of `size`, so every cell is an exact square whatever renders it.
export async function iconPng(size: number): Promise<Buffer> {
  const cell = Math.floor(size / TILE)
  const inset = Math.floor((size - TILE * cell) / 2)
  const pixels = Buffer.alloc(size * size * 3)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lit = x >= inset && y >= inset && isLit(Math.floor((x - inset) / cell) - LEFT, Math.floor((y - inset) / cell) - TOP)
      pixels.set(lit ? CUE : GROUND, (y * size + x) * 3)
    }
  }
  return sharp(pixels, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer()
}
