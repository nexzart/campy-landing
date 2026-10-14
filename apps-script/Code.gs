// Campy mailer – Google Apps Script web app.
//
// The Cloudflare Worker (worker/index.js) posts each validated form submission here as JSON:
//   { secret, type: 'demo' | 'subscribe', lead: {...}, meta: { receivedAt, country } }
// and this script sends, from the account it is deployed under (admin@nexzart.com):
//   1. a branded confirmation to the visitor, and
//   2. a notification to the team (CONFIG.notify), with Reply-To set to the visitor.
//
// The project has two files: this one and Logo.gs (the logo, sent as an inline image).
//
// Setup (see README "Form emails"):
//   - Deploy while signed in as admin@nexzart.com: Deploy > New deployment > Web app,
//     Execute as "Me", Who has access "Anyone".
//   - Project Settings > Script properties: add SHARED_SECRET with the same value as the
//     Worker's APPS_SCRIPT_SECRET.

const CONFIG = {
  fromAddress: 'admin@nexzart.com',
  fromName: 'Campy by Nexzart',
  // Visitors' replies go here.
  teamInbox: 'admin@nexzart.com',
  // Every form submission is reported to these addresses.
  notify: ['nexzart.main@gmail.com', 'admin@nexzart.com'],
  notifyTeamOnSubscribe: true,
  site: 'https://campy.nexzart.com',
  company: 'https://nexzart.com',
  phone: '+91 74185 94229',
  address: 'Chennai, Tamil Nadu, India',
};

// Brand colours from tailwind.config.js. Email clients handle rgba() badly, so the
// opacity tints the site uses (text-primary/70 and so on) are pre-mixed on white.
const C = {
  primary: '#0A204E',
  secondary: '#7EBB02',
  text70: '#546383',
  text60: '#6C7995',
  border: '#E7E9ED',
  tint: '#F8F8FA',
  page: '#F3F4F7',
};
const FONT = "Poppins, 'Segoe UI', Helvetica, Arial, sans-serif";

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
    if (!secret || body.secret !== secret) return json({ ok: false, error: 'unauthorised' });

    const lead = body.lead || {};
    const meta = body.meta || {};
    if (body.type === 'demo') sendDemo(lead, meta);
    else if (body.type === 'subscribe') sendSubscribe(lead, meta);
    else return json({ ok: false, error: 'unknown type' });

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: String(err) });
  }
}

