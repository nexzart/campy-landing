import test from 'node:test';
import assert from 'node:assert/strict';
import { createRelay } from './server.mjs';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('relay authenticates, fixes sender, and reports SMTP rejection', async () => {
  const sent = [];
  const secret = 'a'.repeat(64);
  const server = createRelay({ secret, transport: { async sendMail(mail) {
    sent.push(mail);
    return mail.to === 'fail@example.com' ? { accepted: [], rejected: [mail.to] } : { accepted: [mail.to] };
  } } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/send`;
  const body = { to: 'visitor@example.com', replyTo: 'admin@nexzart.com', subject: 'Thanks', html: '<p>Thanks</p>', text: 'Thanks', logo: 'aGVsbG8=' };
  const post = (value, token = secret) => fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(value) });
  try {
    assert.equal((await post(body, 'wrong')).status, 401);
    assert.equal(sent.length, 0);
    assert.equal((await post({ ...body, to: 'a@example.com,b@example.com' })).status, 400);
    assert.equal((await post(body)).status, 200);
    assert.equal(sent[0].from.address, 'admin@nexzart.com');
    assert.equal(sent[0].attachments[0].cid, 'campyLogo');
    assert.equal((await post({ ...body, to: 'fail@example.com' })).status, 502);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('Apps Script saves before mail, escapes formulas, and notifies admin after visitor failure', () => {
  const rows = [];
  const calls = [];
  const sheet = {
    getLastRow: () => rows.length,
    appendRow: row => rows.push(row),
    getRange: (row, col) => ({ setValues: values => rows[row - 1].splice(col - 1, values[0].length, ...values[0]) }),
  };
  const props = { SHARED_SECRET: 'worker-secret', SPREADSHEET_ID: 'sheet-id', SMTP_RELAY_URL: 'https://relay.example/send', SMTP_RELAY_SECRET: 'relay-secret' };
  const context = vm.createContext({
    console: { error() {} }, LOGO_PNG_BASE64: 'aGVsbG8=',
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => props[key] }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }) },
    Utilities: { formatDate: () => '14 Oct 2026' },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
    UrlFetchApp: { fetch(url, opts) {
      assert.equal(rows.length, 2);
      calls.push(JSON.parse(opts.payload));
      return { getResponseCode: () => calls.length === 1 ? 502 : 200, getContentText: () => JSON.stringify({ ok: calls.length !== 1 }) };
    } },
  });
  vm.runInContext(readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), context);
  const submit = payload => context.doPost({ postData: { contents: JSON.stringify(payload) } });
  assert.equal(submit({ secret: 'bad' }).ok, false);
  assert.equal(rows.length, 0);
  const result = submit({ secret: 'worker-secret', type: 'demo', lead: { name: '=1+1', email: 'visitor@example.com', school: 'School', phone: '+919876543210', message: '<script>test</script>' }, meta: { country: 'IN' } });
  assert.equal(result.saved, true);
  assert.equal(result.ok, false);
  assert.equal(rows[1][2], "'=1+1");
  assert.equal(rows[1][14], 'failed');
  assert.equal(rows[1][15], 'sent');
  assert.equal(calls[1].to, 'nexzart.main@gmail.com');
  assert.equal(calls[1].replyTo, 'visitor@example.com');
  assert.ok(calls[1].html.includes('&lt;script&gt;'));
});
