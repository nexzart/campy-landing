// What Campy offers: modules, plans, add-ons and integrations.
// scripts/site-sections.mjs renders these into the homepage, /features, /pricing and /integrations,
// so the module list, plan contents and prices are defined once.

// plan: the cheapest plan that includes the module ('essential' | 'professional' | 'enterprise').
// aliases: older /features#anchors that should still land on this module.
export const MODULES = [
  {
    id: 'academics', plan: 'essential', icon: 'book-open-check', photo: 'academics',
    name: 'Academic Core',
    tagline: 'Classes, timetables, attendance, exams and homework, all working from the same records.',
    alt: 'Schoolgirls in white uniforms listening in a classroom',
    aliases: ['attendance', 'exams', 'timetable', 'homework'],
    features: [
      ['layout-grid', 'Classes, sections and subjects', 'Set up once and reuse every year, with teachers mapped to each subject.'],
      ['user-round', 'Student profiles', 'Personal, medical and guardian details, PEN and APAAR IDs, documents and history.'],
      ['calendar-range', 'Timetable with clash checks', 'Periods, breaks and versions. A teacher can’t be booked into two rooms at once.'],
      ['calendar-days', 'Academic calendar', 'Terms, holidays, working Saturdays and events that parents can see.'],
      ['clipboard-check', 'Attendance', 'Half-day or period-wise registers, marking windows, correction approvals and parent alerts.'],
      ['file-spreadsheet', 'Exams and marks', 'Exam schedules, invigilators, marks entry, grading scales and result publishing.'],
      ['scroll-text', 'Report cards', 'Term-wise report cards generated from marks, with co-scholastic grades and remarks.'],
      ['book-open', 'Homework and class diary', 'Assignments with PDF attachments, due dates and reminders, plus a daily class log.'],
    ],
  },
  {
    id: 'office', plan: 'essential', icon: 'users-round', photo: 'office',
    name: 'People and School Office',
    tagline: 'Everyone your school works with, and the paperwork that follows them, in one directory.',
    alt: 'A school administrator working at her desk with a laptop',
    aliases: ['leave', 'academic-year', 'checklists'],
    features: [
      ['id-card', 'Staff directory', 'Profiles, qualifications, documents and subject allocations for every staff member.'],
      ['heart-handshake', 'Parents and guardians', 'Linked to each child, with siblings grouped under one parent login.'],
      ['key-round', 'Roles and permissions', 'Ready-made roles, plus custom ones for accountants, coordinators and drivers.'],
      ['calendar-off', 'Leave and substitutes', 'Student and staff leave with approvals, and cover assigned for each missed period.'],
      ['arrow-up-right', 'Promotion and year-end', 'Promote, detain or graduate students in bulk, and archive the year.'],
      ['graduation-cap', 'Alumni records', 'Graduates stay searchable, with their full academic history.'],
      ['file-badge', 'Certificates', 'Transfer, bonafide and character certificates generated from the student record.'],
      ['list-checks', 'Checklists', 'Track books, uniforms, consent forms and documents per student.'],
    ],
  },
  {
    id: 'communication', plan: 'essential', icon: 'messages-square', photo: 'communication',
    name: 'Parent Connect',
    tagline: 'Every notice, alert and reminder reaches the right parents, and stays in their inbox.',
    alt: 'A mother reading a message on her phone',
    features: [
      ['megaphone', 'Announcements', 'Send to the whole school, a class, a section or staff only.'],
      ['bell-ring', 'Push notifications', 'Instant alerts on the Campy app for Android and iOS.'],
      ['message-circle', 'SMS, WhatsApp and email', 'Reach parents on the channel they read, using your own sender IDs.'],
      ['alarm-clock', 'Automatic reminders', 'Homework due, fees due, PTMs and events, sent without anyone remembering to.'],
      ['inbox', 'Notification inbox', 'Every alert is kept, so nothing depends on catching a push message.'],
      ['mail-check', 'Circulars with read status', 'See which parents have opened a circular, and remind the rest.'],
      ['calendar-clock', 'Parent–teacher meetings', 'Time slots that parents book from the app.'],
      ['message-square-text', 'Requests and feedback', 'Parents raise requests and complaints that are assigned, tracked and closed.'],
    ],
  },
  {
    id: 'admissions', plan: 'professional', icon: 'door-open',
    name: 'Admissions and Enquiries',
    tagline: 'From the first enquiry to the first day of school, without a lost lead or a lost form.',
    features: [
      ['inbox', 'Enquiries from every source', 'Website forms, phone calls, walk-ins and campaigns in one pipeline.'],
      ['phone-call', 'Follow-ups', 'Assign counsellors and get reminded when a follow-up is due.'],
      ['file-pen-line', 'Online application form', 'Your own form with document uploads and application fee payment.'],
      ['clipboard-list', 'Tests and interviews', 'Schedule entrance tests and interactions, and record the results.'],
      ['scale', 'Seats and quotas', 'Track seats by class, including RTE 25% admissions.'],
      ['user-plus', 'One-click enrolment', 'Turn an accepted application into a student record without retyping.'],
    ],
  },
  {
    id: 'fees', plan: 'professional', icon: 'wallet', photo: 'payments',
    name: 'Fees and Online Payments',
    tagline: 'Parents pay by UPI, card or netbanking. Receipts, dues and reconciliation take care of themselves.',
    alt: 'A smiling man holding a phone and a bank card, ready to pay',
    features: [
      ['layers', 'Fee structures', 'By class, category and term, with optional fees such as transport and activities.'],
      ['calendar-check', 'Instalments and due dates', 'Monthly, quarterly or termly, each with its own due date and late fee.'],
      ['badge-percent', 'Concessions and scholarships', 'Sibling, staff-ward, merit and RTE concessions, with approvals.'],
      ['smartphone', 'Online payment', 'UPI, cards, netbanking and wallets through the gateway of your choice.'],
      ['receipt', 'Instant receipts', 'Numbered receipts, emailed to parents and kept in the app.'],
      ['bell', 'Dues reminders', 'Polite, automatic reminders before and after the due date.'],
      ['undo-2', 'Refunds', 'Deposit and cancellation refunds with approval and a full audit trail.'],
      ['banknote', 'Cash and cheque desk', 'Counter collections, cash handovers and a daily collection book.'],
    ],
  },
  {
    id: 'accounting', plan: 'professional', icon: 'landmark', photo: 'finance',
    name: 'Accounts and Finance',
    tagline: 'Fees, expenses and the bank in one set of books, ready for your auditor.',
    alt: 'A person working on a calculator beside a keyboard',
    features: [
      ['book-text', 'Chart of accounts', 'Ledgers and groups that match how your school reports.'],
      ['arrow-left-right', 'Double-entry vouchers', 'Receipts, payments, journals and contras. Fee collections post on their own.'],
      ['building-2', 'Bank and cash books', 'Every account, with bank reconciliation against your statements.'],
      ['shopping-cart', 'Expenses and vendors', 'Purchase bills, vendor payments and approvals before money leaves.'],
      ['target', 'Budgets', 'Budgets by department or head, with actuals tracked against them.'],
      ['file-text', 'GST-ready invoices', 'For taxable services such as transport or events, where they apply.'],
      ['chart-pie', 'Financial statements', 'Trial balance, income and expenditure, and balance sheet at any date.'],
      ['file-output', 'Tally and Excel export', 'Send vouchers to Tally or your auditor’s spreadsheet.'],
    ],
  },
  {
    id: 'hr-payroll', plan: 'professional', icon: 'briefcase-business', photo: 'hr-payroll',
    name: 'HR and Payroll',
    tagline: 'Staff records, attendance and leave flow straight into a payroll run you can finish before lunch.',
    alt: 'An HR officer smiling at her desk with a laptop',
    features: [
      ['file-user', 'Employee records', 'Joining details, documents, bank and statutory numbers, in one file per person.'],
      ['fingerprint', 'Staff attendance', 'From biometric devices, face recognition or the staff app.'],
      ['calendar-off', 'Leave policies', 'Casual, sick and earned leave with balances, carry-forward and approvals.'],
      ['indian-rupee', 'Salary structures', 'Basic, DA, HRA, allowances and deductions by grade or by person.'],
      ['calculator', 'Payroll run', 'Salaries calculated from attendance and leave, with arrears and loss of pay.'],
      ['shield-check', 'Statutory deductions', 'PF, ESI, professional tax and TDS, with EPF ECR files.'],
      ['file-check', 'Payslips and Form 16', 'Payslips in the staff app, and year-end tax forms.'],
      ['landmark', 'Bank transfer files', 'Salary upload files for your bank, so nobody types account numbers.'],
    ],
  },
  {
    id: 'campus', plan: 'professional', icon: 'bus', photo: 'transport',
    name: 'Campus Operations',
    tagline: 'Buses, books, stores and the front gate, run from the same system as everything else.',
    alt: 'A yellow school bus on the road',
    features: [
      ['route', 'Transport', 'Routes, stops, vehicles and drivers, with transport fees linked to each stop.'],
      ['map-pin', 'Live bus tracking', 'GPS location and arrival alerts for parents.'],
      ['library', 'Library', 'Catalogue, barcode issue and return, due reminders and fines.'],
      ['package', 'Inventory and assets', 'Stores, stock levels, purchase orders and an asset register.'],
      ['contact-round', 'Front office', 'Visitor log, gate passes, call log and enquiries at reception.'],
      ['bed-double', 'Hostel', 'Rooms, beds, mess, leave and gate passes for boarders.'],
      ['images', 'Events and gallery', 'Photos and videos from events, shared with the right classes.'],
    ],
  },
  {
    id: 'insights', plan: 'professional', icon: 'chart-line',
    name: 'Reports and Analytics',
    tagline: 'The numbers your principal and management ask for, without anyone building a spreadsheet.',
    aliases: ['reports'],
    features: [
      ['layout-dashboard', 'Dashboards', 'Attendance, fees, results and staff at a glance, for each role.'],
      ['trending-up', 'Academic analysis', 'Class, subject and student trends across terms and years.'],
      ['wallet', 'Collection reports', 'Collections, dues and defaulters by class, head and payment mode.'],
      ['sliders-horizontal', 'Custom reports', 'Choose fields and filters, then save the report for next time.'],
      ['clock', 'Scheduled reports', 'Daily or weekly summaries emailed to management.'],
      ['file-up', 'Bulk import', 'Bring students, staff and fees in from Excel when you start.'],
      ['file-down', 'Exports', 'Any list to Excel or PDF, and data in UDISE+ format.'],
    ],
  },
  {
    id: 'website', plan: 'enterprise', icon: 'globe', photo: 'website-cms',
    name: 'School Website and CMS',
    tagline: 'A fast, professional school website your office can update, connected to admissions and notices.',
    alt: 'A person working on a website on a laptop',
    features: [
      ['panels-top-left', 'Ready-made designs', 'Professional school themes in your colours, built for phones first.'],
      ['square-pen', 'Easy page editor', 'Your office edits pages, staff profiles and facilities without a developer.'],
      ['newspaper', 'News, events and notices', 'Post once in Campy and it appears on the website too.'],
      ['images', 'Photo and video gallery', 'Albums for every event, uploaded from the phone.'],
      ['door-open', 'Admission enquiries', 'Website forms go straight into your admissions pipeline.'],
      ['file-badge', 'Mandatory disclosure', 'A CBSE public disclosure page that stays up to date.'],
      ['link', 'Your own domain', 'yourschool.in with free SSL, hosting and backups.'],
      ['search', 'Search-friendly', 'Clean pages, page titles and descriptions so parents find you on Google.'],
    ],
  },
  {
    id: 'security', plan: 'essential', icon: 'shield-check',
    name: 'Security and Compliance',
    tagline: 'Each school’s data is private, permissioned and on record, whichever plan you choose.',
    features: [
      ['smartphone', 'OTP sign-in', 'One-time codes to the phone number the school has on record. No shared passwords.'],
      ['monitor-smartphone', 'Session management', 'See signed-in devices and sign them out remotely.'],
      ['key-round', 'Access control', 'Role-based permissions down to who can mark, approve, publish or refund.'],
      ['scroll-text', 'Audit logs', 'Who changed what, the old value and when, for every important record.'],
      ['lock-keyhole', 'Data isolation', 'Every school’s records are kept separate from every other school.'],
      ['database-backup', 'Encryption and backups', 'Encrypted in transit and at rest, with automatic daily backups.'],
      ['user-check', 'Privacy controls', 'Consent records, data export and deletion requests, aligned with the DPDP Act, 2023.'],
    ],
  },
  {
    id: 'everywhere', plan: 'essential', icon: 'smartphone',
    name: 'Works Everywhere',
    tagline: 'On the office desktop, the teacher’s phone and the parent’s app, with or without a signal.',
    features: [
      ['smartphone', 'Android and iOS apps', 'One app for parents, teachers and staff, with push notifications.'],
      ['monitor-smartphone', 'Responsive portals', 'The same portals in any modern browser, on desktop, tablet or phone.'],
      ['wifi-off', 'Offline mode', 'Take attendance and enter marks without a connection.'],
      ['refresh-cw', 'Automatic sync', 'Offline work syncs, with conflicts flagged, as soon as the device reconnects.'],
      ['sun-moon', 'Light and dark themes', 'Comfortable in a bright classroom or late at night.'],
      ['languages', 'Multi-language', 'Parent-facing screens and messages in English and regional languages.'],
      ['network', 'Multi-branch', 'Run several campuses with group dashboards and shared reports.'],
      ['credit-card', 'Self-service billing', 'Your Campy plan, invoices and renewals, managed online.'],
    ],
  },
];

