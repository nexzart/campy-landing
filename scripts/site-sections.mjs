// Renders src/site/catalog.mjs into HTML sections. Pages pull them in with {{site:name}};
// see SECTIONS at the bottom for the names.

import * as simpleIcons from 'simple-icons';
import { ADDONS, INTEGRATIONS, LOGOS, MODULES, PLANS, PLATFORM_FEE_PERCENT } from '../src/site/catalog.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rupees = (n) => '₹' + n.toLocaleString('en-IN');
const PLAN = Object.fromEntries(PLANS.map((p) => [p.id, p]));
const PLAN_ORDER = PLANS.map((p) => p.id);
const PLAN_LABEL = { essential: 'Essential', professional: 'Professional', enterprise: 'Enterprise' };

function planBadge(planId, dark = false) {
  const cls = planId === 'essential'
    ? (dark ? 'bg-white/10 text-white' : 'bg-primary/[0.06] text-primary')
    : planId === 'professional' ? 'bg-secondary/30 text-primary' : 'bg-primary text-white';
  return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}">${planId === 'essential' ? 'All plans' : 'From ' + PLAN_LABEL[planId]}</span>`;
}

// Homepage: every module as a card.
function modulesGrid() {
  return `<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
${MODULES.map((m) => `  <li>
    <a href="/features#${m.id}" class="tool-card group">
      <span class="flex items-start justify-between gap-3">
        <span class="tool-card-icon"><i data-lucide="${m.icon}" class="h-5 w-5"></i></span>
        ${planBadge(m.plan)}
      </span>
      <span class="mt-5 block text-lg font-semibold leading-snug">${esc(m.name)}</span>
      <span class="mt-2 block text-sm leading-relaxed text-primary/65">${esc(m.tagline)}</span>
      <span class="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold">${m.features.length} features<i data-lucide="arrow-right" class="h-4 w-4 transition-transform group-hover:translate-x-0.5"></i></span>
    </a>
  </li>`).join('\n')}
</ul>`;
}

// Homepage: the new ERP and CMS modules as photo cards.
function modulesShowcase() {
  return `<ul class="grid gap-6 md:grid-cols-3">
${['fees', 'hr-payroll', 'website'].map((id) => {
    const m = MODULES.find((x) => x.id === id);
    return `  <li>
    <a href="/features#${m.id}" class="role-card group block !aspect-[4/5] md:!aspect-[3/4]">
      <img src="/asset/photos/${m.photo}.webp" width="1200" height="900" loading="lazy" alt="${esc(m.alt)}">
      <div class="role-card-body">
        <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary"><i data-lucide="${m.icon}" class="h-5 w-5"></i></span>
        <h3 class="mt-4 text-xl font-semibold">${esc(m.name)}</h3>
        <p class="mt-2 text-[0.9375rem] leading-relaxed text-white/80">${esc(m.tagline)}</p>
      </div>
    </a>
  </li>`;
  }).join('\n')}
</ul>`;
}

// A sticky jump menu that scrolls itself in a loop. app.js clones the links to fill the loop;
// without JavaScript, or with reduced motion, it stays a row you can swipe.
function marqueeNav(label, links) {
  return `<nav class="sticky top-[73px] z-40 border-y border-primary/10 bg-white/95 backdrop-blur" aria-label="${esc(label)}">
  <div class="marquee mx-auto max-w-6xl" data-marquee>
    <div class="marquee-track">
      <ul class="marquee-group py-2.5 text-sm font-medium">
${links.map(([href, html]) => `        <li><a href="${href}" class="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-primary/70 hover:bg-primary/[0.05] hover:text-primary">${html}</a></li>`).join('\n')}
      </ul>
    </div>
  </div>
</nav>`;
}

