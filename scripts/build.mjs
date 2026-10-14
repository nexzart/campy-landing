// Campy landing – static build.
// src/pages/*.html hold only each page's <main>. This script wraps them in the shared
// layout (SEO head, navbar, footer), inlines Lucide icons as SVG, compiles Tailwind,
// and writes sitemap.xml, robots.txt, the web manifest and _headers into dist/.
// Usage: node scripts/build.mjs   (SITE_URL env var overrides the production origin)

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, FEATURED, TOOLS } from '../src/tools/registry.mjs';
import { MODULES, PLANS, SECTIONS } from './site-sections.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const NM = path.join(ROOT, 'node_modules');

const SITE_URL = (process.env.SITE_URL || 'https://campy.nexzart.com').replace(/\/$/, '');
const TODAY = new Date().toISOString().slice(0, 10);
const YEAR = new Date().getFullYear();

const NEXZART = {
  '@type': 'Organization',
  '@id': 'https://nexzart.com/#organization',
  name: 'Nexzart',
  url: 'https://nexzart.com',
  logo: 'https://nexzart.com/logo.png',
  email: 'admin@nexzart.com',
  telephone: '+91-74185-94229',
  description: 'Websites, mobile apps, and ERP platforms engineered for speed and built to scale.',
  address: { '@type': 'PostalAddress', addressLocality: 'Chennai', addressRegion: 'Tamil Nadu', addressCountry: 'IN' },
  founder: [
    { '@type': 'Person', name: 'Yahya Saad Vanekar' },
    { '@type': 'Person', name: 'Nisha Antony' },
  ],
  sameAs: [
    'https://linkedin.com/nexzart_',
    'https://x.com/nexzart_',
    'https://instagram.com/nexzart_',
    'https://facebook.com/nexzart_',
  ],
};

const PAGES = [
  {
    file: 'index', path: '/', type: 'WebPage', priority: '1.0', changefreq: 'weekly',
    title: 'Campy | School ERP and Management Software for Indian Schools',
    description: 'The complete school ERP: academics, exams, fees and online payments, accounting, HR and payroll, parent apps and your school website. From ₹35,000 a year.',
  },
  {
    file: 'features', path: '/features', type: 'WebPage', priority: '0.9', changefreq: 'monthly', crumb: 'Features',
    title: 'School ERP Features: Academics, Fees, Accounts, HR & CMS | Campy',
    description: 'Every Campy module: academics, attendance and exams, fees and online payments, accounting, HR and payroll, transport, library, parent app and school website CMS.',
  },
  {
    file: 'platform', path: '/platform', type: 'AboutPage', priority: '0.7', changefreq: 'monthly', crumb: 'Platform',
    title: 'Platform, Security and Technology | Campy by Nexzart',
    description: 'How Campy keeps each school’s data separate, permissioned, audited and available offline, the technology behind it, and the Nexzart team that builds it.',
  },
  {
    file: 'pricing', path: '/pricing', type: 'WebPage', priority: '0.9', changefreq: 'monthly', crumb: 'Pricing',
    title: 'School ERP Pricing: Plans from ₹35,000 a Year | Campy',
    description: 'Campy plans from ₹35,000 to ₹2,00,000 a year, with unlimited students and staff and no development cost. Build your own plan or pick Professional or Enterprise.',
  },
  {
    file: 'integrations', path: '/integrations', type: 'WebPage', priority: '0.8', changefreq: 'monthly', crumb: 'Integrations',
    title: 'Integrations: Payment Gateways, WhatsApp, Biometric & More | Campy',
    description: 'Campy works with any payment gateway, WhatsApp and SMS, biometric and RFID attendance, GPS bus tracking, Tally, Google Workspace and Microsoft 365.',
  },
  {
    file: 'tools', path: '/tools', type: 'CollectionPage', priority: '0.9', changefreq: 'weekly', crumb: 'Free tools',
    title: `${TOOLS.length} Free School Tools: Calculators, Certificates & Planners | Campy`,
    description: 'Free tools for Indian schools: attendance and CGPA calculators, TC and bonafide certificates, timetables, seating plans and compliance checklists. No sign-up.',
  },
  {
    file: 'contact', path: '/contact', type: 'ContactPage', priority: '0.8', changefreq: 'yearly', crumb: 'Book a demo',
    title: 'Book a Demo of Campy School ERP Software',
    description: 'Book a 30-minute walkthrough of Campy set up with your school’s classes and timetable, or email admin@nexzart.com.',
  },
  {
    file: 'terms', path: '/terms', type: 'WebPage', priority: '0.3', changefreq: 'yearly', crumb: 'Terms and conditions',
    title: 'Terms and Conditions | Campy',
    description: 'The terms that apply to Campy subscriptions, fee payments, the 0.1% platform fee, school data, the free tools and this website.',
  },
  {
    file: 'privacy', path: '/privacy', type: 'WebPage', priority: '0.3', changefreq: 'yearly', crumb: 'Privacy policy',
    title: 'Privacy Policy and Cookies | Campy',
    description: 'How Nexzart collects, uses and protects personal data in Campy and on this website, how children’s data is handled, and how cookies are used.',
  },
  {
    file: '404', path: '/404', type: 'WebPage', noindex: true,
    title: 'Page not found | Campy',
    description: 'This page could not be found.',
  },
];