// Open the web app URL in a browser to check the deployment is live.
function doGet() {
  return json({ ok: true, service: 'campy-mailer' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Demo requests

function sendDemo(lead, meta) {
  const name = clean(lead.name);
  const school = clean(lead.school);
  const rows = [
    ['Name', name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['School', school],
    ['Role', lead.role],
    ['Students', lead.size],
    ['Plan', lead.plan || 'Not sure yet'],
    ['What you’d like to see', lead.message],
  ];

  const visitorHtml = layout({
    preheader: `Thanks for your interest in Campy. Our team will contact you within 24 hours.`,
    eyebrow: 'Demo request received',
    body: `
      ${p(`Dear ${esc(name)},`)}
      ${p(`Thank you for your interest in Campy. We have received your request for a demo for <strong style="color:${C.primary};">${esc(school)}</strong>.`)}
      ${callout(`A member of our team will contact you <strong>within 24 hours</strong> on <strong>${esc(lead.phone)}</strong> or at this email address to schedule a 30-minute walkthrough at a time that suits you.`)}
      ${h2('What happens next')}
      ${steps([
        ['We get in touch', 'To find a time that suits you and anyone else who should join.'],
        ['We prepare your school', 'A sample class list and timetable are enough to set up a realistic demo.'],
        ['You see all four portals', 'Office, teacher and parent views, plus answers to your billing and data questions.'],
      ])}
      ${h2('Your request')}
      ${detailTable(rows)}
      ${p(`If anything above needs correcting, or you would like to add a colleague to the call, simply reply to this email or call us on <a href="${telHref(CONFIG.phone)}" style="color:${C.primary};font-weight:600;text-decoration:none;white-space:nowrap;">${esc(CONFIG.phone)}</a>.`, 'margin-top:24px;')}
      ${button('Explore Campy features', CONFIG.site + '/features', 'outline')}
      ${signoff()}`,
  });

  sendMail(lead.email, `Your Campy demo request – we’ll contact you within 24 hours`, visitorHtml, {
    replyTo: CONFIG.teamInbox,
  });

  const teamHtml = layout({
    preheader: `${name}, ${school}. Contact within 24 hours.`,
    eyebrow: 'New demo request',
    body: `
      ${p(`A new demo request has come in from the website. The visitor has been told we will contact them <strong>within 24 hours</strong>.`)}
      ${detailTable(rows.concat([['Received', formatTime(meta.receivedAt)], ['Country', meta.country]]))}
      ${button('Call ' + clean(lead.phone), telHref(lead.phone), 'primary')}
      ${p(`Reply to this email to answer ${esc(name)} directly.`, `margin-top:16px;color:${C.text60};font-size:13px;`)}`,
    internal: true,
  });

  sendMail(CONFIG.notify.join(','), `New demo request: ${school} (${name})`, teamHtml, {
    replyTo: lead.email,
  });
}

// ---------------------------------------------------------------------------
// Product update sign-ups

function sendSubscribe(lead, meta) {
  const visitorHtml = layout({
    preheader: 'You’re subscribed to Campy product updates.',
    eyebrow: 'Subscription confirmed',
    body: `
      ${p('Dear Sir/Madam,')}
      ${p(`Thank you for subscribing to Campy product updates. You will receive news about new modules and our release notes at <strong style="color:${C.primary};">${esc(lead.email)}</strong>, about once a month.`)}
      ${callout(`Would you like to see Campy with your own school’s classes and timetable? Book a demo, reply to this email or call us on <strong style="white-space:nowrap;">${esc(CONFIG.phone)}</strong>, and our team will contact you <strong>within 24 hours</strong>.`)}
      ${button('Book a demo', CONFIG.site + '/contact', 'primary')}
      ${p(`To stop receiving updates at any time, reply to this email with “Unsubscribe”.`, `margin-top:24px;color:${C.text60};font-size:13px;`)}
      ${signoff()}`,
  });

  sendMail(lead.email, 'Welcome to Campy product updates', visitorHtml, { replyTo: CONFIG.teamInbox });

  if (!CONFIG.notifyTeamOnSubscribe) return;
  const teamHtml = layout({
    preheader: `${lead.email} subscribed to product updates.`,
    eyebrow: 'New subscriber',
    body: `
      ${p('Someone has subscribed to Campy product updates from the website footer.')}
      ${detailTable([['Email', lead.email], ['Received', formatTime(meta.receivedAt)], ['Country', meta.country]])}`,
    internal: true,
  });
  sendMail(CONFIG.notify.join(','), `New subscriber: ${clean(lead.email)}`, teamHtml, { replyTo: lead.email });
}

// ---------------------------------------------------------------------------
// Sending

function sendMail(to, subject, html, opts) {
  const options = {
    htmlBody: html,
    name: CONFIG.fromName,
    replyTo: opts.replyTo,
    inlineImages: { campyLogo: Utilities.newBlob(Utilities.base64Decode(LOGO_PNG_BASE64), 'image/png', 'campy-logo.png') },
  };
  // When deployed from the admin@nexzart.com account this is already the sender. From any
  // other account, admin@nexzart.com must be a verified "Send mail as" alias in Gmail.
  const me = Session.getEffectiveUser().getEmail();
  if (me && me.toLowerCase() !== CONFIG.fromAddress.toLowerCase()) options.from = CONFIG.fromAddress;
  GmailApp.sendEmail(to, subject, toPlainText(html), options);
}

// ---------------------------------------------------------------------------
// Email building blocks. Table layout and inline styles, so Gmail, Outlook and
// Apple Mail all render it the same way.

function layout({ preheader, eyebrow, body, internal }) {
  const year = new Date().getFullYear();
  const contact = [
    `<a href="mailto:${CONFIG.fromAddress}" style="color:#FFFFFF;text-decoration:underline;text-decoration-color:${C.secondary};">${CONFIG.fromAddress}</a>`,
    CONFIG.phone ? `<a href="${telHref(CONFIG.phone)}" style="color:#FFFFFF;text-decoration:none;white-space:nowrap;">${esc(CONFIG.phone)}</a>` : '',
    `<a href="${CONFIG.site}" style="color:#FFFFFF;text-decoration:underline;text-decoration-color:${C.secondary};">campy.nexzart.com</a>`,
  ].filter(Boolean).join('&nbsp;&nbsp;·&nbsp;&nbsp;');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<title>Campy</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
    <tr><td style="background:${C.primary};padding:28px 32px;">
      <a href="${CONFIG.site}" style="text-decoration:none;">
        <img src="cid:campyLogo" width="124" height="40" alt="Campy" style="display:block;border:0;height:40px;width:124px;color:#FFFFFF;font-family:${FONT};font-size:24px;font-weight:700;">
      </a>
    </td></tr>
    <tr><td style="background:${C.secondary};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
    <tr><td style="padding:32px 32px 8px;font-family:${FONT};color:${C.primary};">
      <p style="margin:0 0 20px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.primary};">
        <span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${C.secondary};margin-right:8px;vertical-align:middle;"></span>${esc(eyebrow)}
      </p>
      ${body}
    </td></tr>
    <tr><td style="padding:24px 32px 32px;"></td></tr>
    <tr><td style="background:${C.primary};padding:24px 32px;font-family:${FONT};font-size:13px;line-height:1.7;color:#C5CBD6;">
      <p style="margin:0 0 6px;color:#FFFFFF;font-weight:600;">Campy · School management software by Nexzart</p>
      <p style="margin:0 0 6px;">${contact}</p>
      <p style="margin:0;">${esc(CONFIG.address)}</p>
      ${internal ? '' : `<p style="margin:14px 0 0;font-size:12px;color:#9DA6B8;">You received this email because this address was entered on <a href="${CONFIG.site}" style="color:#9DA6B8;">campy.nexzart.com</a>. See our <a href="${CONFIG.site}/privacy" style="color:#9DA6B8;">privacy policy</a>.</p>`}
      <p style="margin:14px 0 0;font-size:12px;color:#9DA6B8;">&copy; ${year} Campy. A product of <a href="${CONFIG.company}" style="color:#FFFFFF;text-decoration:underline;text-decoration-color:${C.secondary};">Nexzart</a>.</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function p(html, style) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${C.text70};${style || ''}">${html}</p>`;
}

function h2(text) {
  return `<h2 style="margin:28px 0 14px;font-family:${FONT};font-size:16px;font-weight:600;color:${C.primary};">${esc(text)}</h2>`;
}

function callout(html) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px;">
  <tr><td style="border-left:4px solid ${C.secondary};background:${C.tint};border-radius:0 10px 10px 0;padding:16px 18px;font-family:${FONT};font-size:15px;line-height:1.7;color:${C.primary};">${html}</td></tr>
</table>`;
}

function steps(items) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${items.map(([title, text], i) => {
    const last = i === items.length - 1;
    const badge = last
      ? `background:${C.secondary};border:1px solid ${C.secondary};`
      : `background:#FFFFFF;border:1px solid #CED2DB;`;
    return `  <tr>
    <td width="44" valign="top" style="padding:0 0 16px;">
      <div style="${badge}width:32px;height:32px;line-height:32px;border-radius:16px;text-align:center;font-family:${FONT};font-size:13px;font-weight:600;color:${C.primary};">${i + 1}</div>
    </td>
    <td valign="top" style="padding:4px 0 16px;font-family:${FONT};">
      <p style="margin:0;font-size:15px;font-weight:600;color:${C.primary};">${esc(title)}</p>
      <p style="margin:2px 0 0;font-size:14px;line-height:1.6;color:${C.text70};">${esc(text)}</p>
    </td>
  </tr>`;
  }).join('\n')}
</table>`;
}

function detailTable(rows) {
  const filled = rows.filter(([, value]) => clean(value));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.border};border-radius:12px;border-collapse:separate;overflow:hidden;">
${filled.map(([label, value], i) => `  <tr>
    <td width="38%" valign="top" style="padding:12px 16px;${i ? `border-top:1px solid ${C.border};` : ''}background:${C.tint};font-family:${FONT};font-size:13px;font-weight:600;color:${C.primary};">${esc(label)}</td>
    <td valign="top" style="padding:12px 16px;${i ? `border-top:1px solid ${C.border};` : ''}font-family:${FONT};font-size:14px;line-height:1.6;color:${C.text70};white-space:pre-wrap;">${esc(value)}</td>
  </tr>`).join('\n')}
</table>`;
}

