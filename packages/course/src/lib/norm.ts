// The text has typographic apostrophes and non-breaking spaces; a keyboard types neither.
export const norm = (s: string) => s.toLowerCase().replace(/[  ]/g, ' ').replace(/'/g, '’')
