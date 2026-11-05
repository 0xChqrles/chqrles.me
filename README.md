# chqrles.me

The source of https://chqrles.me and of its courses.

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

## Publishing a course

1. Create a folder in `courses/`. Its name is its path: `courses/my-course/` is
   published at `https://learn.chqrles.me/my-course/`, forever. Lowercase letters, digits and
   hyphens.
2. Write `outline.json`, the home page `src/_accueil.md`, and a `src/<card-id>.md` for each
   written card. A card with no file stays on the map, with no page. A Rust crate goes in
   `code/`. Any other file fails the build, with a message that names it.
3. Merge to `main`. This publishes nothing.
4. Run the workflow by hand, from `main`:

   ```bash
   gh workflow run deploy-course.yml -f course=my-course                # publish
   gh workflow run deploy-course.yml -f course=my-course -f empty=true  # take down
   ```

A card merged later goes live at the next run.

## Commands

```bash
pnpm install
pnpm dev         # http://localhost:4321, drafts included
pnpm build       # packages/site/dist, drafts excluded
pnpm test
pnpm typecheck

pnpm dev:course                      # http://localhost:4322, the test course
COURSE_DIR=<path> pnpm dev:course    # any folder, as a preview
pnpm build:courses                   # packages/course/dist/<slug>
```

The rules for working on this repo are in [AGENTS.md](AGENTS.md).
