// Numbers in a figure are written the way the post's language writes them:
// 1,4 and 4,8 % in French, 1.4 and 4.8% in English.
export type Lang = 'fr' | 'en'

export function formatNumber(value: number, lang: Lang, digits = 1): string {
  return new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits, signDisplay: 'negative' }).format(value)
}

export function formatPercent(value: number, lang: Lang, digits = 0): string {
  return lang === 'fr' ? `${formatNumber(value, lang, digits)}\u202F%` : `${formatNumber(value, lang, digits)}%`
}