// ---------------------------------------------------------------- helpers

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, data) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
};
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};
const hash = (data) => createHash('sha256').update(data).digest('hex').slice(0, 10);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const decode = (s) => s.replace(/&rsquo;|’/g, '’').replace(/&amp;/g, '&');
const absolute = (p) => (p === '/' ? `${SITE_URL}/` : `${SITE_URL}${p}`);

// Replace <i data-lucide="name" ...></i> with the inline SVG from lucide-static.
const iconCache = new Map();
function lucideSvg(name) {
  if (!iconCache.has(name)) {
    const file = path.join(NM, 'lucide-static', 'icons', `${name}.svg`);
    if (!fs.existsSync(file)) throw new Error(`Unknown Lucide icon "${name}"`);
    const inner = read(file).replace(/<!--[\s\S]*?-->/g, '').match(/<svg[^>]*>([\s\S]*?)<\/svg>/)[1];
    iconCache.set(name, inner.replace(/\s*\n\s*/g, '').replace(/\s*\/>/g, '/>'));
  }
  return iconCache.get(name);
}
function inlineIcons(html) {
  return html.replace(/<i\s([^>]*?)data-lucide="([a-z0-9-]+)"([^>]*)><\/i>/g, (_, before, name, after) => {
    let attrs = `${before} ${after}`.trim();
    let cls = '';
    attrs = attrs.replace(/\bclass="([^"]*)"/, (__, c) => ((cls = c), '')).trim();
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide lucide-${name} ${cls}"${attrs ? ' ' + attrs : ''}>${lucideSvg(name)}</svg>`;
  });
}

// FAQ structured data is generated from the <details> accordions on the page itself,
// so the markup and the schema can never drift apart.
function faqFromHtml(html) {
  const items = [...html.matchAll(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/details>/g)];
  return items.map(([, q, a]) => ({
    '@type': 'Question',
    name: decode(stripTags(q)),
    acceptedAnswer: { '@type': 'Answer', text: decode(stripTags(a)) },
  }));
}