export const PLANS = [
  {
    id: 'essential', name: 'Essential', price: "35000+", tagline: 'The academic and communication core for any school.',
    storage: '40–50 GB', support: 'Email and phone support', cta: 'Grab the deal',
    // Highlighted on /pricing: sign up now and this yearly price never goes up.
    deal: { badge: 'Lifetime deal', note: 'Just ₹35K a year, locked for life. Sign up now and your price never goes up.' },
    highlights: ['Academic Core', 'People and School Office', 'Parent Connect', 'Security and Compliance', 'Android and iOS apps, offline mode', 'Standard reports'],
  },
  {
    id: 'professional', name: 'Professional ERP', price: "100000+", popular: true, tagline: 'The complete school ERP: academics, finance, HR and campus.',
    storage: '100 GB', support: 'Priority support, onboarding and data migration', cta: 'Choose Professional',
    highlights: ['Everything in Essential', 'Admissions and Enquiries', 'Fees and Online Payments', 'Accounts and Finance', 'HR and Payroll', 'Campus Operations', 'Reports and Analytics'],
  },
  {
    id: 'enterprise', name: 'Enterprise ERP + CMS', price: "200000+", tagline: 'Every module, your school website, and multi-campus control.',
    storage: '250 GB', support: 'Dedicated success manager and on-site training', cta: 'Talk to us about Enterprise',
    highlights: ['Everything in Professional', 'School Website and CMS', 'Multi-branch and group dashboards', 'Custom roles, workflows and reports', 'API and webhooks', 'Uptime commitment in your contract'],
  },
];

