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
| `src/js/app.js` | htmx settings, active-nav state, and the Alpine components (hero register demo, pricing estimator, Tools search). |
| `src/tools/` | The Tools: `registry.mjs` (names, SEO text, FAQs), `pages/` (each tool’s body) and `partials/` (shared snippets). |
| `src/site/catalog.mjs` | Modules and their features, plans and prices, add-ons, the platform fee and integrations. One source for the homepage, features, pricing and integrations pages. |
| `scripts/site-sections.mjs` | Renders the catalog into the `{{site:…}}` sections used by those pages. |
| `src/partials/consent.html` | Cookie banner and settings dialog (Alpine `consent` component in `app.js`). |
| `src/js/tools.js` | Alpine components for every free tool. Loaded on `/tools/*` pages only. |
| `src/js/dropdown.js` | Turns every `<select>` into the custom dropdown. Write plain `<select>` markup (with `x-model`, `@change` or `name`) and it is upgraded automatically; add `data-native` to keep a browser dropdown. |
| `scripts/build.mjs` | Page metadata (titles, descriptions, JSON-LD), icon inlining, Tailwind compile, sitemap, robots.txt, `_headers`. |
| `worker/index.js` | Handles `POST /api/demo` and `POST /api/subscribe` and returns HTML fragments for htmx. |
| `src/admin/` | Standalone admin dashboard at `/admin/`, with bookings, subscribers, filters and CRUD dialogs. |
| `worker/admin.js` | Authenticated D1 APIs, validation, signed sessions and login throttling. |
| `migrations/` | Versioned D1 database schema. |
| `asset/` | Designer logo files, plus the cropped transparent `campy-*.png` copies and the `favicon-light-mode.png` / `favicon-dark-mode.png` tab icons (picked by the browser/OS colour scheme) that the build ships. |
| `asset/photos/` | Unsplash photos used on the homepage, cropped to WebP. Sources and photographers are in `CREDITS.md`. |
| `asset/` (logos) | Integration logos aren't stored here. The build writes them to `/asset/logos` from two CC0 packages, `@iconify-json/logos` (SVG Logos, in colour) and `simple-icons`; see `LOGOS` in `src/site/catalog.mjs`. |
| `public/` | Copied to the site root as-is: favicon, app icons, the 1200×630 social image. |

## Colours

Only `#0A204E` (primary) and `#7EBB02` (secondary) on white. Neutrals are opacity tints of the primary colour, such as `text-primary/70`.
The secondary colour is too light for text on white, so use it only for fills, dots and underlines, or for text on the primary colour.

## Tools

`/tools` lists 38 Tools (calculators, certificate generators, planners and checklists), and each one has its own page at `/tools/<slug>`. The homepage shows the tools listed in `FEATURED`. Everything runs in the browser. The only thing stored is the school’s letterhead and checklist ticks, in `localStorage`.

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

The cookie banner stores the visitor’s choice in `localStorage` under `campy-consent`. `window.campyConsent()` returns `{ decided, preferences, analytics }`. The Tools only save the letterhead and checklist ticks when `preferences` is true. Add analytics only behind `analytics`, and listen for the `consent-changed` window event to react to changes.

## SEO

- Each page has a title, description, canonical URL, Open Graph and Twitter tags. Edit them in `PAGES` in `scripts/build.mjs`.
- JSON-LD covers the Nexzart organisation, the Campy website, the software (with its prices), each web page and its breadcrumbs. FAQ schema is generated from the `<details>` blocks on the page.
- `sitemap.xml` and `robots.txt` are generated on every build. The production origin comes from `SITE_URL` (default `https://campy.nexzart.com`).
- The navbar and footer are in the HTML source, and icons are inline SVG. Crawlers don't need to run JavaScript to see them.

## D1 storage and admin panel

Public demo requests and newsletter subscriptions are saved directly to the `DB` D1 binding (`campy-leads`). Apps Script, Google Sheets and the SMTP relay are no longer used. Branded visitor confirmation emails are delivered by Nodemailer over TLS SMTP from `Campy by Nexzart <admin@nexzart.com>`. The original KV namespace is retained as a legacy backup and is not used by the Worker.

The admin panel is available at **`/admin/`**. Bookings and Subscribers have independent views, server-side search, status and inclusive UTC receipt-date filters, newest/oldest sorting and 10/25/50-row pagination. Bookings also have plan filters. Both support create, read, update and delete. Booking editors include contact details, school, role, size, plan, visitor message, status, a local-time scheduled demo and internal notes. Subscriber editors include email, opt-out status and notes. Deleting a record requires confirmation in the panel.

### Local setup

```powershell
Copy-Item .dev.vars.example .dev.vars  # only if you do not already have .dev.vars
# Set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET in .dev.vars.
npm run db:migrate:local
npm run dev
```

An ignored `.dev.vars` with generated local credentials may already exist. Read it locally to sign in; do not commit or share it. Use a long unique password and an independent random session secret of at least 32 characters. Admin credentials are read only by the Worker and never embedded in frontend assets. Sessions use signed HttpOnly, SameSite=Strict cookies (Secure on HTTPS), expire after eight hours, and become invalid when credentials/session secret change. Login is limited to ten attempts per IP per fifteen-minute window. All admin mutations require a same-origin Origin header. API responses and admin HTML are not cached.