function jsonLd(page, main) {
  const url = absolute(page.path);
  const crumbs = page.crumbs || (page.crumb ? [{ name: page.crumb, path: page.path }] : null);
  const software = {
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name: 'Campy',
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/og/campy-og.png`,
    description: 'School ERP and management software covering academics, attendance, exams, fees and online payments, accounting, HR and payroll, parent communication and the school website.',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'School management system',
    operatingSystem: 'Web, Android, iOS',
    inLanguage: 'en-IN',
    featureList: MODULES.map((m) => `${m.name}: ${m.tagline}`),
    creator: { '@id': NEXZART['@id'] },
    publisher: { '@id': NEXZART['@id'] },
    offers: {
      '@type': 'AggregateOffer',
      name: 'Annual plans, unlimited students and staff',
      lowPrice: String(Math.min(...PLANS.map((p) => p.price))),
      highPrice: String(Math.max(...PLANS.map((p) => p.price))),
      offerCount: PLANS.length,
      priceCurrency: 'INR',
      url: `${SITE_URL}/pricing`,
    },
  };

  const graph = [
    NEXZART,
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'Campy',
      description: 'School management software by Nexzart',
      inLanguage: 'en-IN',
      publisher: { '@id': NEXZART['@id'] },
    },
    software,
    {
      '@type': page.type,
      '@id': `${url}#webpage`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: 'en-IN',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#software` },
      primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE_URL}/og/campy-og.png`, width: 1200, height: 630 },
      dateModified: TODAY,
      ...(crumbs ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
      ...(page.tool ? { mainEntity: { '@id': `${url}#tool` } } : {}),
    },
  ];

  if (crumbs) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [{ name: 'Home', path: '/' }, ...crumbs].map((c, i) => ({
        '@type': 'ListItem', position: i + 1, name: c.name, item: absolute(c.path),
      })),
    });
  }

  if (page.tool) {
    graph.push({
      '@type': 'WebApplication',
      '@id': `${url}#tool`,
      name: page.tool.name,
      url,
      description: page.description,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any (runs in the browser)',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      inLanguage: 'en-IN',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      publisher: { '@id': NEXZART['@id'] },
    });
  }

  if (page.file === 'tools') {
    graph.push({
      '@type': 'ItemList',
      '@id': `${url}#tools`,
      name: 'Free school tools',
      numberOfItems: TOOLS.length,
      itemListElement: TOOLS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, url: absolute(`/tools/${t.slug}`) })),
    });
  }

  const faq = faqFromHtml(main);
  if (faq.length) graph.push({ '@type': 'FAQPage', '@id': `${url}#faq`, url, mainEntity: faq, isPartOf: { '@id': `${url}#webpage` } });

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

// ---------------------------------------------------------------- free tools

const CATEGORY = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const TOOL = Object.fromEntries(TOOLS.map((t) => [t.slug, t]));
for (const slug of FEATURED) if (!TOOL[slug]) throw new Error(`FEATURED lists unknown tool "${slug}"`);

// Cards on /tools carry search text for the filter in app.js (toolFinder).
function toolCard(t, filterable = false) {
  const search = `${t.name} ${t.short} ${t.keywords || ''} ${CATEGORY[t.category].name}`.toLowerCase();
  return `<li${filterable ? ` data-search="${esc(search)}" x-show="match($el)"` : ''}>
  <a href="/tools/${t.slug}" class="tool-card group">
    <span class="tool-card-icon"><i data-lucide="${t.icon}" class="h-5 w-5"></i></span>
    <span class="mt-4 block font-semibold leading-snug">${esc(t.name)}</span>
    <span class="mt-2 block text-sm leading-relaxed text-primary/65">${esc(t.short)}</span>
    <span class="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold">Use the tool<i data-lucide="arrow-right" class="h-4 w-4 transition-transform group-hover:translate-x-0.5"></i></span>
  </a>
</li>`;
}

function faqSection(faqs, heading) {
  return `<section class="border-t border-primary/10">
  <div class="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8">
    <h2 class="font-display text-3xl font-bold leading-tight sm:text-4xl">${heading}</h2>
    <div class="divide-y divide-primary/10 border-y border-primary/10">
${faqs.map(([q, a]) => `      <details class="py-2">
        <summary class="flex items-center justify-between gap-6 py-4 text-lg font-semibold">${esc(q)}<i data-lucide="chevron-down" class="chev h-5 w-5"></i></summary>
        <p class="pb-5 text-primary/70">${esc(a)}</p>
      </details>`).join('\n')}
    </div>
  </div>
</section>`;
}

// Same category first, then the homepage favourites, never the tool itself.
function relatedTools(t, count = 4) {
  const pool = [...TOOLS.filter((x) => x.category === t.category), ...FEATURED.map((s) => TOOL[s])];
  return [...new Set(pool)].filter((x) => x !== t && !(x.preset && t.preset)).slice(0, count);
}

