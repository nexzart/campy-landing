import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import nodemailer from 'nodemailer';

const EMAIL = /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/;
const MAX_BYTES = 256 * 1024;

export function createRelay({ secret, transport }) {
  if (!secret || secret.length < 32) throw new Error('SMTP_RELAY_SECRET must have at least 32 characters');
  return http.createServer(async (req, res) => {
    const reply = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    };
    if (req.url !== '/send' || req.method !== 'POST') return reply(404, { ok: false });
    const actual = Buffer.from(req.headers.authorization || '');
    const expected = Buffer.from(`Bearer ${secret}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return reply(401, { ok: false });
    let body;
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BYTES) { reply(413, { ok: false }); return; }
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || typeof body !== 'object') throw new Error('Invalid body');
      for (const field of ['to', 'replyTo']) {
        if (typeof body[field] !== 'string' || body[field].length > 200 || !EMAIL.test(body[field])) throw new Error('Invalid email');
      }
      if (typeof body.subject !== 'string' || body.subject.length > 300 || /[\r\n]/.test(body.subject)) throw new Error('Invalid subject');
      for (const field of ['html', 'text']) {
        if (typeof body[field] !== 'string' || body[field].length > 100000) throw new Error('Invalid content');
      }
      if (typeof body.logo !== 'string' || body.logo.length > 50000 || !/^[A-Za-z0-9+/=\r\n]+$/.test(body.logo)) throw new Error('Invalid logo');
    } catch {
      return reply(400, { ok: false, error: 'Invalid request' });
    }
    try {
      const info = await transport.sendMail({
        from: { name: 'Campy by Nexzart', address: 'admin@nexzart.com' },
        to: body.to, replyTo: body.replyTo, subject: body.subject, html: body.html, text: body.text,
        attachments: [{ filename: 'campy-logo.png', content: Buffer.from(body.logo, 'base64'),
          contentType: 'image/png', cid: 'campyLogo' }],
        disableFileAccess: true, disableUrlAccess: true,
      });
      if (!info.accepted?.length || info.rejected?.length) throw new Error('Recipient rejected');
      reply(200, { ok: true });
    } catch (error) {
      console.error('SMTP send failed', error.code || error.name);
      reply(502, { ok: false, error: 'Email could not be sent' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.SMTP_PASSWORD) throw new Error('SMTP_PASSWORD is required');
  const transport = nodemailer.createTransport({
    host: 'smtpout.secureserver.net', port: 465, secure: true,
    auth: { user: 'admin@nexzart.com', pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  const server = createRelay({ secret: process.env.SMTP_RELAY_SECRET, transport });
  server.requestTimeout = 30000;
  server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('SMTP relay listening'));
}
