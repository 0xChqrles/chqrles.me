// A post's length is said as a record says it: a duration. Reading speed for
// French prose with code in it, in words per minute.
export const WORDS_PER_MINUTE = 220

export function secondsFor(words: number): number {
  return Math.round((words / WORDS_PER_MINUTE) * 60)
}

// 1607 → 26′47″. Minutes run past 60, as on a record sleeve.
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″`
}

// A track number: 1 → 01.
export function trackNumber(n: number): string {
  return String(n).padStart(2, '0')
}