function toolMain(t, body) {
  const cat = CATEGORY[t.category];
  return `<main id="main">
  <section class="border-b border-primary/10 bg-primary/[0.025]">
    <div class="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb">
        <ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-primary/60">
          <li><a href="/" class="hover:text-primary">Home</a></li>
          <li aria-hidden="true">/</li>
          <li><a href="/tools" class="hover:text-primary">Free tools</a></li>
          <li aria-hidden="true">/</li>
          <li><a href="/tools#${cat.id}" class="hover:text-primary">${esc(cat.name)}</a></li>
        </ol>
      </nav>
      <p class="eyebrow mt-8">Free tool</p>
      <h1 class="font-display mt-5 max-w-4xl text-4xl font-extrabold leading-[1.1] sm:text-5xl">${esc(t.name)}</h1>
      <p class="mt-5 max-w-3xl text-lg leading-relaxed text-primary/70">${esc(t.intro)}</p>
      <ul class="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
        <li class="flex items-center gap-2"><i data-lucide="circle-check" class="h-4 w-4 text-secondary"></i>Free, no sign-up</li>
        <li class="flex items-center gap-2"><i data-lucide="lock" class="h-4 w-4 text-secondary"></i>Runs in your browser. Nothing is uploaded.</li>
        ${t.print ? '<li class="flex items-center gap-2"><i data-lucide="printer" class="h-4 w-4 text-secondary"></i>Print or save as PDF</li>' : ''}
      </ul>
    </div>
  </section>

  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
${body}
  </div>

${faqSection(t.faqs, 'Frequently asked questions')}

  <section class="px-4 pb-20 sm:px-6 lg:px-8">
    <div class="on-dark relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-primary px-6 py-12 text-white sm:px-12">
      <span class="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-secondary/20" aria-hidden="true"></span>
      <div class="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <p class="eyebrow eyebrow-dark">Skip the spreadsheet</p>
          <h2 class="font-display mt-5 text-3xl font-bold leading-tight sm:text-4xl">Let Campy do this for your whole school.</h2>
          <p class="mt-4 max-w-xl text-lg text-white/75">${esc(t.campy.text)}</p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
          <a href="/contact" class="btn btn-lime">Book a demo<i data-lucide="arrow-right" class="h-4 w-4"></i></a>
          <a href="${t.campy.href}" class="btn btn-ghost-light">See how Campy does it</a>
        </div>
      </div>
    </div>
  </section>

  <section class="border-t border-primary/10 bg-primary/[0.025]">
    <div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <h2 class="font-display text-3xl font-bold">More free tools</h2>
        <a href="/tools" class="link-btn">All ${TOOLS.length} tools<i data-lucide="arrow-right" class="h-4 w-4"></i></a>
      </div>
      <ul class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
${relatedTools(t).map((x) => toolCard(x)).join('\n')}
      </ul>
    </div>
  </section>
</main>`;
}

function toolsIndex() {
  return CATEGORIES.map((c) => {
    const list = TOOLS.filter((t) => t.category === c.id);
    return `<section id="${c.id}" class="scroll-mt-40 pt-14 first:pt-10" x-show="any($el)">
  <div class="flex items-start gap-4">
    <span class="tool-card-icon shrink-0"><i data-lucide="${c.icon}" class="h-5 w-5"></i></span>
    <div>
      <h2 class="font-display text-2xl font-bold sm:text-3xl">${esc(c.name)} <span class="align-middle text-base font-semibold text-primary/45">${list.length}</span></h2>
      <p class="mt-1 text-primary/65">${esc(c.blurb)}</p>
    </div>
  </div>
  <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
${list.map((t) => toolCard(t, true)).join('\n')}
  </ul>
</section>`;
  }).join('\n');
}

function toolsFeatured() {
  return `<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
${FEATURED.map((s) => toolCard(TOOL[s])).join('\n')}
</ul>`;
}

