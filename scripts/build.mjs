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
    title: 'Campy | One School, One System: School Management Software',
    description: 'Campy brings attendance, exams, timetables, homework, leave, announcements and student records into one system, for one annual fee with unlimited students and staff.',
  },
  {
    file: 'features', path: '/features', type: 'WebPage', priority: '0.9', changefreq: 'monthly', crumb: 'Features',
    title: 'School Management Features: Attendance, Exams & More | Campy',
    description: 'Every Campy module: period-wise attendance with parent alerts, exams and grading, timetable clash detection, homework, leave, promotion and audit logs.',
  },
  {
    file: 'portals', path: '/portals', type: 'WebPage', priority: '0.8', changefreq: 'monthly', crumb: 'Portals',
    title: 'Admin, Teacher and Parent Portals | Campy School Software',
    description: 'What school admins, teachers, parents and super admins can see and do in Campy, with a full access matrix and role-based permissions.',
  },
  {
    file: 'platform', path: '/platform', type: 'AboutPage', priority: '0.7', changefreq: 'monthly', crumb: 'Platform',
    title: 'Platform, Security and Technology | Campy by Nexzart',
    description: 'How Campy keeps each school’s data separate, permissioned, audited and available offline, the technology behind it, and the Nexzart team that builds it.',
  },
  {
    file: 'pricing', path: '/pricing', type: 'WebPage', priority: '0.9', changefreq: 'monthly', crumb: 'Pricing',
    title: 'Pricing: One Annual Fee, Unlimited Students | Campy',
    description: 'Campy costs ₹35,000–₹40,000 a year for unlimited students and unlimited staff, with 40–50 GB of storage included. No per-student or per-staff charges.',
  },
  {
    file: 'contact', path: '/contact', type: 'ContactPage', priority: '0.8', changefreq: 'yearly', crumb: 'Book a demo',
    title: 'Book a Demo of Campy School Management Software',
    description: 'Book a 30-minute walkthrough of Campy set up with your school’s classes and timetable, or email admin@nexzart.com.',
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
  const software = {
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name: 'Campy',
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/og/campy-og.png`,
    description: 'School management software that connects attendance, exams, timetables, homework, leave and parent communication through admin, staff and parent portals.',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'School management system',
    operatingSystem: 'Web, Android, iOS',
    inLanguage: 'en-IN',
    featureList: [
      'Half-day and period-wise attendance with parent absence alerts',
      'Exams, marks entry, grading and result publication',
      'Timetable and academic calendar with staff conflict detection',
      'Homework with PDF attachments, announcements and reminders',
      'Student and staff leave with substitute assignment',
      'Academic year promotion, archives and alumni records',
      'Checklists for fees, books and forms',
      'Role-based permissions, audit logs and offline support',
    ],
    creator: { '@id': NEXZART['@id'] },
    publisher: { '@id': NEXZART['@id'] },
    offers: {
      '@type': 'AggregateOffer',
      name: 'Annual platform fee, unlimited students and staff',
      lowPrice: '35000',
      highPrice: '40000',
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
      ...(page.crumb ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
    },
  ];

  if (page.crumb) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: page.crumb, item: url },
      ],
    });
  }

  const faq = faqFromHtml(main);
  if (faq.length) graph.push({ '@type': 'FAQPage', '@id': `${url}#faq`, url, mainEntity: faq, isPartOf: { '@id': `${url}#webpage` } });

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

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
for (const w of [400, 500, 600, 700, 800]) {
  for (const subset of ['latin', 'latin-ext']) {
    const f = `poppins-${subset}-${w}-normal.woff2`;
    copy(path.join(NM, '@fontsource', 'poppins', 'files', f), path.join(DIST, 'fonts', f));
  }
}
for (const f of ['campy-logo.png', 'campy-icon.png', 'campy-logo-white.png', 'favicon.png']) {
  copy(path.join(ROOT, 'asset', f), path.join(DIST, 'asset', f));
}
fs.cpSync(path.join(ROOT, 'asset', 'photos'), path.join(DIST, 'asset', 'photos'), { recursive: true, filter: (f) => !f.endsWith('.md') });
fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });

const v = {
  css: hash(read(path.join(DIST, 'css', 'app.css'))),
  htmx: hash(read(path.join(DIST, 'js', 'htmx.min.js'))),
  app: hash(read(path.join(DIST, 'js', 'app.js'))),
  alpine: hash(read(path.join(DIST, 'js', 'alpine.min.js'))),
};

// 3. Partials (portal tabs are fetched by htmx at runtime, so they ship too)
const partials = {};
for (const name of ['navbar', 'footer']) partials[name] = inlineIcons(read(path.join(SRC, 'partials', `${name}.html`)));
partials.footer = partials.footer.replaceAll('{{year}}', String(YEAR));
for (const f of fs.readdirSync(path.join(SRC, 'partials', 'portals'))) {
  const html = inlineIcons(read(path.join(SRC, 'partials', 'portals', f)));
  partials[`portal:${path.basename(f, '.html')}`] = html;
  write(path.join(DIST, 'partials', 'portals', f), html);
}

// 4. Pages
for (const page of PAGES) {
  let main = read(path.join(SRC, 'pages', `${page.file}.html`));
  main = main.replace(/\{\{(portal:[a-z-]+)\}\}/g, (_, key) => partials[key] ?? '');
  main = inlineIcons(main);

  const url = absolute(page.path);
  const navbar = partials.navbar.replaceAll(`data-nav href="${page.path}"`, `data-nav aria-current="page" href="${page.path}"`);
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
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" type="image/png" href="/asset/favicon.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preload" href="/fonts/poppins-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/poppins-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/css/app.css?v=${v.css}">
  <script defer src="/js/htmx.min.js?v=${v.htmx}"></script>
  <script defer src="/js/app.js?v=${v.app}"></script>
  <script defer src="/js/alpine.min.js?v=${v.alpine}"></script>
  <script type="application/ld+json">${jsonLd(page, main)}</script>
</head>
<body hx-boost="true" class="bg-white font-sans text-primary antialiased">
  <a href="#main" class="sr-only z-[60] rounded-lg bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
${navbar}
${main}
${partials.footer}
</body>
</html>
`;
  write(path.join(DIST, `${page.file}.html`), html);
}

// 5. Crawling and install metadata
const indexable = PAGES.filter((p) => !p.noindex);
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

console.log(`Built ${PAGES.length} pages for ${SITE_URL} into dist/`);
