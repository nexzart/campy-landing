# Sheet and GoDaddy SMTP setup

Flow: existing website Worker → Apps Script → Google Sheet → Node.js SMTP relay → visitor and nexzart.main@gmail.com.

Apps Script cannot run Nodemailer. Host this separate Node.js service on a Node-capable server with outbound port 465 access and an HTTPS endpoint (for example, behind your host's HTTPS proxy). It is not part of the Cloudflare Worker deployment.

1. Create a Google Sheet. Copy its ID from `https://docs.google.com/spreadsheets/d/ID/edit`.
2. At script.google.com, create a project using the Google account with edit access to that Sheet. Paste `apps-script/Code.gs` and `apps-script/Logo.gs` into separate script files. Use the timezone Asia/Kolkata.
3. In this directory run `npm ci`. Copy `.env.example` to `.env`. Set `SMTP_PASSWORD` to the GoDaddy Professional Email password for **admin@nexzart.com**. Generate a secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and use it for `SMTP_RELAY_SECRET`. Keep `.env` on the server only.
4. Run `npm start` with Node.js 22 or newer, then configure your host to expose `/send` over HTTPS. Production hosts may inject the same environment variables and run `node server.mjs` instead.
5. In Apps Script → Project Settings → Script properties, set:

   | Property | Value |
   | --- | --- |
   | `SPREADSHEET_ID` | The Sheet ID from step 1 |
   | `SHARED_SECRET` | A separate random secret shared with the website Worker |
   | `SMTP_RELAY_URL` | `https://YOUR-NODE-HOST/send` |
   | `SMTP_RELAY_SECRET` | The secret from step 3 |

6. Run `testSendDemo` from the Apps Script editor and approve Google's Sheets/external-request permissions. This sends actual preview emails to your signed-in Google account and the admin inbox; it does not append a row. Run `testSendSubscribe` for the other template.
7. Deploy Apps Script as a Web app: **Execute as Me**, **Who has access Anyone**. Put its `/exec` URL into the Worker's `APPS_SCRIPT_URL` secret, and the Apps Script `SHARED_SECRET` into `APPS_SCRIPT_SECRET`, using the existing Wrangler setup. Redeploy the Worker if configuring it for the first time. For subsequent script edits, deploy a new Apps Script version.
8. Submit the website form and check the `Contacts` tab plus both inboxes.

The sheet includes all form fields, submission metadata, raw lead/metadata JSON, and separate visitor/admin email statuses. The row is saved before sending; a visitor delivery failure does not prevent the admin email attempt. `sent` means SMTP accepted the message, not guaranteed inbox delivery. Failed sends are recorded and logged; automatic retries are not implemented. A repeated submission creates another row. If execution is interrupted, an email status can remain `pending`.

The Worker still saves submissions to KV and performs the Apps Script call in the background. It reports form success before Sheet/SMTP completion; failures appear in Worker logs. No credentials are included in browser code.

SMTP is fixed to `smtpout.secureserver.net`, port **465**, SSL/TLS, with `admin@nexzart.com` as both login and sender. Notifications go to **nexzart.main@gmail.com** and replying to a notification addresses the visitor.
