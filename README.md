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
| `src/partials/` | Navbar, footer and cookie consent banner. |
| `src/css/app.css` | Tailwind entry point, self-hosted Poppins font, buttons and form styles. |
| `src/js/app.js` | htmx settings, active-nav state, and the Alpine components (hero register demo, pricing estimator, free tools search). |
| `src/tools/` | The free tools: `registry.mjs` (names, SEO text, FAQs), `pages/` (each tool’s body) and `partials/` (shared snippets). |
| `src/site/catalog.mjs` | Modules and their features, plans and prices, add-ons, the platform fee and integrations. One source for the homepage, features, pricing and integrations pages. |
| `scripts/site-sections.mjs` | Renders the catalog into the `{{site:…}}` sections used by those pages. |
| `src/partials/consent.html` | Cookie banner and settings dialog (Alpine `consent` component in `app.js`). |
| `src/js/tools.js` | Alpine components for every free tool. Loaded on `/tools/*` pages only. |
| `src/js/dropdown.js` | Turns every `<select>` into the custom dropdown. Write plain `<select>` markup (with `x-model`, `@change` or `name`) and it is upgraded automatically; add `data-native` to keep a browser dropdown. |
| `scripts/build.mjs` | Page metadata (titles, descriptions, JSON-LD), icon inlining, Tailwind compile, sitemap, robots.txt, `_headers`. |
| `worker/index.js` | Handles `POST /api/demo` and `POST /api/subscribe` and returns HTML fragments for htmx. |
| `apps-script/` | Saves form submissions to Google Sheets and calls the SMTP relay. |
| `smtp-relay/` | Separate Node.js Nodemailer service for GoDaddy SMTP. |
| `asset/` | Designer logo files, plus the cropped transparent `campy-*.png` copies and the `favicon-light-mode.png` / `favicon-dark-mode.png` tab icons (picked by the browser/OS colour scheme) that the build ships. |
| `asset/photos/` | Unsplash photos used on the homepage, cropped to WebP. Sources and photographers are in `CREDITS.md`. |
| `asset/` (logos) | Integration logos aren't stored here. The build writes them to `/asset/logos` from two CC0 packages, `@iconify-json/logos` (SVG Logos, in colour) and `simple-icons`; see `LOGOS` in `src/site/catalog.mjs`. |
| `public/` | Copied to the site root as-is: favicon, app icons, the 1200×630 social image. |

## Colours

Only `#0A204E` (primary) and `#7EBB02` (secondary) on white. Neutrals are opacity tints of the primary colour, such as `text-primary/70`.
The secondary colour is too light for text on white, so use it only for fills, dots and underlines, or for text on the primary colour.

## Free tools

`/tools` lists 38 free tools (calculators, certificate generators, planners and checklists), and each one has its own page at `/tools/<slug>`. The homepage shows the tools listed in `FEATURED`. Everything runs in the browser. The only thing stored is the school’s letterhead and checklist ticks, in `localStorage`.

To add a tool:

1. Add an entry to `TOOLS` in `src/tools/registry.mjs`: slug, category, Lucide icon, name, short card text, title, description, intro, FAQs and the Campy feature it links to.
2. Create `src/tools/pages/<slug>.html` with the tool markup and its explainer. Use `{{include:school-fields}}` and `{{include:letterhead}}` for documents that carry the school’s letterhead.
3. Add its Alpine component to `src/js/tools.js`.

The build adds the hero, FAQ (with FAQ schema), Campy call to action, related tools, sitemap entry and `WebApplication` structured data. Tool pages need `tools.js`, which a boosted (htmx) swap can’t add, so `app.js` loads the first tool page you visit in full.

Document tools print one element through `$print('#id')`, which copies it into `#print-root` so only the document prints. In the print dialog, choose “Save as PDF” to get a PDF.

## Modules, plans and pricing

Edit `src/site/catalog.mjs`, then rebuild. Each module lists the cheapest plan that includes it (`plan`), and the plan cards, comparison table, add-on builder and structured-data prices all follow from it. Old `/features#…` links keep working through each module’s `aliases`.