### Production setup

The D1 database has been created and the initial remote migration applied. Before deploying, set Worker secrets interactively (values are never passed in command arguments):

```powershell
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_SESSION_SECRET
# Keep the real TURNSTILE_SECRET configured for production forms.
npm run db:migrate:remote
$env:TURNSTILE_SITE_KEY = '<your public production widget key>'
npm run deploy
```

`wrangler secret put` deploys a new Worker version; perform these commands as part of your release. Local `.dev.vars` values are not uploaded automatically. Admin APIs fail closed with 503 until credentials and the DB binding are configured. Production builds require the real Turnstile site key; `--dev` uses Cloudflare's test widget. Never deploy a development build to production.

### Branded confirmation emails

New public demo requests and subscriptions queue a transactional confirmation in D1. The Worker attempts delivery after responding; a five-minute cron retries pending/failed jobs up to three attempts. The templates include Campy’s embedded logo (CID attachment), navy/green theme, greeting, details and plain-text fallback. Private admin notes and credentials are never included. Older imported records and manually added records are not emailed automatically. Use **Send email** / **Resend email** in the admin list to send a confirmation after reviewing the recipient. Opted-out subscribers are suppressed. **Check email connection** verifies SMTP connectivity and authentication without sending a message.

Each new public contact/demo request also queues a separate team notification from `admin@nexzart.com` to **`nexzart.main@gmail.com`**. It includes the visitor’s contact details, school, plan, message and receipt time in IST, an admin link, and Reply-To pointing to the visitor. Visitor confirmation and team notification have independent delivery status, claims and retries, so a failure in either does not suppress the other. The Bookings list shows the team status below the visitor email status. Newsletter signups and manually added/imported records do not send team notifications automatically. The authenticated `POST /api/admin/bookings/:id/notification` endpoint can request/retry a notification and skips records already notified.

Production configuration (keep the password out of source and command arguments):

```powershell
npx wrangler secret put SMTP_PASSWORD
```

The default SMTP host is `smtpout.secureserver.net`, port `465` with implicit TLS; login and From address are fixed to `admin@nexzart.com`. Nodemailer uses a direct Workers-compatible socket so it does not depend on Node DNS or multi-address connection selection. Optional `SMTP_HOST` / `SMTP_PORT` environment settings can override the server; port `587` requires STARTTLS. Certificate verification remains enabled. `SMTP_PASSWORD` must be the mailbox’s SMTP password. The existing admin login password is unrelated.

Local `.dev.vars` includes `EMAIL_DELIVERY_ENABLED=false` so development/test submissions cannot send real messages. Only remove this setting locally when you deliberately want real delivery. Do not copy that local flag to production when enabling email.

Delivery statuses are visible in both admin lists. “Sent” means the SMTP server accepted the recipient; it does not guarantee inbox placement. D1 claims prevent concurrent sends; as with any SMTP retry, a crash after server acceptance but before persistence can cause a duplicate. A stable Message-ID is used for retries. Error records contain sanitized SMTP error codes, never passwords or complete server responses. Subscriber unsubscribe replies are handled manually by marking the record **Unsubscribed** in admin.

```powershell
npm run test:email  # No real emails; produces HTML/PNG-ready previews in ignored output/email/
```

### Legacy submissions

```powershell
node scripts/import-legacy-leads.mjs --remote
```

This idempotent import copies the old `demo:` and `subscriber:` KV entries to D1, preserves receipt dates, skips existing duplicates, and never edits/deletes the original KV data. A temporary SQL file containing lead details is created only inside ignored `.wrangler/` and removed after import. Existing unsubscribed records are not reactivated by duplicate public subscription requests.

### Verification

With `npm run dev` running in another terminal:

```powershell
npm run test:integration
```

The integration check uses local credentials from `.dev.vars`, creates disposable records in the local database, tests authentication, CRUD, filters, pagination, public form persistence, and removes only records it created. It refuses a non-local server URL.

## Bot protection (Cloudflare Turnstile)

Both forms (the demo request and the footer subscribe form) carry a Cloudflare Turnstile widget. The Worker verifies the token with Cloudflare before saving anything, and rejects the submission if the token is missing, invalid, or Cloudflare can't be reached. The footer widget only appears if Cloudflare wants more proof; the demo form always shows it. The honeypot field stays as a second layer.

Setup:

1. In the Cloudflare dashboard, go to **Turnstile → Add widget**. Add `campy.nexzart.com` (and `localhost` if you want it for dev), choose **Managed**, and copy the **site key** and **secret key**.
2. Build with the site key, which is public: `TURNSTILE_SITE_KEY=0x4AAAA… npm run deploy`. A production build refuses to continue without this real widget key; it never falls back to Cloudflare's test key.
3. Give the Worker the secret: `npx wrangler secret put TURNSTILE_SECRET`. With no secret, every submission is rejected.

`npm run dev` uses Cloudflare's local development test site key when `TURNSTILE_SITE_KEY` is not set. Add `TURNSTILE_SECRET=1x0000000000000000000000000000000AA` to `.dev.vars` (Cloudflare's always-pass test secret, which pairs with the test site key).

## Custom domain

`wrangler.jsonc` routes `campy.nexzart.com` as a Workers Custom Domain. The `nexzart.com` zone must be on the same Cloudflare account that deploys the Worker.
