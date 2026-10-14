import { deliverConfirmation, deliverTeamNotification, smtpConfigured, verifySmtp } from './email.js';
const encoder = new TextEncoder();
export const STATUSES = { bookings: ['new', 'contacted', 'scheduled', 'completed', 'cancelled'], subscribers: ['active', 'unsubscribed'] };
export const ROLES = ['Principal', 'School administrator', 'Teacher', 'Accountant or bursar', 'Owner or trustee', 'Other'];
export const SIZES = ['Under 300', '300 to 1,000', '1,000 to 3,000', 'More than 3,000', 'Several schools'];
export const PLANS = ['Essential', 'Professional ERP', 'Enterprise ERP + CMS', 'Custom: Essential with add-on modules'];
const FIELDS = ['email', 'name', 'phone', 'school', 'role', 'size', 'plan', 'message', 'status', 'notes', 'scheduled_at'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const reply = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff', ...headers } });
class InputError extends Error {}
async function digest(value) { return crypto.subtle.digest('SHA-256', encoder.encode(value)); }
async function equal(a, b) { const hashes = await Promise.all([digest(a), digest(b)]); return crypto.subtle.timingSafeEqual(...hashes); }
async function key(env) { return crypto.subtle.importKey('raw', encoder.encode(`${env.ADMIN_SESSION_SECRET}:${env.ADMIN_USERNAME}:${env.ADMIN_PASSWORD}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
const hex = (bytes) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
async function token(env) {
  const payload = `${Math.floor(Date.now() / 1000) + 28800}:${crypto.randomUUID()}`;
  return `${payload}.${hex(await crypto.subtle.sign('HMAC', await key(env), encoder.encode(payload)))}`;
}
async function authenticated(request, env) {
  const value = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith('campy_admin='))?.slice(12);
  if (!value || !/^\d+:[\w-]+\.[a-f0-9]{64}$/.test(value)) return false;
  const [payload, signature] = value.split('.');
  if (Number(payload.split(':')[0]) <= Date.now() / 1000) return false;
  return crypto.subtle.verify('HMAC', await key(env), Uint8Array.from(signature.match(/../g), h => parseInt(h, 16)), encoder.encode(payload));
}
function cookie(request, value, maxAge) {
  return `campy_admin=${value}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
async function body(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new InputError('Send JSON data.');
  if (Number(request.headers.get('content-length')) > 16384) throw new InputError('Request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new InputError('Request body is required.');
  let size = 0; const chunks = [];
  while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 16384) { await reader.cancel(); throw new InputError('Request is too large.'); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { const data = JSON.parse(new TextDecoder().decode(bytes)); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data; } catch { throw new InputError('Invalid JSON.'); }
}
export function validate(type, data) {
  const row = Object.fromEntries(FIELDS.map(f => [f, typeof data[f] === 'string' ? data[f].trim() : '']));
  row.email = row.email.toLowerCase();
  if (!EMAIL.test(row.email) || row.email.length > 200) throw new InputError('Enter a valid email address.');
  if (!STATUSES[type].includes(row.status)) throw new InputError('Choose a valid status.');
  if (row.notes.length > 4000 || row.message.length > 2000) throw new InputError('Notes must be under 4,000 characters and messages under 2,000.');
  if (type === 'bookings') {
    if (!row.name || row.name.length > 100 || !row.school || row.school.length > 150) throw new InputError('Enter a name (up to 100 characters) and school (up to 150).');
    if (!/^[+\d][\d\s-]{6,18}$/.test(row.phone)) throw new InputError('Enter a valid phone number.');
    if (!ROLES.includes(row.role) || (row.size && !SIZES.includes(row.size)) || (row.plan && !PLANS.includes(row.plan))) throw new InputError('Choose a valid role, school size and plan.');
    if (row.scheduled_at) {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.scheduled_at) || !Number.isFinite(Date.parse(row.scheduled_at))) throw new InputError('Enter a valid scheduled date.');
      row.scheduled_at = new Date(row.scheduled_at).toISOString();
    }
    if (row.status === 'scheduled' && !row.scheduled_at) throw new InputError('Choose the scheduled demo date and time.');
  } else { for (const field of ['name', 'phone', 'school', 'role', 'size', 'plan', 'message', 'scheduled_at']) row[field] = ''; }
  row.scheduled_at ||= null;
  return row;
}
export async function createLead(env, type, data, country = null, receivedAt = new Date().toISOString(), id = crypto.randomUUID(), requestEmail = false) {
  const row = validate(type, data);
  const columns = ['id', 'type', ...FIELDS, 'received_at', 'updated_at', 'country', 'email_status', 'notification_status'];
  const values = [id, type, ...FIELDS.map(f => row[f]), receivedAt, new Date().toISOString(), country, requestEmail ? 'pending' : 'not_requested', requestEmail && type === 'bookings' ? 'pending' : 'not_requested'];
  await env.DB.prepare(`INSERT INTO leads (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).bind(...values).run();
  return { id, ...row };
}
function dateFilter(value) {
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new InputError('Use valid filter dates.');
  return value;
}
async function list(env, type, params) {
  const where = ['type = ?'], values = [type];
  const q = (params.get('q') || '').trim();
  if (q.length > 200) throw new InputError('Search must be under 200 characters.');
  if (q) { where.push('(instr(lower(email), lower(?)) > 0 OR instr(lower(name), lower(?)) > 0 OR instr(lower(school), lower(?)) > 0 OR instr(phone, ?) > 0)'); values.push(q, q, q, q); }
  const status = params.get('status');
  if (status) { if (!STATUSES[type].includes(status)) throw new InputError('Invalid status.'); where.push('status = ?'); values.push(status); }
  const from = dateFilter(params.get('from')), to = dateFilter(params.get('to'));
  if (from && to && from > to) throw new InputError('From date must be on or before To date.');
  // Date filters use UTC receipt dates; to is inclusive.
  if (from) { where.push('received_at >= ?'); values.push(`${from}T00:00:00.000Z`); }
  if (to) { where.push('received_at < ?'); values.push(new Date(Date.parse(to) + 86400000).toISOString()); }
  const plan = params.get('plan');
  if (plan && type === 'bookings') { if (!PLANS.includes(plan)) throw new InputError('Invalid plan.'); where.push('plan = ?'); values.push(plan); }
  const pageSize = Number(params.get('pageSize') || 10), requestedPage = Number(params.get('page') || 1);
  if (![10, 25, 50].includes(pageSize) || !Number.isSafeInteger(requestedPage) || requestedPage < 1) throw new InputError('Invalid pagination.');
  const sort = params.get('sort') || 'newest'; if (!['newest', 'oldest'].includes(sort)) throw new InputError('Invalid sort order.');
  const clause = where.join(' AND ');
  const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM leads WHERE ${clause}`).bind(...values).first();
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(count.total / pageSize)));
  const direction = sort === 'oldest' ? 'ASC' : 'DESC';
  const [rows, stats] = await env.DB.batch([
    env.DB.prepare(`SELECT * FROM leads WHERE ${clause} ORDER BY received_at ${direction}, id ${direction} LIMIT ? OFFSET ?`).bind(...values, pageSize, (page - 1) * pageSize),
    env.DB.prepare('SELECT status, COUNT(*) AS count FROM leads WHERE type = ? GROUP BY status').bind(type),
  ]);
  return reply({ rows: rows.results, total: count.total, page, pageSize, stats: Object.fromEntries(stats.results.map(s => [s.status, s.count])) });
}
export async function handleAdmin(request, env) {
  try {
    if (!env.DB || !env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) return reply({ error: 'Admin is not configured. Set DB and admin environment secrets.' }, 503);
    const url = new URL(request.url), path = url.pathname;
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) return reply({ error: 'Method not allowed.' }, 405);
    if (request.method !== 'GET' && request.headers.get('origin') !== url.origin) return reply({ error: 'Request origin rejected.' }, 403);
    if (path === '/api/admin/login' && request.method === 'POST') {
      const data = await body(request);
      if (typeof data.username !== 'string' || typeof data.password !== 'string') throw new InputError('Enter your credentials.');
      const now = Math.floor(Date.now() / 1000), bucket = Math.floor(now / 900);
      const ip = request.headers.get('cf-connecting-ip') || 'local';
      const attemptKey = hex(await digest(`${ip}:${bucket}`));
      const result = await env.DB.prepare('INSERT INTO login_attempts (key, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 RETURNING attempts').bind(attemptKey, (bucket + 1) * 900).first();
      await env.DB.prepare('DELETE FROM login_attempts WHERE expires_at < ?').bind(now).run();
      if (result.attempts > 10) return reply({ error: 'Too many attempts. Try again in 15 minutes.' }, 429, { 'Retry-After': '900' });
      const [userOK, passwordOK] = await Promise.all([equal(data.username, env.ADMIN_USERNAME), equal(data.password, env.ADMIN_PASSWORD)]);
      if (!userOK || !passwordOK) return reply({ error: 'Incorrect username or password.' }, 401);
      await env.DB.prepare('DELETE FROM login_attempts WHERE key = ?').bind(attemptKey).run();
      return reply({ ok: true }, 200, { 'Set-Cookie': cookie(request, await token(env), 28800) });
    }
    if (!await authenticated(request, env)) return reply({ error: 'Sign in to continue.' }, 401);
    if (path === '/api/admin/session' && request.method === 'GET') return reply({ username: env.ADMIN_USERNAME, statuses: STATUSES, roles: ROLES, sizes: SIZES, plans: PLANS, emailConfigured: smtpConfigured(env) });
    if (path === '/api/admin/email/verify' && request.method === 'POST') return reply(await verifySmtp(env));
    const notificationMatch = path.match(/^\/api\/admin\/bookings\/([\w-]+)\/notification$/);
    if (notificationMatch && request.method === 'POST') {
      if (!smtpConfigured(env)) return reply({ error: 'Configure the SMTP_PASSWORD Worker secret first.' }, 503);
      const id = notificationMatch[1];
      const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ? AND type = 'bookings'").bind(id).first();
      if (!lead) return reply({ error: 'Record not found.' }, 404);
      if (lead.notification_status === 'sent') return reply({ status: 'sent', alreadySent: true });
      const now = Math.floor(Date.now() / 1000);
      if (lead.notification_status === 'sending' && lead.notification_lock_until >= now) return reply({ error: 'The team notification is already sending.' }, 409);
      await env.DB.prepare("UPDATE leads SET notification_status = 'pending', notification_attempts = 0, notification_error = NULL, notification_next_attempt_at = 0 WHERE id = ? AND notification_status != 'sent' AND NOT (notification_status = 'sending' AND notification_lock_until >= ?)").bind(id, now).run();
      const result = await deliverTeamNotification(env, id);
      return reply(result, result.status === 'failed' ? 502 : 200);
    }
    const emailMatch = path.match(/^\/api\/admin\/(bookings|subscribers)\/([\w-]+)\/email$/);
    if (emailMatch && request.method === 'POST') {
      if (!smtpConfigured(env)) return reply({ error: 'Configure the SMTP_PASSWORD Worker secret first.' }, 503);
      const [, type, id] = emailMatch;
      const lead = await env.DB.prepare('SELECT * FROM leads WHERE id = ? AND type = ?').bind(id, type).first();
      if (!lead) return reply({ error: 'Record not found.' }, 404);
      if (type === 'subscribers' && lead.status === 'unsubscribed') return reply({ error: 'Do not send confirmation emails to unsubscribed contacts.' }, 409);
      const now = Math.floor(Date.now() / 1000);
      if (lead.email_status === 'sending' && lead.email_lock_until >= now) return reply({ error: 'This email is already being sent.' }, 409);
      if (lead.email_sent_at && Date.now() - Date.parse(lead.email_sent_at) < 60000) return reply({ error: 'Wait a minute before sending this confirmation again.' }, 429);
      await env.DB.prepare("UPDATE leads SET email_status = 'pending', email_attempts = 0, email_error = NULL, email_next_attempt_at = 0 WHERE id = ? AND NOT (email_status = 'sending' AND email_lock_until >= ?)").bind(id, now).run();
      const result = await deliverConfirmation(env, id);
      return reply(result, result.status === 'failed' ? 502 : 200);
    }
    if (path === '/api/admin/logout' && request.method === 'POST') return reply({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) });
    const match = path.match(/^\/api\/admin\/(bookings|subscribers)(?:\/([\w-]+))?$/);
    if (!match) return reply({ error: 'Not found.' }, 404);
    const [, type, id] = match;
    if (!id && request.method === 'GET') return await list(env, type, url.searchParams);
    if (!id && request.method === 'POST') return reply(await createLead(env, type, await body(request)), 201);
    if (id) {
      const existing = await env.DB.prepare('SELECT * FROM leads WHERE id = ? AND type = ?').bind(id, type).first();
      if (!existing) return reply({ error: 'Record not found.' }, 404);
      if (request.method === 'GET') return reply(existing);
      if (request.method === 'DELETE') { await env.DB.prepare('DELETE FROM leads WHERE id = ? AND type = ?').bind(id, type).run(); return reply({ ok: true }); }
      if (request.method === 'PUT') {
        const row = validate(type, await body(request));
        await env.DB.prepare(`UPDATE leads SET ${FIELDS.map(f => `${f} = ?`).join(',')}, updated_at = ? WHERE id = ? AND type = ?`).bind(...FIELDS.map(f => row[f]), new Date().toISOString(), id, type).run();
        return reply({ id, ...row });
      }
    }
    return reply({ error: 'Method not allowed.' }, 405);
  } catch (error) {
    if (error instanceof InputError) return reply({ error: error.message }, 400);
    if (String(error.message).includes('UNIQUE constraint failed')) return reply({ error: 'This email is already subscribed.' }, 409);
    console.error('Admin request failed', { message: error.message });
    return reply({ error: 'Unable to complete the request. Please try again.' }, 500);
  }
}
