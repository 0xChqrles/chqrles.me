// The palette, for what CSS cannot reach: the favicon and the share image.
// Keep in step with the :root tokens in src/styles/site.css.
export type Rgb = readonly [number, number, number]

export const GROUND: Rgb = [0x12, 0x11, 0x10]
export const RAISE: Rgb = [0x1b, 0x1a, 0x18]
export const INK: Rgb = [0xe4, 0xe2, 0xdc]
export const LINE_STRONG: Rgb = [0x6f, 0x6a, 0x62]
export const CUE: Rgb = [0xff, 0x5a, 0x1f]

export const hex = (rgb: Rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`