// Modules an Essential school can add one at a time. Prices are per year.
export const ADDONS = [
  { id: 'admissions', name: 'Admissions and Enquiries', price: 10000 },
  { id: 'fees', name: 'Fees and Online Payments', price: 15000 },
  { id: 'accounting', name: 'Accounts and Finance', price: 20000 },
  { id: 'hr-payroll', name: 'HR and Payroll', price: 20000 },
  { id: 'transport', name: 'Transport and bus tracking', price: 10000 },
  { id: 'library', name: 'Library', price: 5000 },
  { id: 'inventory', name: 'Inventory and assets', price: 7500 },
  { id: 'front-office', name: 'Front office and visitors', price: 5000 },
  { id: 'insights', name: 'Reports and Analytics', price: 7500 },
  { id: 'website', name: 'School Website and CMS', price: 30000 },
  { id: 'hostel', name: 'Hostel', price: 10000 },
];

export const PLATFORM_FEE_PERCENT = 0.1;

// Brand logos for /integrations, written to /asset/logos at build time. `logos` is an icon in the
// colour SVG Logos set (@iconify-json/logos) and `si` a Simple Icons slug in the brand colour; both
// sets are CC0. `file` is an official logo kept in asset/logos (see SOURCES.md there) for brands in
// neither set. `wide` marks a wordmark.
export const LOGOS = {
  cashfree: { name: 'Cashfree Payments', file: 'cashfree.png' },
  payu: { name: 'PayU', file: 'payu.svg', wide: true },
  hdfc: { name: 'HDFC Bank', file: 'hdfc.svg' },
  icici: { name: 'ICICI Bank', file: 'icici.png' },
  sbi: { name: 'State Bank of India', file: 'sbi.svg' },
  axis: { name: 'Axis Bank', file: 'axis.svg' },
  razorpay: { name: 'Razorpay', si: 'razorpay' },
  phonepe: { name: 'PhonePe', si: 'phonepe' },
  paytm: { name: 'Paytm', si: 'paytm' },
  stripe: { name: 'Stripe', logos: 'stripe', wide: true },
  whatsapp: { name: 'WhatsApp', logos: 'whatsapp-icon' },
  googlemaps: { name: 'Google Maps', logos: 'google-maps' },
  zoho: { name: 'Zoho', logos: 'zoho', wide: true },
  quickbooks: { name: 'QuickBooks', si: 'quickbooks' },
  googleworkspace: { name: 'Google Workspace', logos: 'google-workspace', wide: true },
  google: { name: 'Google', logos: 'google-icon' },
  microsoft: { name: 'Microsoft', logos: 'microsoft-icon' },
  zoom: { name: 'Zoom', logos: 'zoom-icon' },
  youtube: { name: 'YouTube', logos: 'youtube-icon' },
};