// /features: a sticky module menu, then one section per module.
function featuresDetail() {
  const nav = marqueeNav('Modules', MODULES.map((m) => [`#${m.id}`, `<i data-lucide="${m.icon}" class="h-4 w-4"></i>${esc(m.name)}`]));

  const sections = MODULES.map((m, i) => `<section id="${m.id}" class="scroll-mt-32 border-t border-primary/10${i % 2 ? ' bg-primary/[0.025]' : ''}" aria-labelledby="${m.id}-title">
  ${(m.aliases || []).map((a) => `<span id="${a}" class="block scroll-mt-32" aria-hidden="true"></span>`).join('')}
  <div class="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:px-8 lg:py-20">
    <div class="lg:sticky lg:top-40 lg:self-start">
      <div class="flex items-center gap-3">
        <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/25"><i data-lucide="${m.icon}" class="h-6 w-6"></i></span>
        ${planBadge(m.plan)}
      </div>
      <h2 id="${m.id}-title" class="font-display mt-6 text-3xl font-bold sm:text-4xl">${esc(m.name)}</h2>
      <p class="mt-4 text-lg leading-relaxed text-primary/70">${esc(m.tagline)}</p>
      ${m.photo ? `<img src="/asset/photos/${m.photo}.webp" width="1200" height="900" loading="lazy" alt="${esc(m.alt)}" class="mt-8 aspect-[4/3] w-full rounded-3xl object-cover">` : ''}
    </div>
    <ul class="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:pt-2">
${m.features.map(([icon, title, desc]) => `      <li class="flex gap-4">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-white"><i data-lucide="${icon}" class="h-5 w-5"></i></span>
        <span><span class="block font-semibold">${esc(title)}</span><span class="mt-1 block text-[0.9375rem] leading-relaxed text-primary/70">${esc(desc)}</span></span>
      </li>`).join('\n')}
    </ul>
  </div>
</section>`).join('\n');

  return nav + '\n' + sections;
}

function planCards() {
  return `<ul class="grid gap-6 lg:grid-cols-3">
${PLANS.map((p) => {
    const dark = p.popular;
    const deal = p.deal;
    const box = dark ? 'on-dark relative overflow-hidden bg-primary text-white shadow-card'
      : deal ? 'relative border-2 border-secondary bg-secondary/[0.06] shadow-card' : 'border border-primary/10 bg-white';
    return `  <li class="${box} flex flex-col rounded-3xl p-8">
    ${dark ? '<span class="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-secondary/20" aria-hidden="true"></span>' : ''}
    <div class="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h3 class="text-lg font-semibold">${esc(p.name)}</h3>
      ${dark ? '<span class="whitespace-nowrap rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">Most popular</span>' : ''}
      ${deal ? `<span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary"><i data-lucide="zap" class="h-3.5 w-3.5"></i>${esc(deal.badge)}</span>` : ''}
    </div>
    <p class="relative mt-2 text-[0.9375rem] ${dark ? 'text-white/75' : 'text-primary/65'}">${esc(p.tagline)}</p>
    <p class="relative mt-6"><span class="font-display text-4xl font-bold${deal ? ' marker' : ''}">${rupees(p.price)}</span><span class="${dark ? 'text-white/70' : 'text-primary/60'}"> /year</span></p>
    <p class="relative mt-1 text-sm ${dark ? 'text-white/70' : 'text-primary/60'}">+ GST · unlimited students and staff</p>
    ${deal ? `<p class="relative mt-4 flex gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold"><i data-lucide="lock" class="mt-0.5 h-4 w-4 shrink-0 text-secondary"></i>${esc(deal.note)}</p>` : ''}
    <ul class="relative mt-7 space-y-3 text-[0.9375rem]">
${p.highlights.map((h) => `      <li class="flex gap-3"><i data-lucide="circle-check" class="mt-0.5 h-5 w-5 text-secondary"></i>${esc(h)}</li>`).join('\n')}
      <li class="flex gap-3"><i data-lucide="hard-drive" class="mt-0.5 h-5 w-5 ${dark ? 'text-white/60' : 'text-primary/50'}"></i>${esc(p.storage)} storage</li>
      <li class="flex gap-3"><i data-lucide="life-buoy" class="mt-0.5 h-5 w-5 ${dark ? 'text-white/60' : 'text-primary/50'}"></i>${esc(p.support)}</li>
    </ul>
    <a href="/contact?plan=${p.id}" class="btn ${dark || deal ? 'btn-lime' : 'btn-outline'} relative mt-8">${esc(p.cta)}${deal ? '<i data-lucide="arrow-right" class="h-4 w-4"></i>' : ''}</a>
  </li>`;
  }).join('\n')}
</ul>`;
}

