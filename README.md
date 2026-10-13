# Campy landing site

Marketing site for **Campy**, the school management software by [Nexzart](https://nexzart.com).
Built with htmx, Tailwind CSS, Alpine.js and Lucide icons, and deployed on Cloudflare Workers with static assets.

## Commands

```bash
npm install
npm run dev      # build, then serve on http://localhost:8787 with wrangler dev
npm run build    # write the site to dist/
npm run deploy   # build, then wrangler deploy
```

Re-run `npm run build` after editing anything in `src/` while `npm run dev` is running.

## Layout

| Path | What it is |
| --- | --- |
| `src/pages/*.html` | The `<main>` of each page. The build adds the head, navbar and footer. |
| `src/partials/` | Navbar, footer, and the four portal tabs that htmx loads on click. |
| `src/css/app.css` | Tailwind entry point, self-hosted Poppins font, buttons and form styles. |
| `src/js/app.js` | htmx settings, active-nav state, and the Alpine components (hero register demo, pricing estimator). |
| `scripts/build.mjs` | Page metadata (titles, descriptions, JSON-LD), icon inlining, Tailwind compile, sitemap, robots.txt, `_headers`. |
| `worker/index.js` | Handles `POST /api/demo` and `POST /api/subscribe` and returns HTML fragments for htmx. |
| `asset/` | Designer logo files, plus the cropped transparent `campy-*.png` copies and `favicon.png` that the build ships. |
| `asset/photos/` | Unsplash photos used on the homepage, cropped to WebP. Sources and photographers are in `CREDITS.md`. |
| `public/` | Copied to the site root as-is: favicon, app icons, the 1200×630 social image. |

## Colours

Only `#0A204E` (primary) and `#7EBB02` (secondary) on white. Neutrals are opacity tints of the primary colour, such as `text-primary/70`.
The secondary colour is too light for text on white, so use it only for fills, dots and underlines, or for text on the primary colour.

## SEO

- Each page has a title, description, canonical URL, Open Graph and Twitter tags. Edit them in `PAGES` in `scripts/build.mjs`.
- JSON-LD covers the Nexzart organisation, the Campy website, the software (with its prices), each web page and its breadcrumbs. FAQ schema is generated from the `<details>` blocks on the page.
- `sitemap.xml` and `robots.txt` are generated on every build. The production origin comes from `SITE_URL` (default `https://campy.nexzart.com`).
- The navbar, footer and default portal tab are in the HTML source, and icons are inline SVG. Crawlers don't need to run JavaScript to see them.

## Form submissions

Submissions are stored in the `LEADS` KV namespace with `demo:` and `subscriber:` key prefixes.

```bash
npx wrangler kv key list --binding LEADS --remote
npx wrangler kv key get "<key>" --binding LEADS --remote
```

## Custom domain

`wrangler.jsonc` routes `campy.nexzart.com` as a Workers Custom Domain. The `nexzart.com` zone must be on the same Cloudflare account that deploys the Worker.
