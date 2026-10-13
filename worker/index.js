// Campy landing – Cloudflare Worker.
// Static pages are served from ./dist by Workers Static Assets; this script only runs
// for /api/* (see run_worker_first in wrangler.jsonc) and answers the htmx form posts
// with HTML fragments. Submissions are stored in the LEADS KV namespace.

const ROLES = ['Principal', 'School administrator', 'Teacher', 'Owner or trustee', 'Other'];
const SIZES = ['Under 300', '300 to 1,000', '1,000 to 3,000', 'More than 3,000', 'Several schools'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s-]{6,18}$/;
const MAX_BODY = 16 * 1024;

const SVG_ATTRS = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICON_CHECK = `<svg ${SVG_ATTRS} class="lucide h-6 w-6"><path d="M20 6 9 17l-5-5"/></svg>`;
const ICON_MAIL_CHECK = `<svg ${SVG_ATTRS} class="lucide mt-0.5 h-5 w-5 text-secondary"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><path d="m16 19 2 2 4-4"/></svg>`;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function html(body, { status = 200, headers = {} } = {}) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...headers },
  });
}

function redirect(location) {
  return new Response(null, { status: 303, headers: { Location: location } });
}

async function readForm(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY) throw new Error('Payload too large');
  const text = await request.text();
  if (text.length > MAX_BODY) throw new Error('Payload too large');
  return new URLSearchParams(text);
}

async function save(env, prefix, record, request) {
  const entry = {
    ...record,
    receivedAt: new Date().toISOString(),
    country: request.cf?.country ?? null,
    userAgent: request.headers.get('user-agent') ?? null,
  };
  if (!env.LEADS) {
    console.log(`[${prefix}] LEADS binding missing, logging only`, JSON.stringify(entry));
    return;
  }
  await env.LEADS.put(`${prefix}:${entry.receivedAt}:${crypto.randomUUID()}`, JSON.stringify(entry));
}

function errorList(errors) {
  return `<div class="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 text-sm" role="alert">
  <p class="font-semibold">Check these fields and send again:</p>
  <ul class="mt-2 list-disc space-y-1 pl-5 text-primary/80">${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>
</div>`;
}

function demoSuccess(lead) {
  const first = escapeHtml(lead.name.split(/\s+/)[0] || lead.name);
  return `<div id="demo-form" class="rounded-2xl border border-primary/10 bg-white p-8 shadow-card" role="status">
  <span class="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">${ICON_CHECK}</span>
  <h2 class="font-display mt-6 text-2xl font-bold">Request received, ${first}.</h2>
  <p class="mt-3 text-primary/70">We’ll email <strong class="font-semibold text-primary">${escapeHtml(lead.email)}</strong> to find a time for a walkthrough of Campy for ${escapeHtml(lead.school)}.</p>
  <p class="mt-6 text-sm text-primary/60">Have your class list and current timetable handy. We’ll use them to show you your own school in Campy.</p>
  <a href="/features" class="btn btn-outline mt-8">Read about the features</a>
</div>`;
}

async function handleDemo(request, env) {
  const form = await readForm(request);
  const v = (k) => (form.get(k) || '').trim();
  const isHtmx = request.headers.get('hx-request') === 'true';
  const lead = {
    name: v('name'), email: v('email'), phone: v('phone'), school: v('school'),
    role: v('role'), size: v('size'), message: v('message'),
  };

  // Honeypot: bots fill every field. Pretend it worked and store nothing.
  if (v('website')) return isHtmx ? html(demoSuccess(lead)) : redirect('/contact?sent=1');

  const errors = [];
  if (!lead.name || lead.name.length > 100) errors.push('Enter your full name.');
  if (!EMAIL_RE.test(lead.email) || lead.email.length > 200) errors.push('Enter a work email address, like principal@yourschool.in.');
  if (lead.phone && !PHONE_RE.test(lead.phone)) errors.push('Enter a phone number with digits only, or leave it blank.');
  if (!lead.school || lead.school.length > 150) errors.push('Enter the name of your school.');
  if (!ROLES.includes(lead.role)) errors.push('Choose your role at the school.');
  if (lead.size && !SIZES.includes(lead.size)) errors.push('Choose a school size from the list.');
  if (lead.message.length > 2000) errors.push('Keep the message under 2,000 characters.');

  if (errors.length) {
    if (!isHtmx) return redirect('/contact?error=1');
    return html(errorList(errors), { headers: { 'HX-Retarget': '#demo-errors', 'HX-Reswap': 'innerHTML' } });
  }

  await save(env, 'demo', lead, request);
  return isHtmx ? html(demoSuccess(lead)) : redirect('/contact?sent=1');
}

async function handleSubscribe(request, env) {
  const form = await readForm(request);
  const email = (form.get('email') || '').trim();
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return html('<p class="text-sm text-white/80">Enter a valid email address to subscribe.</p>', {
      headers: { 'HX-Retarget': '#subscribe-msg', 'HX-Reswap': 'innerHTML' },
    });
  }
  await save(env, 'subscriber', { email }, request);
  return html(`<div id="subscribe-form" class="flex items-start gap-3 rounded-xl bg-white/5 p-4 text-sm" role="status">
  ${ICON_MAIL_CHECK}
  <p class="text-white/80">Subscribed. Product updates will go to <span class="text-white">${escapeHtml(email)}</span>.</p>
</div>`);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/demo' || pathname === '/api/subscribe') {
      if (request.method !== 'POST') return html('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
      try {
        return pathname === '/api/demo' ? await handleDemo(request, env) : await handleSubscribe(request, env);
      } catch (err) {
        console.error(err);
        return html('<p class="text-sm">That request could not be read. Refresh the page and try again.</p>', { status: 400 });
      }
    }

    if (pathname.startsWith('/api/')) return html('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