function planCompare() {
  const cell = (ok) => ok
    ? '<td class="px-4 py-3 text-center"><i data-lucide="check" class="mx-auto h-5 w-5"></i><span class="sr-only">Included</span></td>'
    : '<td class="px-4 py-3 text-center text-primary/30">–<span class="sr-only">Not included</span></td>';
  const includes = (planId, modulePlan) => PLAN_ORDER.indexOf(planId) >= PLAN_ORDER.indexOf(modulePlan);
  const rows = MODULES.map((m) => `<tr><th scope="row" class="px-4 py-3 text-left font-medium"><span class="flex items-center gap-2.5"><i data-lucide="${m.icon}" class="h-4 w-4 text-primary/60"></i>${esc(m.name)}</span></th>${PLAN_ORDER.map((p) => cell(includes(p, m.plan))).join('')}</tr>`);
  const text = (label, values) => `<tr><th scope="row" class="px-4 py-3 text-left font-medium">${label}</th>${values.map((v) => `<td class="px-4 py-3 text-center">${v}</td>`).join('')}</tr>`;
  return `<div class="relative overflow-x-auto rounded-2xl border border-primary/10">
  <table class="w-full min-w-[640px] text-[0.9375rem]">
    <thead class="bg-primary text-white">
      <tr><th scope="col" class="px-4 py-4 text-left font-semibold">Module</th>${PLANS.map((p) => `<th scope="col" class="px-4 py-4 text-center font-semibold">${esc(p.name)}<span class="block text-sm font-normal text-white/70">${rupees(p.price)}/yr</span></th>`).join('')}</tr>
    </thead>
    <tbody class="divide-y divide-primary/10">
      ${rows.join('\n      ')}
      ${text('Students and staff', PLANS.map(() => 'Unlimited'))}
      ${text('Storage', PLANS.map((p) => esc(p.storage)))}
      ${text('Development or customisation cost', PLANS.map(() => '<span class="font-semibold">₹0</span>'))}
      ${text('Platform fee on fee collections', PLANS.map(() => `${PLATFORM_FEE_PERCENT}%`))}
    </tbody>
  </table>
</div>`;
}

// /pricing: an Essential plan plus chosen add-ons, compared with Professional.
function planBuilder() {
  const data = { base: PLAN.essential.price, professional: PLAN.professional.price, addons: ADDONS };
  return `<script type="application/json" id="plan-builder-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<div x-data="planBuilder" class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
  <div class="rounded-3xl border border-primary/10 bg-white p-6 sm:p-8">
    <p class="font-semibold">Essential, ${rupees(PLAN.essential.price)}/year, plus:</p>
    <ul class="mt-5 grid gap-3 sm:grid-cols-2">
      <template x-for="a in addons" :key="a.id">
        <li>
          <label class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors" :class="picked[a.id] ? 'border-primary bg-primary/[0.03]' : 'border-primary/10 hover:border-primary/30'">
            <span class="flex items-center gap-3"><input type="checkbox" class="h-4 w-4 accent-[#0A204E]" x-model="picked[a.id]"><span class="text-[0.9375rem] font-medium" x-text="a.name"></span></span>
            <span class="whitespace-nowrap text-sm text-primary/60" x-text="'+' + rupees(a.price)"></span>
          </label>
        </li>
      </template>
    </ul>
  </div>
  <div class="on-dark flex flex-col rounded-3xl bg-primary p-6 text-white sm:p-8" aria-live="polite">
    <p class="text-sm font-semibold uppercase tracking-wider text-secondary">Your plan</p>
    <p class="font-display mt-4 text-4xl font-bold" x-text="rupees(total)">${rupees(PLAN.essential.price)}</p>
    <p class="mt-1 text-white/70">per year + GST, unlimited students and staff</p>
    <p class="mt-6 text-white/80" x-show="count === 0">Tick the modules you need. You can add more at any time.</p>
    <p class="mt-6 text-white/80" x-show="count > 0 && total < professional" x-cloak>Essential with <span x-text="count"></span> <span x-text="count === 1 ? 'module' : 'modules'"></span>.</p>
    <div class="mt-6 rounded-2xl bg-white/10 p-4" x-show="total >= professional" x-cloak>
      <p class="font-semibold text-secondary">Professional ERP costs less.</p>
      <p class="mt-1 text-sm text-white/80">It includes every one of these modules and more for <span x-text="rupees(professional)"></span>, saving you <strong x-text="rupees(total - professional)"></strong> a year.</p>
    </div>
    <a href="/contact" class="btn btn-lime mt-8" :href="'/contact?plan=' + (total >= professional ? 'professional' : 'essential')">Get this quote</a>
  </div>
</div>`;
}

