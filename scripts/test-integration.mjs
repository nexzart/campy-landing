import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:8787';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw new Error('Integration tests are local-only.');
const env = Object.fromEntries(fs.readFileSync('.dev.vars', 'utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const tag = `qa-${randomUUID()}`, records = [];
let cookie = '';
async function request(path, { method = 'GET', data, authenticated = true, requestOrigin = origin, expected = 200 } = {}) {
  const response = await fetch(`${origin}/api/admin/${path}`, { method, headers: { 'Content-Type': 'application/json', Origin: requestOrigin, ...(authenticated && cookie ? { Cookie: cookie } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
  const json = await response.json(); assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(json)}`);
  return { response, json };
}
const booking = i => ({ email: `${tag}-${i}@example.com`, name: 'QA Contact', phone: '+91 98765 43210', school: `${tag} School ${i}`, role: 'Principal', size: 'Under 300', plan: 'Essential', message: '<script>unsafe</script>', notes: 'Test note', status: 'new' });
try {
  await request('bookings', { authenticated: false, expected: 401 });
  await request('login', { method: 'POST', data: { username: env.ADMIN_USERNAME, password: 'incorrect' }, expected: 401 });
  await request('login', { method: 'POST', requestOrigin: 'https://example.com', data: { username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD }, expected: 403 });
  const login = await request('login', { method: 'POST', data: { username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD } });
  cookie = login.response.headers.get('set-cookie').split(';')[0];
  assert.match(login.response.headers.get('set-cookie'), /HttpOnly/);
  const session = await request('session'); assert.equal(session.json.username, env.ADMIN_USERNAME); assert.equal(session.json.ADMIN_PASSWORD, undefined);
  assert.equal(session.json.emailConfigured, false, 'Disable EMAIL_DELIVERY_ENABLED on the local test server before creating disposable records.');
  for (let i = 0; i < 12; i++) { const { json } = await request('bookings', { method: 'POST', data: booking(i), expected: 201 }); records.push(['bookings', json.id]); }
  const query = new URLSearchParams({ q: tag, pageSize: '10' });
  let result = (await request(`bookings?${query}`)).json; assert.equal(result.total, 12); assert.equal(result.rows.length, 10);
  result = (await request(`bookings?${query}&page=2`)).json; assert.equal(result.rows.length, 2); assert.equal(result.page, 2);
  result = (await request(`bookings?${query}&page=999`)).json; assert.equal(result.page, 2);
  result = (await request(`bookings?q=${encodeURIComponent(`${tag}' OR 1=1 --`)}`)).json; assert.equal(result.total, 0);
  result = (await request(`bookings?q=${encodeURIComponent(tag)}%25`)).json; assert.equal(result.total, 0);
  const id = records[0][1], edit = { ...booking(0), status: 'scheduled', scheduled_at: '2026-10-20T09:00:00.000Z' };
  await request(`bookings/${id}`, { method: 'PUT', data: edit, requestOrigin: 'https://example.com', expected: 403 });
  await request(`bookings/${id}`, { method: 'PUT', data: { ...edit, scheduled_at: '' }, expected: 400 });
  await request(`bookings/${id}`, { method: 'PUT', data: edit });
  assert.equal((await request(`bookings/${id}`)).json.status, 'scheduled');
  result = (await request(`bookings?${query}&status=scheduled&plan=Essential`)).json; assert.equal(result.total, 1);
  const today = new Date().toISOString().slice(0, 10);
  result = (await request(`bookings?${query}&from=${today}&to=${today}`)).json; assert.equal(result.total, 12);
  result = (await request(`bookings?${query}&from=2000-01-01&to=2000-12-31`)).json; assert.equal(result.total, 0);
  await request('bookings?from=2026-02-30', { expected: 400 });
  await request('bookings?from=2026-10-20&to=2026-10-01', { expected: 400 });
  await request('bookings?pageSize=500', { expected: 400 });
  const email = `${tag}-subscriber@example.com`;
  const sub = (await request('subscribers', { method: 'POST', data: { email, status: 'active', notes: 'QA subscriber' }, expected: 201 })).json; records.push(['subscribers', sub.id]);
  await request('subscribers', { method: 'POST', data: { email: email.toUpperCase(), status: 'active' }, expected: 409 });
  await request(`subscribers/${sub.id}`, { method: 'PUT', data: { email, status: 'unsubscribed', notes: 'Opted out' } });
  assert.equal((await request(`subscribers?q=${tag}&status=unsubscribed`)).json.total, 1);
  await request(`subscribers/${id}`, { expected: 404 });
  // Cloudflare's official local Turnstile test secret verifies this dummy token.
  const publicPost = async (path, data) => {
    const response = await fetch(`${origin}/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'HX-Request': 'true' }, body: new URLSearchParams({ 'cf-turnstile-response': 'test-token', ...data }) });
    const html = await response.text(); assert.equal(response.status, 200); return html;
  };
  assert.match(await publicPost('subscribe', { email }), /subscription request/);
  assert.equal((await request(`subscribers/${sub.id}`)).json.status, 'unsubscribed');
  const publicEmail = `${tag}-public@example.com`;
  assert.match(await publicPost('subscribe', { email: publicEmail }), /subscription request/);
  const publicSubs = (await request(`subscribers?q=${publicEmail}`)).json.rows; assert.equal(publicSubs.length, 1); records.push(['subscribers', publicSubs[0].id]);
  const demo = { ...booking('public'), plan: '', size: '' };
  assert.match(await publicPost('demo', demo), /Request received/);
  const publicBookings = (await request(`bookings?q=${demo.email}`)).json.rows; assert.equal(publicBookings.length, 1); records.push(['bookings', publicBookings[0].id]);
  assert.equal(publicBookings[0].notification_status, 'pending', 'New public contacts must queue a team notification even while SMTP is disabled.');
  assert.equal(publicSubs[0].notification_status, 'not_requested', 'Newsletter signups are separate from contact enquiries.');
  const rejected = await publicPost('demo', { ...demo, 'cf-turnstile-response': '' }); assert.match(rejected, /verification check/);
  await request(`bookings/${id}`, { method: 'DELETE' }); records.splice(0, 1);
  await request(`bookings/${id}`, { expected: 404 });
  console.log('PASS: authentication, CSRF, CRUD, unique subscriptions, validation, search, date/plan/status filters, pagination, public forms and opt-out preservation.');
} finally {
  for (const type of ['bookings', 'subscribers']) {
    if (!cookie) break;
    const { json } = await request(`${type}?q=${tag}&pageSize=50`);
    for (const row of json.rows) await request(`${type}/${row.id}`, { method: 'DELETE' });
  }
  if (cookie) { await request('logout', { method: 'POST', data: {} }); cookie = ''; await request('session', { expected: 401 }); }
}
