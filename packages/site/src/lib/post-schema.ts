import { z } from 'astro/zod'

// The frontmatter contract. A post that breaks it fails the build, and the
// message names the field. `image` is passed in because Astro builds it from
// the post's folder (the `image()` helper of content.config.ts).
export function postSchema<Image extends z.ZodType>(image: Image) {
  return z
    .strictObject({
      title: z.string({ error: 'required: the title' }).min(1),
      date: z.coerce.date({ error: 'required: the publication date, like 2026-09-25' }),
      description: z.string({ error: 'required: one or two sentences for previews and the feed' }).min(1),
      image: image.optional(),
      imageAlt: z.string().min(1).optional(),
      lang: z.enum(['fr', 'en']).default('fr'),
      draft: z.boolean().default(false),
    })
    .superRefine((post, ctx) => {
      // Only a draft may go without its header image.
      if (post.draft) return
      if (post.image === undefined) {
        ctx.addIssue({ code: 'custom', path: ['image'], message: 'required: the header image, a file in the post folder (only a draft may omit it)' })
      }
      if (post.imageAlt === undefined) {
        ctx.addIssue({ code: 'custom', path: ['imageAlt'], message: 'required: the header image alt text (only a draft may omit it)' })
      }
    })
}
