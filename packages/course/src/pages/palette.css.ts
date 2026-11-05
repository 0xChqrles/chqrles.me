import { paletteCss, paletteFaults } from '../lib/palette'

// The map's tones, mixed and checked at build time: a contrast that does not hold fails it.
export function GET() {
  const faults = paletteFaults()
  if (faults.length) throw new Error(`The map's colours do not hold:\n${faults.join('\n')}`)
  return new Response(paletteCss(), { headers: { 'Content-Type': 'text/css' } })
}
