import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { postSchema } from './lib/post-schema'
import { slugOf } from './lib/urls'

// One folder per post at the repo root: posts/<slug>/index.md, or index.mdx
// when the post has a figure. Images sit beside the text.
const posts = defineCollection({
  loader: glob({ pattern: '*/index.{md,mdx}', base: '../../posts', generateId: ({ entry }) => slugOf(entry) }),
  schema: ({ image }) => postSchema(image()),
})

export const collections = { posts }
