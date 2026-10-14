import nodemailer from 'nodemailer';
import { Buffer } from 'node:buffer';
import { connect as tlsConnect } from 'node:tls';
import { connect as tcpConnect } from 'node:net';
import { FROM, confirmationEmail, teamNotificationEmail } from './email-template.js';

export function smtpConfigured(env) { return env.EMAIL_DELIVERY_ENABLED !== 'false' && Boolean(env.SMTP_PASSWORD); }
// Workers sockets resolve hostnames themselves. Bypass Nodemailer's Node DNS and
// multi-address connection logic, while retaining Nodemailer for SMTP and MIME.
export function smtpSocket(options, callback) {
  let socket, settled = false;
  const timeout = setTimeout(() => finish(Object.assign(new Error('SMTP connection timed out'), { code: 'ETIMEDOUT' })), options.connectionTimeout || 10000);
  function finish(error) {
    if (settled) return;
    settled = true; clearTimeout(timeout);
    if (error) { socket?.destroy(); callback(error); }
    else callback(null, { connection: socket, secured: options.secure });
  }
  try {
    const settings = { host: options.host, port: options.port };
    socket = options.secure ? tlsConnect({ ...settings, servername: options.host, rejectUnauthorized: true }) : tcpConnect(settings);
    socket.once(options.secure ? 'secureConnect' : 'connect', () => finish());
    socket.once('error', finish);
  } catch (error) { finish(error); }
}
export function smtpOptions(env) {
  const port = Number(env.SMTP_PORT || 465);
  if (![465, 587].includes(port)) throw new Error('SMTP_PORT must be 465 or 587.');
  return {
    host: env.SMTP_HOST || 'smtpout.secureserver.net', port, secure: port === 465,
    requireTLS: port === 587,
    auth: { user: FROM.address, pass: env.SMTP_PASSWORD },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    getSocket: smtpSocket,
    disableFileAccess: true, disableUrlAccess: true,
  };
}
export async function verifySmtp(env) {
  if (!smtpConfigured(env)) return { configured: false, verified: false, error: 'Set SMTP_PASSWORD as a Worker secret to enable email delivery.' };
  const transport = nodemailer.createTransport(smtpOptions(env));
  try { await transport.verify(); return { configured: true, verified: true, from: FROM.address }; }
  catch (error) { console.error('SMTP verification failed', { code: safeCode(error) }); return { configured: true, verified: false, error: safeCode(error) }; }
  finally { transport.close(); }
}
function safeCode(error) { return /^[A-Z0-9_]{1,40}$/.test(error?.code || '') ? error.code : 'EMAIL_DELIVERY_ERROR'; }

export const deliverConfirmation = (env, id, options) => deliverEmail(env, id, 'email', options);
export const deliverTeamNotification = (env, id, options) => deliverEmail(env, id, 'notification', options);

async function deliverEmail(env, id, kind, { createTransport = nodemailer.createTransport } = {}) {
  if (!smtpConfigured(env)) return { status: 'pending', configured: false };
  const now = Math.floor(Date.now() / 1000);
  // A single atomic claim prevents form completion, admin retry, and cron from sending together.
  const lead = await env.DB.prepare(`UPDATE leads SET ${kind}_status = 'sending', ${kind}_lock_until = ?, ${kind}_attempts = ${kind}_attempts + 1
    WHERE id = ? AND ${kind}_attempts < 3 AND ${kind}_next_attempt_at <= ? AND
    (${kind}_status = 'pending' OR (${kind}_status = 'failed') OR (${kind}_status = 'sending' AND ${kind}_lock_until < ?)) RETURNING *`).bind(now + 180, id, now, now).first();
  if (!lead) return { status: 'not_claimed' };
  if (kind === 'email' && lead.type === 'subscribers' && lead.status === 'unsubscribed') {
    await env.DB.prepare(`UPDATE leads SET ${kind}_status = 'skipped', ${kind}_lock_until = 0 WHERE id = ?`).bind(id).run();
    return { status: 'skipped' };
  }
  let transport;
  try {
    const logoResponse = await env.ASSETS.fetch(new Request('https://campy.nexzart.com/asset/campy-logo.png'));
    if (!logoResponse.ok) throw Object.assign(new Error('Logo unavailable'), { code: 'LOGO_UNAVAILABLE' });
    const logo = Buffer.from(await logoResponse.arrayBuffer());
    transport = createTransport(smtpOptions(env));
    const info = await transport.sendMail({
      ...(kind === 'notification' ? teamNotificationEmail(lead) : confirmationEmail(lead)), from: FROM,
      messageId: `<campy-${kind === 'email' ? 'confirmation' : 'team-notification'}-${lead.id}@nexzart.com>`,
      attachments: [{ filename: 'campy-logo.png', content: logo, contentType: 'image/png', cid: 'campyLogo' }],
      disableFileAccess: true, disableUrlAccess: true,
    });
    if (!info.accepted?.length || info.rejected?.length) throw Object.assign(new Error('Recipient rejected'), { code: 'RECIPIENT_REJECTED' });
    await env.DB.prepare(`UPDATE leads SET ${kind}_status = 'sent', ${kind}_sent_at = ?, ${kind}_error = NULL, ${kind}_lock_until = 0 WHERE id = ?`).bind(new Date().toISOString(), id).run();
    return { status: 'sent' };
  } catch (error) {
    const code = safeCode(error);
    await env.DB.prepare(`UPDATE leads SET ${kind}_status = 'failed', ${kind}_error = ?, ${kind}_lock_until = 0, ${kind}_next_attempt_at = ? WHERE id = ?`).bind(code, now + 300 * lead[`${kind}_attempts`], id).run();
    console.error('Email delivery failed', { leadId: id, kind, code });
    return { status: 'failed', error: code };
  } finally { transport?.close(); }
}
export async function drainConfirmationEmails(env) {
  if (!smtpConfigured(env)) return;
  const now = Math.floor(Date.now() / 1000);
  for (const kind of ['email', 'notification']) {
    await env.DB.prepare(`UPDATE leads SET ${kind}_status = 'failed', ${kind}_error = 'SEND_INTERRUPTED', ${kind}_lock_until = 0 WHERE ${kind}_status = 'sending' AND ${kind}_attempts >= 3 AND ${kind}_lock_until < ?`).bind(now).run();
    const pending = await env.DB.prepare(`SELECT id FROM leads WHERE ${kind}_attempts < 3 AND ${kind}_next_attempt_at <= ? AND
      (${kind}_status IN ('pending','failed') OR (${kind}_status = 'sending' AND ${kind}_lock_until < ?)) ORDER BY received_at LIMIT 10`).bind(now, now).all();
    for (const row of pending.results) await deliverEmail(env, row.id, kind);
  }
}
