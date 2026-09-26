// The sleeve keeps the photo's own shape, held between 3:4 and 2:1: only a
// very tall or very wide photo is cropped, on what sharp finds most salient
// rather than on the middle of the frame. The page and the index's share
// card print it by the same rule.
export function sleeveRatio(width: number, height: number): number {
  return Math.min(Math.max(width / height, 3 / 4), 2)
}