Current prices: Essential ₹35,000, Professional ERP ₹1,00,000 and Enterprise ERP + CMS ₹2,00,000 a year, plus GST, with a 0.1% platform fee on fees collected through Campy.

## Legal and cookies

`/terms` and `/privacy` are in `src/pages/`. Have them reviewed by counsel before relying on them, and update the dates at the top when they change.

The cookie banner stores the visitor’s choice in `localStorage` under `campy-consent`. `window.campyConsent()` returns `{ decided, preferences, analytics }`. The free tools only save the letterhead and checklist ticks when `preferences` is true. Add analytics only behind `analytics`, and listen for the `consent-changed` window event to react to changes.

## SEO

- Each page has a title, description, canonical URL, Open Graph and Twitter tags. Edit them in `PAGES` in `scripts/build.mjs`.
- JSON-LD covers the Nexzart organisation, the Campy website, the software (with its prices), each web page and its breadcrumbs. FAQ schema is generated from the `<details>` blocks on the page.
- `sitemap.xml` and `robots.txt` are generated on every build. The production origin comes from `SITE_URL` (default `https://campy.nexzart.com`).
- The navbar and footer are in the HTML source, and icons are inline SVG. Crawlers don't need to run JavaScript to see them.

## Form submissions

Submissions are stored in the `LEADS` KV namespace with `demo:` and `subscriber:` key prefixes.

```bash
npx wrangler kv key list --binding LEADS --remote
npx wrangler kv key get "<key>" --binding LEADS --remote
```

## Form emails and Google Sheet

Every valid demo request and subscription is forwarded to the Apps Script web app in `apps-script/`. It saves the submission to a Google Sheet, then calls the separate `smtp-relay/` Node.js service. Nodemailer sends the existing branded visitor confirmation and an admin notification through GoDaddy Professional Email SMTP as **admin@nexzart.com**. Notifications go to **nexzart.main@gmail.com**, with Reply-To set to the visitor.

See [smtp-relay/README.md](smtp-relay/README.md) for the full setup, required Script properties, SMTP credentials, hosting, and verification steps. The Apps Script can run under any Google account with edit access to the Sheet; a Google Workspace mailbox or Gmail alias for admin@nexzart.com is not required.

The Worker uses its existing `APPS_SCRIPT_URL` and `APPS_SCRIPT_SECRET` secrets. Submissions also remain in KV. It answers the visitor before background Sheet/email processing completes, so check Worker logs for failures. The Sheet records each email's status; retries are manual.

## Bot protection (Cloudflare Turnstile)

Both forms (the demo request and the footer subscribe form) carry a Cloudflare Turnstile widget. The Worker verifies the token with Cloudflare before saving or emailing anything, and rejects the submission if the token is missing, invalid, or Cloudflare can't be reached. The footer widget only appears if Cloudflare wants more proof; the demo form always shows it. The honeypot field stays as a second layer.

Setup:

1. In the Cloudflare dashboard, go to **Turnstile → Add widget**. Add `campy.nexzart.com` (and `localhost` if you want it for dev), choose **Managed**, and copy the **site key** and **secret key**.
2. Build with the site key, which is public: `TURNSTILE_SITE_KEY=0x4AAAA… npm run deploy`. A production build refuses to continue without this real widget key; it never falls back to Cloudflare's test key.
3. Give the Worker the secret: `npx wrangler secret put TURNSTILE_SECRET`. With no secret, every submission is rejected.

`npm run dev` uses Cloudflare's local development test site key when `TURNSTILE_SITE_KEY` is not set. Add `TURNSTILE_SECRET=1x0000000000000000000000000000000AA` to `.dev.vars` (Cloudflare's always-pass test secret, which pairs with the test site key).

## Custom domain

`wrangler.jsonc` routes `campy.nexzart.com` as a Workers Custom Domain. The `nexzart.com` zone must be on the same Cloudflare account that deploys the Worker.
