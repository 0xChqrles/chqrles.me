import { isLit } from '@chqrles/design/mark'
import sharp from 'sharp'

// The same tile as the favicon, at whole pixels per cell.
export async function GET() {
  const size = 180
  const cell = Math.floor(size / 8)
  const inset = Math.floor((size - 8 * cell) / 2)
  const px = Buffer.alloc(size * size * 3)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const lit = x >= inset && y >= inset && isLit(Math.floor((x - inset) / cell) - 1, Math.floor((y - inset) / cell) - 1)
      px.set(lit ? [0xf2, 0xf0, 0xfa] : [0x0d, 0x0c, 0x15], (y * size + x) * 3)
    }
  const png = await sharp(px, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer()
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } })
}