function button(label, href, variant) {
  const style = variant === 'outline'
    ? `background:#FFFFFF;color:${C.primary};border:1px solid #CED2DB;`
    : `background:${C.primary};color:#FFFFFF;border:1px solid ${C.primary};`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;">
  <tr><td style="border-radius:10px;${style}">
    <a href="${href}" style="display:inline-block;padding:12px 20px;font-family:${FONT};font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;${style}">${esc(label)}</a>
  </td></tr>
</table>`;
}

function signoff() {
  return `<p style="margin:32px 0 0;font-size:15px;line-height:1.7;color:${C.text70};">Warm regards,</p>
<p style="margin:4px 0 0;font-size:15px;line-height:1.5;font-weight:600;color:${C.primary};">Team Campy</p>
<p style="margin:0;font-size:14px;line-height:1.5;color:${C.text60};">Nexzart · <a href="mailto:${CONFIG.fromAddress}" style="color:${C.primary};text-decoration:underline;text-decoration-color:${C.secondary};">${CONFIG.fromAddress}</a>${CONFIG.phone ? ` · <a href="${telHref(CONFIG.phone)}" style="color:${C.primary};text-decoration:none;white-space:nowrap;">${esc(CONFIG.phone)}</a>` : ''}</p>`;
}

// ---------------------------------------------------------------------------
// Helpers

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function esc(value) {
  return clean(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function telHref(phone) {
  return 'tel:' + clean(phone).replace(/[^\d+]/g, '');
}

function formatTime(iso) {
  const date = iso ? new Date(iso) : new Date();
  return Utilities.formatDate(date, 'Asia/Kolkata', "d MMM yyyy, h:mm a 'IST'");
}

// Plain-text part for clients that don't show HTML (and for spam filters).
function toPlainText(html) {
  return html
    .replace(/<div style="display:none[\s\S]*?<\/div>/, '')
    .replace(/<(style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, text) => {
      const label = text.replace(/<[^>]+>/g, '').trim();
      if (!label) return '';
      return /^(mailto|tel):/.test(href) || href === label ? label : `${label} (${href})`;
    })
    .replace(/<\/div>\s*<\/td>\s*<td[^>]*>\s*/gi, '. ')
    .replace(/<\/td>\s*<td[^>]*>\s*/gi, ': ')
    .replace(/<\/(p|h2|tr|table)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&copy;/g, '©')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .split('\n').map((line) => line.trim()).join('\n')
    .trim();
}

// Run from the editor (select testSendDemo > Run) to preview both demo emails in your own inbox.
function testSendDemo() {
  sendDemo({
    name: 'Priya Raman', email: Session.getEffectiveUser().getEmail(), phone: '+91 98400 12345',
    school: 'Sunrise Public School', role: 'Principal', size: '300 to 1,000', plan: 'Professional ERP',
    message: 'Online fee collection with our Razorpay account, and payroll for 80 staff.',
  }, { receivedAt: new Date().toISOString(), country: 'IN' });
}

function testSendSubscribe() {
  sendSubscribe({ email: Session.getEffectiveUser().getEmail() }, { receivedAt: new Date().toISOString(), country: 'IN' });
}
