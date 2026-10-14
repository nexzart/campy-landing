// One-time, idempotent copy from the old KV store to D1. Source KV is never modified.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const remote = process.argv.includes('--remote');
const source = process.env.LEGACY_KV_NAMESPACE_ID || 'e1e530336e1143d8bed1973647eb65f4';
const run = args => execFileSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const keys = JSON.parse(run(['kv', 'key', 'list', '--namespace-id', source, '--remote'])).filter(k => /^(demo|subscriber):/.test(k.name));
const quote = value => value == null ? 'NULL' : `'${String(value).replace(/\0/g, '').replace(/'/g, "''")}'`;
const columns = ['id', 'type', 'email', 'name', 'phone', 'school', 'role', 'size', 'plan', 'message', 'status', 'notes', 'scheduled_at', 'received_at', 'updated_at', 'country'];
const statements = [];
for (const { name } of keys) {
  const row = JSON.parse(run(['kv', 'key', 'get', name, '--namespace-id', source, '--remote', '--text']));
  if (!row.email || !Number.isFinite(Date.parse(row.receivedAt))) throw new Error('Invalid legacy record; import stopped without changing the source.');
  const booking = name.startsWith('demo:');
  const values = [createHash('sha256').update(name).digest('hex'), booking ? 'bookings' : 'subscribers', row.email.toLowerCase(), ...['name', 'phone', 'school', 'role', 'size', 'plan', 'message'].map(k => row[k] || ''), booking ? 'new' : 'active', '', null, new Date(row.receivedAt).toISOString(), new Date(row.receivedAt).toISOString(), row.country || null];
  statements.push(`INSERT INTO leads (${columns.join(',')}) VALUES (${values.map(quote).join(',')}) ON CONFLICT DO NOTHING;`);
}
if (!statements.length) { console.log('No legacy records found.'); process.exit(0); }
const temp = path.join(root, '.wrangler', 'legacy-import.sql');
fs.mkdirSync(path.dirname(temp), { recursive: true });
try {
  fs.writeFileSync(temp, statements.join('\n'));
  run(['d1', 'execute', 'DB', remote ? '--remote' : '--local', '--file', temp, '--yes']);
  console.log(`Copied ${statements.length} legacy records to ${remote ? 'remote' : 'local'} D1 (existing duplicates skipped). Source KV retained.`);
} finally { fs.rmSync(temp, { force: true }); }
