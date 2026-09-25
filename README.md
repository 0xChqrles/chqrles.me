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
4. Push to `main`. CI checks the post, builds the site and deploys it.

A post with a missing or misspelled field fails the build, with a message that names the field.

## Figures and marks

A post with a figure is `index.mdx`. It uses a figure by name and passes it data:

```mdx
<Plane
  caption="`chat`, `chien` et `loup` sur un plan."
  points={[{ id: 'chat', label: 'chat', x: 1.5, y: 3.2 }, { id: 'chien', label: 'chien', x: 3, y: 3.6 }]}
  links={[{ from: 'chat', to: 'chien', distance: true }]}
  move
/>
```

The figures are `<Plane>`, `<Bars>` and `<Arcs>`; AGENTS.md lists what each takes.

To mark words in a code block, name them after its language: ```` ```text /chat/ ````
marks every `chat`, ```` ```text /:/2 ```` only the second colon.

## Commands

```bash
pnpm install
pnpm dev         # http://localhost:4321, drafts included
pnpm build       # packages/site/dist, drafts excluded
pnpm test
pnpm typecheck
```

The rules for working on this repo are in [AGENTS.md](AGENTS.md).
