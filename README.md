# chqrles.me

The source of https://chqrles.me.

## Publishing a post

1. Create a folder in `posts/`. Its name is the URL: `posts/my-post/` is published at
   `https://chqrles.me/my-post/`, forever. Lowercase letters, digits and hyphens.
2. Write `index.md` in it (`index.mdx` if the post has a figure):

   ```markdown
   ---
   title: "The title"
   date: 2026-09-25
   description: "One or two sentences, for link previews and the feed."
   image: ./header.jpg   # at least 1200×630
   imageAlt: "What the header image shows."
   lang: fr          # fr or en, fr by default
   draft: false      # true keeps it off the site
   ---

   The text.
   ```

3. Drop the header image in the same folder.
4. Push to `main`. CI checks the post and builds the site. (The deploy comes with the infrastructure.)

A post with a missing or misspelled field fails the build, with a message that names the field.

## Commands

```bash
pnpm install
pnpm dev         # http://localhost:4321, drafts included
pnpm build       # packages/site/dist, drafts excluded
pnpm test
pnpm typecheck
```

The rules for working on this repo are in [AGENTS.md](AGENTS.md).
