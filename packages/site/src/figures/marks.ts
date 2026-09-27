// Marks in a figure's words, by the code block's rule (```text /word/): every
// occurrence of each marked string. Returns the text cut into parts; the odd
// parts are marked. Marks that touch or overlap become one.
export function markParts(text: string, marks: string[]): string[] {
  const ranges: [number, number][] = []
  for (const mark of marks) {
    if (!mark) continue
    for (let i = text.indexOf(mark); i !== -1; i = text.indexOf(mark, i + mark.length)) ranges.push([i, i + mark.length])
  }
  ranges.sort((p, q) => p[0] - q[0])
  const merged: [number, number][] = []
  for (const [start, end] of ranges) {
    const last = merged.at(-1)
    if (last && start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }
  const parts: string[] = []
  let at = 0
  for (const [start, end] of merged) {
    parts.push(text.slice(at, start), text.slice(start, end))
    at = end
  }
  parts.push(text.slice(at))
  return parts
}

export const isMarked = (text: string, marks: string[]) => marks.some((mark) => mark && text.includes(mark))