const TOOL_PAGES = TOOLS.map((t) => ({
  file: `tools/${t.slug}`,
  path: `/tools/${t.slug}`,
  nav: '/tools',
  type: 'WebPage',
  priority: '0.7',
  changefreq: 'monthly',
  crumbs: [{ name: 'Free tools', path: '/tools' }, { name: t.name, path: `/tools/${t.slug}` }],
  title: t.title,
  description: t.description,
  tool: t,
}));

// ---------------------------------------------------------------- build

// Empty dist/ rather than deleting it: `wrangler dev` keeps a watch handle on the folder (EPERM on Windows).
fs.mkdirSync(DIST, { recursive: true });
for (const entry of fs.readdirSync(DIST)) fs.rmSync(path.join(DIST, entry), { recursive: true, force: true });

// 1. Tailwind
execFileSync(process.execPath, [
  path.join(NM, 'tailwindcss', 'lib', 'cli.js'),
  '-c', path.join(ROOT, 'tailwind.config.js'),
  '-i', path.join(SRC, 'css', 'app.css'),
  '-o', path.join(DIST, 'css', 'app.css'),
  '--minify',
], { stdio: 'inherit', cwd: ROOT });

// 2. Scripts, fonts, images, root files
copy(path.join(NM, 'htmx.org', 'dist', 'htmx.min.js'), path.join(DIST, 'js', 'htmx.min.js'));
copy(path.join(NM, 'alpinejs', 'dist', 'cdn.min.js'), path.join(DIST, 'js', 'alpine.min.js'));
copy(path.join(SRC, 'js', 'app.js'), path.join(DIST, 'js', 'app.js'));
copy(path.join(SRC, 'js', 'tools.js'), path.join(DIST, 'js', 'tools.js'));
copy(path.join(SRC, 'js', 'dropdown.js'), path.join(DIST, 'js', 'dropdown.js'));
for (const w of [400, 500, 600, 700, 800]) {
  for (const subset of ['latin', 'latin-ext']) {
    const f = `poppins-${subset}-${w}-normal.woff2`;
    copy(path.join(NM, '@fontsource', 'poppins', 'files', f), path.join(DIST, 'fonts', f));
  }
}
for (const f of ['campy-logo.png', 'campy-icon-light-browser.png', 'campy-logo-white.png', 'favicon-light-mode.png', 'favicon-dark-mode.png']) {
  copy(path.join(ROOT, 'asset', f), path.join(DIST, 'asset', f));
}
for (const dir of ['photos', 'logos']) {
  fs.cpSync(path.join(ROOT, 'asset', dir), path.join(DIST, 'asset', dir), { recursive: true, filter: (f) => !f.endsWith('.md') });
}
fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });

const v = {
  css: hash(read(path.join(DIST, 'css', 'app.css'))),
  htmx: hash(read(path.join(DIST, 'js', 'htmx.min.js'))),
  app: hash(read(path.join(DIST, 'js', 'app.js'))),
  tools: hash(read(path.join(DIST, 'js', 'tools.js'))),
  dropdown: hash(read(path.join(DIST, 'js', 'dropdown.js'))),
  alpine: hash(read(path.join(DIST, 'js', 'alpine.min.js'))),
};

// 3. Partials
const partials = {};
for (const name of ['navbar', 'footer', 'consent']) partials[name] = inlineIcons(read(path.join(SRC, 'partials', `${name}.html`)));
partials.footer = partials.footer.replaceAll('{{year}}', String(YEAR));

// 4. Pages. Tool bodies can pull in shared snippets from src/tools/partials with {{include:name}}.
const generated = {
  'tools:index': toolsIndex(),
  'tools:featured': toolsFeatured(),
  'tools:count': String(TOOLS.length),
};
const includeToolPartials = (html) => html.replace(/\{\{include:([a-z-]+)\}\}/g, (_, name) => read(path.join(SRC, 'tools', 'partials', `${name}.html`)));

