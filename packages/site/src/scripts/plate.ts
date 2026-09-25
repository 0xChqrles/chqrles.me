import { lit, toneMap } from '../lib/dither'

// THE SLEEVE DEVELOPS. The photo is printed as a one-bit ordered dither on a
// canvas over it. On load the exposure rises once from nothing to full, 20
// stepped frames at 40ms, so the brightest cells light first; reduced motion
// shows the last frame. A cell is one CSS pixel: the canvas holds one backing
// pixel per cell, drawn with pixelated rendering, so every cell is a sharp
// square. Without the script the photo stays, printed in one ink.

const FRAMES = 20
const FRAME_MS = 40
// Each cell is the mean of a 4×4 block of the photo: an area filter, where a
// one-step canvas downscale aliases.
const OVERSAMPLE = 4

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

for (const plate of document.querySelectorAll<HTMLElement>('[data-plate]')) {
  const img = plate.querySelector('img')
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!img || !context) continue
  canvas.setAttribute('aria-hidden', 'true')

  let photo: HTMLImageElement = img
  let tone: Float32Array = new Float32Array(0)
  let cols = 0
  let rows = 0
  let ink: number[] = [255, 255, 255]

  // The photo's brightness per cell, cropped like object-fit: cover, then toned.
  const sample = () => {
    cols = plate.clientWidth
    rows = plate.clientHeight
    const source = document.createElement('canvas')
    source.width = cols * OVERSAMPLE
    source.height = rows * OVERSAMPLE
    const s = source.getContext('2d', { willReadFrequently: true })!
    s.imageSmoothingQuality = 'high'
    const scale = Math.max(source.width / photo.naturalWidth, source.height / photo.naturalHeight)
    const sw = source.width / scale
    const sh = source.height / scale
    s.drawImage(photo, (photo.naturalWidth - sw) / 2, (photo.naturalHeight - sh) / 2, sw, sh, 0, 0, source.width, source.height)
    const data = s.getImageData(0, 0, source.width, source.height).data
    const luma = new Float32Array(cols * rows)
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const p = (y * source.width + x) * 4
        luma[Math.floor(y / OVERSAMPLE) * cols + Math.floor(x / OVERSAMPLE)]! += 0.2126 * data[p]! + 0.7152 * data[p + 1]! + 0.0722 * data[p + 2]!
      }
    }
    for (let i = 0; i < luma.length; i++) luma[i] = luma[i]! / (255 * OVERSAMPLE * OVERSAMPLE)
    tone = toneMap(luma, cols, rows)
    canvas.width = cols
    canvas.height = rows
    canvas.style.width = `${cols}px`
    canvas.style.height = `${rows}px`
    ink = getComputedStyle(canvas).color.match(/\d+/g)!.map(Number)
  }

  // One frame at exposure k: unlit cells stay transparent, so the sleeve's
  // own ground shows through.
  const paint = (k: number) => {
    const frame = context.createImageData(cols, rows)
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!lit(tone, cols, x, y, k)) continue
        frame.data.set([ink[0]!, ink[1]!, ink[2]!, 255], (y * cols + x) * 4)
      }
    }
    context.putImageData(frame, 0, 0)
  }

  const develop = () => {
    // In the page first: the ink is read from the canvas's CSS colour.
    plate.append(canvas)
    sample()
    plate.classList.add('is-live')
    if (reduced) return paint(1)
    let frame = 0
    paint(0)
    const timer = setInterval(() => {
      frame += 1
      // Ease out: most of the picture arrives early, the shadows last.
      paint(1 - (1 - frame / FRAMES) ** 3)
      if (frame >= FRAMES) clearInterval(timer)
    }, FRAME_MS)
  }

  // A new size redraws the finished sleeve at once, never develops again: the
  // sleeve follows the screen's height as well as its width.
  const measure = () => `${plate.clientWidth}×${plate.clientHeight}`
  let size = measure()
  new ResizeObserver(() => {
    const now = measure()
    if (!plate.classList.contains('is-live') || now === size) return
    size = now
    sample()
    paint(1)
  }).observe(plate)

  // The source the <picture> chose, as a plain image: an <img> with a srcset
  // reports its size in CSS pixels, but drawImage crops in the file's own
  // pixels. No picture to develop leaves the photo alone.
  const fail = () => plate.classList.add('is-photo')
  const start = () => {
    if (!img.naturalWidth) return fail()
    photo = new Image()
    photo.src = img.currentSrc || img.src
    photo.decode().then(develop, fail)
  }
  if (img.complete) start()
  else {
    img.addEventListener('load', start, { once: true })
    img.addEventListener('error', fail, { once: true })
  }
}
