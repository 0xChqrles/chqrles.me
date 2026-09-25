import type { ImageMetadata } from 'astro'

// The share preview is a 1200×630 crop of the header image, and the build
// never enlarges an image, so a smaller header fails the build.
export const SHARE_WIDTH = 1200
export const SHARE_HEIGHT = 630

export function assertShareable(slug: string, image: Pick<ImageMetadata, 'width' | 'height'>) {
  if (image.width < SHARE_WIDTH || image.height < SHARE_HEIGHT) {
    throw new Error(
      `posts/${slug}: the header image must be at least ${SHARE_WIDTH}×${SHARE_HEIGHT} for the share preview; this one is ${image.width}×${image.height}.`,
    )
  }
}
