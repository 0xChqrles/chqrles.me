# chqrles.me

The source of https://chqrles.me.

## Publishing a post

1. Create a folder in `posts/`. Its name is the URL: `posts/my-post/` is published at
   `https://chqrles.me/fr/my-post/`, forever. Lowercase letters, digits and hyphens. To rename
   it later, keep the old name in `aliases: [my-old-name]` and its links keep working.
2. Write `index.md` in it (`index.mdx` if the post has a figure). It is the French post:

   ```markdown
   ---
   title: "The title"
   date: 2026-09-25
   description: "One or two sentences, for link previews and the feed."
   image: ./header.jpg   # at least 1200×630
   imageAlt: "What the header image shows."
   draft: false      # true keeps it off the site
   ---

   The text.
   ```

3. Drop the header image in the same folder.
4. To translate it, write `index.en.md` beside it, with its own frontmatter (the same
   image, its own title, description and alt text). It is published at
   `https://chqrles.me/en/my-post/`.
5. Push to `main`. CI checks the post, builds the site and deploys it.

A page is always under its language, `/fr/…` or `/en/…`. A link without one, like
`https://chqrles.me/my-post/`, is sent to the reader's language: the last they read, else
their browser's. A post with no translation is listed in both languages, in its own.

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

The figures are `<Plane>`, `<Bars>` and `<Arcs>`, and the exhibits `<Words>` and `<Flow>`;
AGENTS.md lists what each takes.

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