for (const page of [...PAGES, ...TOOL_PAGES]) {
  let main = page.tool
    ? toolMain(page.tool, includeToolPartials(read(path.join(SRC, 'tools', 'pages', `${page.tool.slug}.html`))))
    : read(path.join(SRC, 'pages', `${page.file}.html`));
  main = main.replace(/\{\{(tools:[a-z]+)\}\}/g, (_, key) => generated[key] ?? '');
  main = main.replace(/\{\{(site:[a-z-]+)\}\}/g, (_, key) => {
    if (!SECTIONS[key]) throw new Error(`Unknown section {{${key}}} in ${page.file}`);
    return SECTIONS[key]();
  });
  main = inlineIcons(main);

  const url = absolute(page.path);
  const navPath = page.nav || page.path;
  const navbar = partials.navbar.replaceAll(`data-nav href="${navPath}"`, `data-nav aria-current="page" href="${navPath}"`);
  const robots = page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  const html = `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <meta name="robots" content="${robots}">
  ${page.noindex ? '' : `<link rel="canonical" href="${url}">`}
  <meta name="author" content="Nexzart">
  <meta name="application-name" content="Campy">
  <meta name="theme-color" content="#0A204E">
  <meta name="format-detection" content="telephone=no">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Campy">
  <meta property="og:locale" content="en_IN">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE_URL}/og/campy-og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Campy school management software: Record it once. Everyone who needs it sees it.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@nexzart_">
  <meta name="twitter:title" content="${esc(page.title)}">
  <meta name="twitter:description" content="${esc(page.description)}">
  <meta name="twitter:image" content="${SITE_URL}/og/campy-og.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/asset/favicon-light-mode.png" media="(prefers-color-scheme: light)">
  <link rel="icon" type="image/png" sizes="192x192" href="/asset/favicon-dark-mode.png" media="(prefers-color-scheme: dark)">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preload" href="/fonts/poppins-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/poppins-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/css/app.css?v=${v.css}">
  <script defer src="/js/htmx.min.js?v=${v.htmx}"></script>
  <script defer src="/js/app.js?v=${v.app}"></script>
  <script defer src="/js/dropdown.js?v=${v.dropdown}"></script>
  ${page.tool ? `<script defer src="/js/tools.js?v=${v.tools}"></script>\n  ` : ''}<script defer src="/js/alpine.min.js?v=${v.alpine}"></script>
  <script type="application/ld+json">${jsonLd(page, main)}</script>
</head>
<body hx-boost="true" class="bg-white font-sans text-primary antialiased">
  <a href="#main" class="sr-only z-[60] rounded-lg bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
${navbar}
${main}
${partials.footer}
${partials.consent}
</body>
</html>
`;
  write(path.join(DIST, `${page.file}.html`), html);
}

// 5. Crawling and install metadata
const indexable = [...PAGES, ...TOOL_PAGES].filter((p) => !p.noindex);
write(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${indexable.map((p) => `  <url>
    <loc>${absolute(p.path)}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
    <image:image><image:loc>${SITE_URL}/og/campy-og.png</image:loc></image:image>
  </url>`).join('\n')}
</urlset>
`);

write(path.join(DIST, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`);

write(path.join(DIST, 'site.webmanifest'), JSON.stringify({
  name: 'Campy School Management',
  short_name: 'Campy',
  description: 'School management software by Nexzart',
  start_url: '/',
  display: 'standalone',
  background_color: '#FFFFFF',
  theme_color: '#0A204E',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2));

// Workers Static Assets reads _headers from the assets directory.
write(path.join(DIST, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000

/css/*
  Cache-Control: public, max-age=31536000, immutable

/js/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *

/asset/*
  Cache-Control: public, max-age=604800

/og/*
  Cache-Control: public, max-age=604800

/partials/*
  X-Robots-Tag: noindex
`);

for (const p of [...PAGES, ...TOOL_PAGES]) {
  if (p.title.length > 70) console.warn(`Long title (${p.title.length}): ${p.path}`);
  if (p.description.length > 165) console.warn(`Long description (${p.description.length}): ${p.path}`);
}
console.log(`Built ${PAGES.length} pages and ${TOOL_PAGES.length} tool pages for ${SITE_URL} into dist/`);
