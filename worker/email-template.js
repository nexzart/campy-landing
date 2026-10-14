export const FROM = { name: 'Campy by Nexzart', address: 'admin@nexzart.com' };
export const TEAM_INBOX = 'nexzart.main@gmail.com';
const SITE = 'https://campy.nexzart.com';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function layout({ preheader, heading, greeting, intro, content, buttonText, buttonUrl, closing, footerNote }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#0A204E;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6fa;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
<tr><td style="padding:30px 32px 24px;border-bottom:4px solid #7EBB02;"><a href="${SITE}" style="text-decoration:none;"><img src="cid:campyLogo" width="160" alt="Campy by Nexzart" style="display:block;width:160px;max-width:100%;height:auto;border:0;"></a></td></tr>
<tr><td style="padding:32px;"><h1 style="margin:0 0 24px;font-size:28px;line-height:1.25;font-weight:700;color:#0A204E;">${esc(heading)}</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.7;">${esc(greeting)}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#435574;">${intro}</p>
${content}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0;"><tr><td bgcolor="#0A204E" style="border-radius:6px;mso-padding-alt:14px 22px;"><a href="${buttonUrl}" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:700;">${esc(buttonText)} &rarr;</a></td></tr></table>
<p style="margin:0 0 22px;font-size:14px;line-height:1.8;color:#435574;">${closing}</p>
<p style="margin:0;font-size:15px;line-height:1.7;">Warm regards,<br><strong>The Campy team</strong><br><span style="color:#65748b;font-size:13px;">School management, made simple.</span></p>
</td></tr>
<tr><td style="padding:22px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.8;color:#65748b;">
<strong style="color:#0A204E;">Campy by Nexzart</strong><br><a href="${SITE}" style="color:#0A204E;text-decoration:underline;">Visit Campy</a> &nbsp;&middot;&nbsp; <a href="mailto:admin@nexzart.com" style="color:#0A204E;text-decoration:underline;">admin@nexzart.com</a><br>
${esc(footerNote || 'You received this email because a request was made using your email address on the Campy website. If this wasn’t you, reply and let us know.')}
</td></tr></table></td></tr></table></body></html>`;
}
export function teamNotificationEmail(lead) {
  const received = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(lead.received_at));
  const details = [['Name', lead.name], ['Email', lead.email], ['Phone', lead.phone], ['School', lead.school], ['Role', lead.role], ['School size', lead.size || 'Not specified'], ['Interested plan', lead.plan || 'Not sure yet'], ['Received (IST)', received]];
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">${details.map(([label, value]) => `<tr><td width="34%" style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#65748b;font-size:13px;vertical-align:top;">${label}</td><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;line-height:1.6;word-break:break-word;color:#0A204E;">${esc(value)}</td></tr>`).join('')}</table>`;
  const message = lead.message ? `<div style="margin-top:18px;padding:18px;background:#f4f8ed;border-left:4px solid #7EBB02;"><p style="margin:0 0 8px;font-size:13px;font-weight:700;">Visitor’s message</p><p style="margin:0;font-size:14px;line-height:1.8;color:#435574;">${esc(lead.message).replace(/\r?\n/g, '<br>')}</p></div>` : '';
  const adminUrl = `${SITE}/admin/?section=bookings&q=${encodeURIComponent(lead.email)}`;
  return {
    to: TEAM_INBOX, replyTo: { name: lead.name, address: lead.email },
    subject: `New Campy enquiry — ${String(lead.school).replace(/[\r\n]+/g, ' ')}`,
    html: layout({ preheader: 'A new contact/demo request has arrived on the Campy website.', heading: 'A new school has reached out.', greeting: 'Hi Nexzart team,',
      intro: `<strong style="color:#0A204E;">${esc(lead.name)}</strong> from <strong style="color:#0A204E;">${esc(lead.school)}</strong> has submitted a contact/demo request. Here are the details to help you follow up.`,
      content: table + message, buttonText: 'View enquiry in admin', buttonUrl: adminUrl,
      closing: 'Reply to this email to contact the visitor directly, or open the admin panel to update the enquiry’s status and notes.',
      footerNote: 'This team notification was sent because a new enquiry was received on the Campy website.' }),
    text: `Hi Nexzart team,\n\nA new contact/demo request has arrived on the Campy website.\n\n${details.map(([label, value]) => `${label}: ${value}`).join('\n')}${lead.message ? `\n\nVisitor’s message:\n${lead.message}` : ''}\n\nView enquiry in admin: ${adminUrl}\n\nReply to this email to contact the visitor directly.\n\nThe Campy team\nadmin@nexzart.com`,
  };
}
export function confirmationEmail(lead) {
  const booking = lead.type === 'bookings';
  const first = (lead.name || '').trim().split(/\s+/)[0] || 'there';
  if (!booking) {
    const subject = 'Welcome to Campy — you’re subscribed!';
    return {
      to: lead.email, subject, replyTo: FROM.address,
      html: layout({ preheader: 'Thanks for joining Campy. School management ideas and product updates are on their way.', heading: 'Welcome to the Campy community.', greeting: 'Hi there,',
        intro: 'Thank you for subscribing to <strong style="color:#0A204E;">Campy</strong>. We’re happy to have you with us.',
        content: '<div style="padding:20px 22px;background:#f4f8ed;border-left:4px solid #7EBB02;"><p style="margin:0 0 10px;font-weight:700;font-size:15px;">A little less paperwork. A lot more possibility.</p><p style="margin:0;font-size:14px;line-height:1.8;color:#435574;">Look forward to product news, practical school management ideas, and updates to our Tools for educators.</p></div>',
        buttonText: 'Explore Campy', buttonUrl: `${SITE}/features`, closing: 'Have a question? Reply to this email — we’re here to help. To stop receiving product updates, reply with “unsubscribe”.' }),
      text: `Hi there,\n\nThank you for subscribing to Campy. We’re happy to have you with us.\n\nLook forward to product news, practical school management ideas, and updates to our Tools for educators.\n\nExplore Campy: ${SITE}/features\n\nHave a question? Reply to this email. To stop receiving product updates, reply with "unsubscribe".\n\nWarm regards,\nThe Campy team\nSchool management, made simple.\nadmin@nexzart.com\n\nYou received this email because a subscription request was made using your email address on the Campy website. If this wasn’t you, reply and let us know.`,
    };
  }
  const details = [['School', lead.school], ['Name', lead.name], ['Email', lead.email], ['Phone', lead.phone], ['Role', lead.role], ['School size', lead.size || 'Not specified'], ['Interested plan', lead.plan || 'Not sure yet']];
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">${details.map(([label, value]) => `<tr><td width="34%" style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#65748b;font-size:13px;vertical-align:top;">${label}</td><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;line-height:1.6;word-break:break-word;color:#0A204E;">${esc(value)}</td></tr>`).join('')}</table>`;
  const message = lead.message ? `<div style="margin-top:18px;padding:18px;background:#f4f8ed;border-left:4px solid #7EBB02;"><p style="margin:0 0 8px;font-size:13px;font-weight:700;">Your message</p><p style="margin:0;font-size:14px;line-height:1.8;color:#435574;">${esc(lead.message).replace(/\r?\n/g, '<br>')}</p></div>` : '';
  return {
    to: lead.email, subject: 'Your Campy demo request is confirmed', replyTo: FROM.address,
    html: layout({ preheader: 'We’ve received your demo request. Our team will be in touch within 24 hours.', heading: 'Your next chapter starts here.', greeting: `Hi ${first},`, intro: `Thank you for your interest in <strong style="color:#0A204E;">Campy</strong>. We’ve received your demo request for <strong style="color:#0A204E;">${esc(lead.school)}</strong>. Our team will contact you within <strong>24 hours</strong> to arrange a walkthrough.`,
      content: `<p style="margin:0 0 12px;font-size:15px;font-weight:700;">Here’s what you shared with us</p>${table}${message}`,
      buttonText: 'Discover what Campy can do', buttonUrl: `${SITE}/features`, closing: 'In the meantime, have your class list and current timetable handy. We’ll use them to show you how Campy can work for your school. You can reply to this email if you’d like to add anything.' }),
    text: `Hi ${first},\n\nThank you for your interest in Campy. We’ve received your demo request for ${lead.school}. Our team will contact you within 24 hours to arrange a walkthrough.\n\n${details.map(([label, value]) => `${label}: ${value}`).join('\n')}${lead.message ? `\n\nYour message:\n${lead.message}` : ''}\n\nDiscover Campy: ${SITE}/features\n\nHave your class list and current timetable handy. Reply to this email if you’d like to add anything.\n\nWarm regards,\nThe Campy team\nSchool management, made simple.\nadmin@nexzart.com\n\nYou received this email because a demo request was made using your email address on the Campy website. If this wasn’t you, reply and let us know.`,
  };
}
