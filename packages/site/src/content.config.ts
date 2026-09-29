import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { postSchema } from './lib/post-schema'
import { assertPostFiles, parseEntry, postId } from './lib/urls'

// One folder per post at the repo root: posts/<slug>/index.md, or index.mdx
// when the post has a figure, with a file per translation beside it
// (index.en.md). Images sit beside the text and serve every language.
const BASE = '../../posts/'
// Folders starting with a dot are matched too, so their name fails the slug check.
const posts = glob({
  pattern: ['*/index.{md,mdx}', '*/index.*.{md,mdx}', '.*/index.{md,mdx}', '.*/index.*.{md,mdx}'],
  base: BASE,
  generateId: ({ entry }) => postId(parseEntry(entry)),
})

export const collections = {
  posts: defineCollection({
    loader: {
      name: 'posts',
      load: async (context) => {
        // A file the glob would skip, or two files of one language, would leave a
        // post out or let one silently win.
        const root = fileURLToPath(new URL(BASE, context.config.root))
        for (const folder of readdirSync(root, { withFileTypes: true })) {
          if (folder.isDirectory()) assertPostFiles(folder.name, readdirSync(join(root, folder.name)))
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