// Each item is [name, what it does for a school, logos]. A logo is a key in LOGOS, or
// 'icon:<lucide name>' where the item is a kind of thing, or a brand with no openly licensed logo.
export const INTEGRATIONS = [
  {
    id: 'payments', name: 'Payment gateways', nav: 'Payments', icon: 'credit-card',
    layout: 'logos', eyebrow: 'Full fees management', // a centred wall of logos instead of cards
    why: 'Parents pay in seconds by UPI, card or netbanking. Money settles straight into the school’s own bank account, and every payment is matched to a receipt automatically.',
    items: [
      ['Razorpay', 'UPI, cards, netbanking, wallets and EMI', ['razorpay']],
      ['PhonePe Payment Gateway', 'UPI-first payments from India’s most used UPI app', ['phonepe']],
      ['Paytm', 'UPI, wallet and cards', ['paytm']],
      ['Cashfree', 'Fast settlements and easy refunds', ['cashfree']],
      ['PayU', 'Cards, netbanking and pay-later', ['payu']],
      ['Bank gateways', 'HDFC, ICICI, SBI, Axis and other bank-owned gateways', ['hdfc', 'icici', 'sbi', 'axis']],
      ['Stripe', 'International cards for schools with overseas parents', ['stripe']],
      ['UPI QR at the counter', 'Static or dynamic QR codes at the fee desk', ['icon:qr-code']],
      ['Any other gateway', 'Have a gateway already? If it has an API, we connect it.', ['icon:plug-zap']],
    ],
  },
  {
    id: 'messaging', name: 'Messaging', nav: 'Messaging', icon: 'message-circle',
    why: 'Parents read WhatsApp. Campy sends alerts, receipts and reminders through the official WhatsApp Business Platform, using message templates approved by Meta.',
    items: [
      ['WhatsApp Business Platform', 'Official Meta API: alerts, receipts, results and replies', ['whatsapp']],
    ],
  },
  {
    id: 'attendance', name: 'Attendance devices', nav: 'Attendance devices', icon: 'scan-face',
    why: 'Staff attendance from the device at the gate feeds payroll directly, and parents can be told the moment a child arrives.',
    items: [
      ['Face recognition terminals', 'Contactless attendance for staff and students', ['icon:scan-face']],
      ['RFID cards', 'Card taps at gates and on school buses', ['icon:nfc']],
      ['QR attendance', 'Scan from the staff app, with no hardware to buy', ['icon:qr-code']],
    ],
  },
  {
    id: 'transport', name: 'Transport and GPS', nav: 'Transport and GPS', icon: 'map-pin',
    why: 'Parents stop calling the office to ask where the bus is. Live location and arrival alerts come from the trackers already fitted to your buses.',
    items: [
      ['GPS trackers', 'Most AIS-140 and standard GPS devices on your buses', ['icon:satellite']],
      ['Fleet platforms', 'Connect the tracking service you already use', ['icon:truck']],
      ['Maps', 'Google Maps for routes, stops and live location', ['googlemaps']],
    ],
  },
  {
    id: 'finance', name: 'Accounting and banking', nav: 'Accounting and banking', icon: 'landmark',
    why: 'Your accountant keeps the software they know. Vouchers and payroll leave Campy in the formats auditors, banks and EPFO expect.',
    items: [
      ['Tally Prime', 'Export vouchers and ledgers', ['icon:book-open-check']],
      ['Zoho Books and QuickBooks', 'Sync or export accounting entries', ['zoho', 'quickbooks']],
      ['Bank salary files', 'Bulk upload formats for major Indian banks', ['icon:landmark']],
      ['EPFO ECR', 'Monthly provident fund return files', ['icon:receipt']],
      ['Excel', 'Every list and report, ready for your spreadsheet', ['icon:file-spreadsheet']],
    ],
  },
  {
    id: 'learning', name: 'Learning and productivity', nav: 'Learning tools', icon: 'presentation',
    why: 'Teachers keep using the classroom tools they already like, while timetables, attendance and records stay in Campy.',
    items: [
      ['Google Workspace for Education', 'Sign in with Google, Classroom, Meet, Calendar and Drive', ['googleworkspace']],
      ['Microsoft 365 Education', 'Sign in with Microsoft, Teams and OneDrive', ['microsoft']],
      ['Zoom', 'Online classes and parent meetings from the timetable', ['zoom']],
      ['YouTube', 'Lesson videos linked to homework', ['youtube']],
    ],
  },
  {
    id: 'compliance', name: 'Government and boards', nav: 'Government and boards', icon: 'landmark',
    why: 'The data you already keep in Campy becomes the returns and registrations the system asks for each year.',
    items: [
      ['UDISE+', 'School, teacher and student data in UDISE+ formats', ['icon:school']],
      ['PEN and APAAR ID', 'Stored on every student record', ['icon:id-card']],
      ['Board registrations', 'Student lists in the formats boards ask for', ['icon:file-badge']],
    ],
  },
  {
    id: 'developers', name: 'For your developers', nav: 'Developers', icon: 'code',
    why: 'Large groups and trusts can connect Campy to their own systems.',
    items: [
      ['Single sign-on', 'Google and Microsoft accounts for staff', ['google', 'microsoft']],
      ['REST API', 'Read and write students, staff, fees and attendance (Enterprise)', ['icon:braces']],
      ['Webhooks', 'Get notified when a payment, admission or attendance event happens', ['icon:webhook']],
    ],
  },
];
