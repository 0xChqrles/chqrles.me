import { existsSync, readdirSync } from 'node:fs'
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { postSchema } from './lib/post-schema'
import { slugOf } from './lib/urls'

// One folder per post at the repo root: posts/<slug>/index.md, or index.mdx
// when the post has a figure. Images sit beside the text.
const BASE = '../../posts/'
// Folders starting with a dot are matched too, so their name fails the slug check.
const posts = glob({ pattern: ['*/index.{md,mdx}', '.*/index.{md,mdx}'], base: BASE, generateId: ({ entry }) => slugOf(entry) })

export const collections = {
  posts: defineCollection({
    loader: {
      name: 'posts',
      load: async (context) => {
        // Both files would claim one URL, and one would silently win.
        const root = new URL(BASE, context.config.root)
        for (const folder of readdirSync(root)) {
          if (existsSync(new URL(`${folder}/index.md`, root)) && existsSync(new URL(`${folder}/index.mdx`, root))) {
            throw new Error(`posts/${folder}: holds both index.md and index.mdx. Keep one.`)
          }
        }
        // Every post is validated, drafts included. Then a production build
        // drops the drafts, so nothing of theirs (not even an image) is built.
        await posts.load(context)
        if (import.meta.env.DEV) return
        for (const entry of context.store.values()) {
          if (entry.data.draft) context.store.delete(entry.id)
        }
      },
    },
    schema: ({ image }) => postSchema(image()),
  }),
}
