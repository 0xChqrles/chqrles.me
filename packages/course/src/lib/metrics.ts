// TEXT WIDTHS, so the build and the page lay out labels by the same numbers (no canvas at
// build time). Each character's advance in thousandths of an em, measured once in Chrome from the
// self-hosted faces (t/metrics in the round's folder): Instrument Sans at 500 and 600, and
// JetBrains Mono, whose every advance is 600. Kerning is left out, so a measure runs a little long,
// never short. A character not listed counts as the widest letter.
const CH = "0123456789 !\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]_abcdefghijklmnopqrstuvwxyz{|}~«»’‘“”…–—·ÀÂÄÇÈÉÊËÎÏÔÖÙÛÜŒàâäçèéêëîïôöùûüœÿŸ"
const W500 = [671,389,551,577,607,578,607,546,590,615,197,284,417,721,623,786,761,244,423,423,419,538,265,499,265,444,265,265,538,538,538,574,860,731,640,744,753,634,598,764,731,254,441,702,589,902,731,790,661,796,660,623,656,708,731,1088,697,688,627,423,423,446,546,613,543,613,567,362,613,606,250,250,546,250,931,606,591,613,613,383,483,392,596,530,783,569,530,505,423,238,423,538,521,521,265,265,440,440,692,593,893,124,731,731,731,744,634,634,634,634,254,254,790,790,708,708,708,1073,546,546,546,543,567,567,567,567,250,250,591,591,596,596,596,947,530,722]
const W600 = [677,387,557,579,615,581,615,561,598,619,193,295,449,727,637,786,768,256,439,439,430,544,275,493,275,444,275,275,544,544,544,580,867,733,645,747,755,630,594,764,725,254,427,712,589,898,725,794,667,806,664,637,664,704,733,1087,707,700,631,439,439,466,558,621,552,621,571,370,621,612,260,260,558,260,941,612,597,621,621,390,494,406,604,536,800,587,536,513,439,234,439,544,547,547,275,275,471,471,728,599,899,144,733,733,733,747,630,630,630,630,254,254,794,794,704,704,704,1081,558,558,558,552,571,571,571,571,260,260,597,597,604,604,604,948,536,722]
const MONO = 600
export type Face = 'num' | 'name' | 'eyebrow'
// The three label faces of the map: a number (mono 500 11), a name (sans 500 13), an eyebrow
// (sans 600 11, uppercase, tracked .08em).
export const FACE: Record<Face, { px: number; css: string; track: number; upper: boolean }> = {
  num: { px: 11, css: '500 11px "JetBrains Mono Variable"', track: 0, upper: false },
  name: { px: 13, css: '500 13px "Instrument Sans Variable"', track: 0, upper: false },
  eyebrow: { px: 11, css: '600 11px "Instrument Sans Variable"', track: 0.08, upper: true },
}
const adv = (table: number[], c: string) => { const i = CH.indexOf(c); return i < 0 ? 1088 : table[i]! }
export function textW(t: string, f: Face): number {
  const F = FACE[f]
  const s = F.upper ? t.toLocaleUpperCase('fr') : t
  if (f === 'num') return (s.length * MONO * F.px) / 1000
  const table = f === 'eyebrow' ? W600 : W500
  let w = 0
  for (const c of s) w += adv(table, c)
  return (w * F.px) / 1000 + F.track * F.px * s.length
}
