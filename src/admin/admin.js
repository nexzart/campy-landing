(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { section: 'bookings', page: 1, pageSize: 10, rows: [], total: 0, editing: null, deleting: null, mailing: null, config: null, loading: false };
  const labels = { new: 'New request', contacted: 'Contacted', scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled', active: 'Active', unsubscribed: 'Unsubscribed' };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const field = (form, name) => form.elements.namedItem(name);
  const option = (value, label = value) => `<option value="${escape(value)}">${escape(label)}</option>`;
  const date = value => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : '—';
  const time = value => new Intl.DateTimeFormat('en-IN', { timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
  let controller, toastTimer, searchTimer;
  async function api(path, options = {}) {
    const response = await fetch(`/api/admin/${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    const data = await response.json().catch(() => ({ error: 'The server returned an unexpected response.' }));
    if (!response.ok) {
      if (response.status === 401 && path !== 'login') showLogin();
      throw new Error(data.error || 'Unable to complete the request.');
    }
    return data;
  }
  function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500); }
  function showLogin() { controller?.abort(); $('workspace').hidden = true; $('login').hidden = false; $('boot').hidden = true; $('editor').close(); $('delete-dialog').close(); $('email-dialog').close(); field($('login-form'), 'password').value = ''; }
  function urlState() {
    const params = new URLSearchParams(location.search);
    state.section = params.get('section') === 'subscribers' ? 'subscribers' : 'bookings';
    state.page = Math.max(1, Number(params.get('page')) || 1);
    state.pageSize = [10, 25, 50].includes(Number(params.get('pageSize'))) ? Number(params.get('pageSize')) : 10;
    for (const name of ['q', 'status', 'from', 'to', 'plan']) field($('filters'), name).value = params.get(name) || '';
    $('page-size').value = state.pageSize;
    $('sort').value = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
    return params;
  }
  function params() {
    const values = new URLSearchParams(new FormData($('filters')));
    for (const [key, value] of [...values]) if (!value || (state.section === 'subscribers' && key === 'plan')) values.delete(key);
    values.set('page', state.page); values.set('pageSize', state.pageSize); values.set('sort', $('sort').value);
    return values;
  }
  function remember() { const query = params(); query.set('section', state.section); history.replaceState(null, '', `${location.pathname}?${query}`); }
  function setupSection(status = '') {
    const booking = state.section === 'bookings';
    document.title = `${booking ? 'Bookings' : 'Subscribers'} | Campy Admin`;
    $('page-title').textContent = booking ? 'Bookings' : 'Subscribers';
    $('page-description').textContent = booking ? 'Manage demo requests and school conversations.' : 'Manage newsletter subscriptions and opt-out preferences.';
    $('add').innerHTML = `<span aria-hidden="true">＋</span> Add ${booking ? 'booking' : 'subscriber'}`;
    $('table-caption').textContent = booking ? 'Demo bookings, receipt times in UTC' : 'Subscribers, receipt times in UTC';
    $('plan-filter').hidden = !booking;
    field($('filters'), 'status').innerHTML = option('', 'All statuses') + state.config.statuses[state.section].map(s => option(s, labels[s])).join('');
    field($('filters'), 'status').value = status;
    document.querySelectorAll('[data-section]').forEach(button => { const active = button.dataset.section === state.section; button.classList.toggle('active', active); if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
    $('table-region').classList.toggle('subscribers', !booking);
    const headings = booking ? ['School', 'Contact', 'Plan', 'Status', 'Email delivery', 'Received (UTC)', 'Actions'] : ['Email', 'Status', 'Notes', 'Email delivery', 'Received (UTC)', 'Actions'];
    $('table-head').innerHTML = `<tr>${headings.map(text => `<th scope="col">${text}</th>`).join('')}</tr>`;
  }
  function render(data) {
    state.rows = data.rows; state.total = data.total; state.page = data.page;
    const stats = data.stats, total = Object.values(stats).reduce((a, b) => a + b, 0);
    const summary = state.section === 'bookings' ? [['Total bookings', total], ['New requests', stats.new || 0], ['Scheduled', stats.scheduled || 0], ['Completed', stats.completed || 0]] : [['Total subscribers', total], ['Active', stats.active || 0], ['Unsubscribed', stats.unsubscribed || 0]];
    $('stats').innerHTML = summary.map(([name, count]) => `<div class="stat"><p>${name}</p><strong>${count.toLocaleString('en-IN')}</strong></div>`).join('');
    const badge = row => `<span class="badge ${row.status}">${labels[row.status]}</span>`;
    const deliveryLabels = { not_requested: 'Not sent', pending: 'Queued', sending: 'Sending', sent: 'Sent', failed: 'Failed', skipped: 'Skipped' };
    const delivery = row => `<td><span class="badge ${row.email_status === 'sent' ? 'completed' : row.email_status === 'failed' ? 'cancelled' : ''}">${deliveryLabels[row.email_status] || 'Not sent'}</span>${row.email_error ? `<small>${escape(row.email_error)}</small>` : ''}${row.type === 'bookings' ? `<small>Team: ${deliveryLabels[row.notification_status] || 'Not sent'}${row.notification_error ? ` (${escape(row.notification_error)})` : ''}</small>` : ''}</td>`;
    const actions = row => `<td class="actions"><button data-edit="${escape(row.id)}" aria-label="Edit ${escape(row.email)}">Edit</button><button data-delete="${escape(row.id)}" aria-label="Delete ${escape(row.email)}">Delete</button>${row.status === 'unsubscribed' ? '' : `<button data-email="${escape(row.id)}" aria-label="Send confirmation to ${escape(row.email)}" ${!state.config.emailConfigured || row.email_status === 'sending' ? 'disabled' : ''}>${row.email_status === 'sent' ? 'Resend email' : 'Send email'}</button>`}</td>`;
    $('table-body').innerHTML = data.rows.map(row => state.section === 'bookings'
      ? `<tr><td class="school-cell"><strong>${escape(row.school)}</strong><small>${escape(row.size || 'Size not provided')}</small></td><td class="contact-cell"><strong>${escape(row.name)}</strong><small>${escape(row.email)}</small><small>${escape(row.phone)}</small></td><td class="plan-cell">${escape(row.plan || 'Not sure yet')}</td><td>${badge(row)}</td>${delivery(row)}<td>${date(row.received_at)}<small>${time(row.received_at)}</small></td>${actions(row)}</tr>`
      : `<tr><td class="contact-cell"><strong>${escape(row.email)}</strong></td><td>${badge(row)}</td><td class="school-cell">${escape(row.notes.length > 90 ? `${row.notes.slice(0, 90)}…` : row.notes || '—')}</td>${delivery(row)}<td>${date(row.received_at)}<small>${time(row.received_at)}</small></td>${actions(row)}</tr>`).join('');
    $('empty').hidden = data.rows.length > 0;
    $('empty').innerHTML = `<strong>No ${state.section} found</strong>${params().get('q') || params().get('status') || params().get('from') || params().get('to') || params().get('plan') ? 'Try changing or clearing your filters.' : `New ${state.section === 'bookings' ? 'demo requests' : 'subscriptions'} will appear here. You can also add one manually.`}`;
    $('result-summary').textContent = `${data.total.toLocaleString('en-IN')} matching ${state.section}`;
    const start = data.total ? (state.page - 1) * state.pageSize + 1 : 0, end = Math.min(state.page * state.pageSize, data.total);
    $('pagination-summary').textContent = `Showing ${start}–${end} of ${data.total}`;
    $('page-number').textContent = `${state.page} / ${Math.max(1, Math.ceil(data.total / state.pageSize))}`;
    $('previous').disabled = state.page === 1;
    $('next').disabled = state.page * state.pageSize >= data.total;
    remember();
  }
  async function load() {
    controller?.abort(); const current = new AbortController(); controller = current;
    state.loading = true; $('table-region').setAttribute('aria-busy', 'true');
    $('page-error').hidden = true; $('retry').hidden = true;
    $('previous').disabled = true; $('next').disabled = true;
    // Do not leave rows from a previous section/filter available while fetching.
    state.rows = []; $('table-body').replaceChildren(); $('empty').hidden = false; $('empty').textContent = 'Loading records…';
    try { render(await api(`${state.section}?${params()}`, { signal: current.signal })); }
    catch (error) { if (error.name === 'AbortError') return; $('page-error').textContent = error.message; $('page-error').hidden = false; $('retry').hidden = false; $('empty').textContent = 'Records could not be loaded.'; $('result-summary').textContent = ''; $('pagination-summary').textContent = ''; }
    finally { if (controller === current) { state.loading = false; $('table-region').setAttribute('aria-busy', 'false'); } }
  }
  async function enter() {
    state.config = await api('session');
    const query = urlState();
    field($('filters'), 'plan').innerHTML = option('', 'All plans') + state.config.plans.map(p => option(p)).join('');
    field($('filters'), 'plan').value = query.get('plan') || '';
    setupSection(query.get('status') || '');
    $('login').hidden = true; $('workspace').hidden = false; $('boot').hidden = true;
    await load();
  }
  function openEditor(row = null) {
    state.editing = row; const form = $('record-form'), booking = state.section === 'bookings'; form.reset();
    $('record-error').textContent = '';
    $('editor-title').textContent = `${row ? 'Edit' : 'Add'} ${booking ? 'booking' : 'subscriber'}`;
    $('record-meta').textContent = row ? `Received ${date(row.received_at)} at ${time(row.received_at)} UTC` : 'Add a record to your workspace.';
    const lists = { role: state.config.roles, size: ['', ...state.config.sizes], plan: ['', ...state.config.plans], status: state.config.statuses[state.section] };
    for (const [name, values] of Object.entries(lists)) field(form, name).innerHTML = values.map(v => option(v, name === 'status' ? labels[v] : v || 'Not specified')).join('');
    document.querySelectorAll('[data-booking]').forEach(label => { label.hidden = !booking; label.querySelectorAll('input,select,textarea').forEach(control => { control.disabled = !booking; control.required = booking && ['name', 'phone', 'school', 'role'].includes(control.name); }); });
    if (row) for (const name of ['email', 'name', 'phone', 'school', 'role', 'size', 'plan', 'message', 'status', 'notes']) field(form, name).value = row[name] || '';
    if (row?.scheduled_at) { const value = new Date(row.scheduled_at); field(form, 'scheduled_at').value = new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
    scheduledRequired(); $('editor').showModal();
  }
  function scheduledRequired() { field($('record-form'), 'scheduled_at').required = state.section === 'bookings' && field($('record-form'), 'status').value === 'scheduled'; }
  $('login-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = event.target.querySelector('button'); button.disabled = true; $('login-error').textContent = '';
    try { await api('login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.target))) }); field(event.target, 'password').value = ''; await enter(); }
    catch (error) { $('login-error').textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('logout').addEventListener('click', async () => { $('logout').disabled = true; try { await api('logout', { method: 'POST', body: '{}' }); showLogin(); } catch (error) { toast(error.message); } finally { $('logout').disabled = false; } });
  document.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => { clearTimeout(searchTimer); state.section = button.dataset.section; state.page = 1; $('filters').reset(); setupSection(); load(); }));
  $('filters').addEventListener('submit', event => { event.preventDefault(); clearTimeout(searchTimer); state.page = 1; load(); });
  $('filters').addEventListener('input', event => { if (event.target.name !== 'q') return; clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.page = 1; load(); }, 300); });
  $('filters').addEventListener('change', event => { if (event.target.name === 'q') return; clearTimeout(searchTimer); state.page = 1; load(); });
  $('clear').addEventListener('click', () => { clearTimeout(searchTimer); $('filters').reset(); state.page = 1; load(); });
  $('sort').addEventListener('change', () => { state.page = 1; load(); });
  $('page-size').addEventListener('change', () => { state.pageSize = Number($('page-size').value); state.page = 1; load(); });
  $('previous').addEventListener('click', () => { if (!state.loading && state.page > 1) { state.page--; load(); } });
  $('next').addEventListener('click', () => { if (!state.loading && state.page * state.pageSize < state.total) { state.page++; load(); } });
  $('retry').addEventListener('click', load);
  $('add').addEventListener('click', () => openEditor());
  field($('record-form'), 'status').addEventListener('change', scheduledRequired);
  $('table-body').addEventListener('click', event => {
    const edit = event.target.closest('[data-edit]'), remove = event.target.closest('[data-delete]'), email = event.target.closest('[data-email]');
    if (edit) { const row = state.rows.find(r => r.id === edit.dataset.edit); if (row) openEditor(row); }
    if (remove) { state.deleting = state.rows.find(r => r.id === remove.dataset.delete); if (!state.deleting) return; $('delete-description').textContent = state.deleting.school ? `${state.deleting.school} · ${state.deleting.email}` : state.deleting.email; $('delete-error').textContent = ''; $('delete-dialog').showModal(); }
    if (email) { state.mailing = state.rows.find(r => r.id === email.dataset.email); if (!state.mailing) return; $('email-description').textContent = `To: ${state.mailing.email}`; $('email-error').textContent = ''; $('email-dialog').showModal(); }
  });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  function pending(form, active) { form.querySelectorAll('button').forEach(button => { button.disabled = active; }); form.dataset.pending = String(active); }
  for (const id of ['editor', 'delete-dialog', 'email-dialog']) $(id).addEventListener('cancel', event => { if ($(id).querySelector('form').dataset.pending === 'true') event.preventDefault(); });
  $('email-verify').addEventListener('click', async () => {
    $('email-verify').disabled = true;
    try { const result = await api('email/verify', { method: 'POST', body: '{}' }); state.config.emailConfigured = result.configured; toast(result.verified ? 'Email connection verified: admin@nexzart.com' : result.error || 'Email connection could not be verified.'); await load(); }
    catch (error) { toast(error.message); } finally { $('email-verify').disabled = false; }
  });
  $('email-form').addEventListener('submit', async event => {
    event.preventDefault(); const form = event.target; pending(form, true); $('email-error').textContent = '';
    try { const result = await api(`${state.section}/${state.mailing.id}/email`, { method: 'POST', body: '{}' }); if (result.status !== 'sent') throw new Error('The email is queued or already being processed. Refresh the list shortly.'); $('email-dialog').close(); toast('Confirmation email accepted by the mail server.'); await load(); }
    catch (error) { $('email-error').textContent = error.message; } finally { pending(form, false); }
  });
  $('record-form').addEventListener('submit', async event => {
    event.preventDefault(); const form = event.target, data = Object.fromEntries(new FormData(form));
    $('record-error').textContent = ''; pending(form, true);
    try {
      data.scheduled_at = data.scheduled_at ? new Date(data.scheduled_at).toISOString() : '';
      await api(`${state.section}${state.editing ? `/${state.editing.id}` : ''}`, { method: state.editing ? 'PUT' : 'POST', body: JSON.stringify(data) });
      $('editor').close(); toast(state.editing ? 'Record updated.' : 'Record added.'); await load();
    } catch (error) { $('record-error').textContent = error.message; } finally { pending(form, false); }
  });
  $('delete-form').addEventListener('submit', async event => {
    event.preventDefault(); const form = event.target; pending(form, true); $('delete-error').textContent = '';
    try { await api(`${state.section}/${state.deleting.id}`, { method: 'DELETE' }); $('delete-dialog').close(); toast('Record deleted.'); await load(); }
    catch (error) { $('delete-error').textContent = error.message; } finally { pending(form, false); }
  });
  window.addEventListener('popstate', () => { const query = urlState(); setupSection(query.get('status') || ''); load(); });
  enter().catch(error => { showLogin(); if (error.message !== 'Sign in to continue.') $('login-error').textContent = error.message; });
})();