function integrationsStrip() {
  return `<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
${INTEGRATIONS.slice(0, 8).map((g) => `  <li class="rounded-2xl border border-primary/10 bg-white p-5">
    <span class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.05]"><i data-lucide="${g.icon}" class="h-5 w-5"></i></span><span class="font-semibold">${esc(g.name)}</span></span>
    <p class="mt-3 text-sm leading-relaxed text-primary/65">${esc(g.items.slice(0, 4).map((i) => i[0]).join(', '))}${g.items.length > 4 ? ' and more' : ''}.</p>
  </li>`).join('\n')}
</ul>`;
}

const SIMPLE_ICONS = Object.fromEntries(Object.values(simpleIcons).map((i) => [i.slug, i]));

// One logo tile: a Simple Icons mark in its brand colour, an image from asset/logos, or a Lucide icon.
function logoTile(key) {
  if (key.startsWith('icon:')) {
    return `<span class="logo-tile text-primary/60"><i data-lucide="${key.slice(5)}" class="h-5 w-5"></i></span>`;
  }
  const logo = LOGOS[key];
  if (!logo) throw new Error(`Unknown integration logo "${key}"`);
  if (logo.si) {
    const icon = SIMPLE_ICONS[logo.si];
    if (!icon) throw new Error(`Simple Icons has no "${logo.si}"`);
    return `<span class="logo-tile" title="${esc(logo.name)}"><svg role="img" viewBox="0 0 24 24" fill="#${icon.hex}" class="h-6 w-6"><title>${esc(logo.name)}</title><path d="${icon.path}"/></svg></span>`;
  }
  return logo.wide
    ? `<span class="logo-tile logo-tile-wide" title="${esc(logo.name)}"><img src="/asset/logos/${logo.file}" alt="${esc(logo.name)}" loading="lazy" class="h-5 w-auto"></span>`
    : `<span class="logo-tile" title="${esc(logo.name)}"><img src="/asset/logos/${logo.file}" alt="${esc(logo.name)}" loading="lazy" class="h-7 w-7 rounded-md object-contain"></span>`;
}

// /integrations: one section per category, each provider with its logo.
function integrationsDetail() {
  return INTEGRATIONS.map((g, i) => `<section id="${g.id}" class="scroll-mt-28 border-t border-primary/10${i % 2 ? ' bg-primary/[0.025]' : ''}" aria-labelledby="${g.id}-title">
  <div class="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8">
    <div>
      <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/25"><i data-lucide="${g.icon}" class="h-6 w-6"></i></span>
      <h2 id="${g.id}-title" class="font-display mt-6 text-3xl font-bold">${esc(g.name)}</h2>
      <p class="mt-2 text-sm font-semibold uppercase tracking-wider text-primary/50">Why schools use it</p>
      <p class="mt-2 text-lg leading-relaxed text-primary/70">${esc(g.why)}</p>
      ${g.photo ? `<img src="/asset/photos/${g.photo}.webp" width="1200" height="900" loading="lazy" alt="A face recognition attendance terminal mounted on a wall" class="mt-8 aspect-[4/3] w-full rounded-3xl object-cover">` : ''}
    </div>
    <ul class="grid content-start gap-3 sm:grid-cols-2">
${g.items.map(([name, desc, logos = []]) => `      <li class="rounded-2xl border border-primary/10 bg-white p-5">
        <div class="flex flex-wrap gap-2">${logos.map(logoTile).join('')}</div>
        <p class="mt-4 font-semibold">${esc(name)}</p>
        <p class="mt-1.5 text-[0.9375rem] leading-relaxed text-primary/65">${esc(desc)}</p>
      </li>`).join('\n')}
    </ul>
  </div>
</section>`).join('\n');
}

export const SECTIONS = {
  'site:modules-grid': modulesGrid,
  'site:modules-showcase': modulesShowcase,
  'site:features': featuresDetail,
  'site:plans': planCards,
  'site:plan-compare': planCompare,
  'site:plan-builder': planBuilder,
  'site:integrations-strip': integrationsStrip,
  'site:integrations': integrationsDetail,
  'site:integrations-nav': () => marqueeNav('Integration categories', INTEGRATIONS.map((g) => [`#${g.id}`, esc(g.nav)])),
  'site:module-count': () => String(MODULES.length),
  'site:feature-count': () => String(MODULES.reduce((n, m) => n + m.features.length, 0)),
  'site:platform-fee': () => String(PLATFORM_FEE_PERCENT),
};

export { MODULES, PLANS, PLATFORM_FEE_PERCENT };
