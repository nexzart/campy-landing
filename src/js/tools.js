/* Campy Tools – Alpine components for the /tools pages.
   Everything runs in the browser: nothing typed, pasted or uploaded is sent anywhere. The only
   thing kept is the school's letterhead (name, address, logo) and checklist ticks, in localStorage.
   Loaded on tool pages only, after app.js and before Alpine. */
(function () {
  window.CampyTools = true;

  // ---------------------------------------------------------------- helpers

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function num(v) {
    var n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  function fmt(n, digits, fixed) {
    if (!isFinite(n)) return '–';
    var d = digits == null ? 2 : digits;
    return Number(n).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: fixed ? d : 0 });
  }
  function inr(n, digits) {
    return (n < 0 ? '−₹' : '₹') + fmt(Math.abs(n), digits == null ? 0 : digits);
  }
  function pad(n) {
    return String(n).padStart(2, '0');
  }
  function iso(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || '').trim());
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  }
  function addDays(d, n) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }
  function addMonths(d, n) {
    var x = new Date(d.getFullYear(), d.getMonth() + n, 1);
    x.setDate(Math.min(d.getDate(), new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
    return x;
  }
  function longDate(v) {
    var d = typeof v === 'string' ? parseDate(v) : v;
    return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : '';
  }
  function shortDate(v) {
    var d = typeof v === 'string' ? parseDate(v) : v;
    return d ? pad(d.getDate()) + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear() : '';
  }
  // Every date in a line, as 2026-08-15 or 15/08/2026 (also 15-08-2026, 15.08.2026).
  function datesIn(line) {
    var out = [];
    String(line).replace(/(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/g, function (_, y, m, d, d2, m2, y2) {
      var date = y ? new Date(+y, +m - 1, +d) : new Date(+y2, +m2 - 1, +d2);
      if (!isNaN(date)) out.push(date);
      return _;
    });
    return out;
  }
  // "2026-10-20 to 2026-10-24 | holiday | Diwali break" → { from, to, parts: ['holiday', 'Diwali break'] }
  function parseDatedLines(text) {
    return String(text || '').split('\n').map(function (line) {
      var dates = datesIn(line);
      if (!dates.length) return null;
      var from = dates[0];
      var to = dates[1] && dates[1] >= from ? dates[1] : from;
      var rest = line.replace(/(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/g, '').replace(/\bto\b|–|—/i, '');
      var parts = rest.split('|').map(function (p) { return p.trim(); }).filter(Boolean);
      return { from: from, to: to, parts: parts };
    }).filter(Boolean);
  }
  function eachDay(from, to, fn) {
    for (var d = new Date(from.getFullYear(), from.getMonth(), from.getDate()); d <= to; d = addDays(d, 1)) fn(d);
  }
  function weekOfMonth(d) {
    return Math.ceil(d.getDate() / 7);
  }
  // Saturday rule: 'none' | 'all' | '24' (2nd and 4th off) | '13' (1st and 3rd off)
  function isWeeklyOff(d, saturdays) {
    if (d.getDay() === 0) return true;
    if (d.getDay() !== 6) return false;
    if (saturdays === 'all') return true;
    if (saturdays === '24') return weekOfMonth(d) === 2 || weekOfMonth(d) === 4;
    if (saturdays === '13') return weekOfMonth(d) === 1 || weekOfMonth(d) === 3;
    return false;
  }

  function toMinutes(hhmm) {
    var m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
    return m ? +m[1] * 60 + +m[2] : 0;
  }
  function clock(mins) {
    mins = ((Math.round(mins) % 1440) + 1440) % 1440;
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return (h % 12 || 12) + ':' + pad(m) + (h < 12 ? ' am' : ' pm');
  }

  // Indian number words: lakh and crore.
  var ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  var ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth'];
  function twoDigits(n) {
    return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  }
  function threeDigits(n) {
    var h = Math.floor(n / 100);
    var r = n % 100;
    return (h ? ONES[h] + ' hundred' + (r ? ' ' : '') : '') + (r ? twoDigits(r) : '');
  }
  function words(n) {
    n = Math.floor(Math.abs(n));
    if (!n) return 'zero';
    var parts = [];
    var crore = Math.floor(n / 1e7);
    n %= 1e7;
    var lakh = Math.floor(n / 1e5);
    n %= 1e5;
    var thousand = Math.floor(n / 1000);
    n %= 1000;
    if (crore) parts.push(words(crore) + ' crore');
    if (lakh) parts.push(twoDigits(lakh) + ' lakh');
    if (thousand) parts.push(twoDigits(thousand) + ' thousand');
    if (n) parts.push(threeDigits(n));
    return parts.join(' ');
  }
  function titleCase(s) {
    return s.replace(/(^|[\s-])([a-z])/g, function (_, sep, c) { return sep + c.toUpperCase(); });
  }
  function rupeesInWords(amount) {
    var rupees = Math.floor(Math.max(0, amount));
    var paise = Math.round((Math.max(0, amount) - rupees) * 100);
    return 'Rupees ' + titleCase(words(rupees)) + (paise ? ' and ' + titleCase(words(paise)) + ' Paise' : '') + ' Only';
  }
  function ordinalWord(n) {
    if (n <= 20) return ORDINALS[n];
    if (n === 30) return 'thirtieth';
    var tens = Math.floor(n / 10);
    return TENS[tens] + '-' + ORDINALS[n % 10];
  }
  function dateInWords(v) {
    var d = typeof v === 'string' ? parseDate(v) : v;
    if (!d) return '';
    return titleCase(ordinalWord(d.getDate()) + ' ' + MONTHS[d.getMonth()].toLowerCase() + ' ' + words(d.getFullYear()));
  }

  // Tab-, comma- or semicolon-separated text, as pasted from Excel or Google Sheets.
  function splitRow(line, delim) {
    var out = [];
    var cur = '';
    var quoted = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') quoted = false;
        else cur += c;
      } else if (c === '"') quoted = true;
      else if (c === delim) { out.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    out.push(cur.trim());
    return out;
  }
  function parseTable(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); });
    if (!lines.length) return [];
    var first = lines[0];
    var delim = first.indexOf('\t') > -1 ? '\t' : first.indexOf(';') > -1 && first.indexOf(',') < 0 ? ';' : ',';
    return lines.map(function (l) { return splitRow(l, delim); });
  }
  function isNumber(v) {
    return v !== '' && v != null && isFinite(parseFloat(v));
  }
  function lines(text) {
    return String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function downloadCsv(filename, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (c) {
        c = c == null ? '' : String(c);
        return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(',');
    }).join('\r\n');
    var url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function readText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
  // Downscale an image to at most `max` px on its longer side and return a data URL.
  function readImage(file, max) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var scale = Math.min(1, max / Math.max(img.width, img.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  var storage = {
    get: function (key) {
      try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
    },
    // Writes only with "preferences" consent (see the cookie banner in app.js).
    set: function (key, value) {
      if (!window.campyConsent || !window.campyConsent().preferences) return;
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode or storage full */ }
    },
  };

  // Print one element on its own: clone it into #print-root, which the print stylesheet shows
  // in place of the page. x-ignore keeps Alpine from initialising the copy.
  function printElement(el, landscape) {
    var old = document.getElementById('print-root');
    if (old) old.remove();
    if (!el) return window.print();
    var root = document.createElement('div');
    root.id = 'print-root';
    root.setAttribute('x-ignore', '');
    if (landscape) root.innerHTML = '<style>@page { size: A4 landscape; }</style>';
    root.appendChild(el.cloneNode(true));
    document.body.appendChild(root);
    document.body.classList.add('printing');
    window.addEventListener('afterprint', function done() {
      window.removeEventListener('afterprint', done);
      document.body.classList.remove('printing');
      root.remove();
    });
    window.print();
  }

  // Grade scales: [minimum percentage, grade, grade point]
  var SCALES = {
    cbse8: [[91, 'A1', 10], [81, 'A2', 9], [71, 'B1', 8], [61, 'B2', 7], [51, 'C1', 6], [41, 'C2', 5], [33, 'D', 4], [0, 'E', 0]],
    cce9: [[91, 'A1', 10], [81, 'A2', 9], [71, 'B1', 8], [61, 'B2', 7], [51, 'C1', 6], [41, 'C2', 5], [33, 'D', 4], [21, 'E1', 0], [0, 'E2', 0]],
  };
  function gradeFor(pct, scale) {
    scale = scale || SCALES.cbse8;
    var p = Math.round(pct * 100) / 100;
    for (var i = 0; i < scale.length; i++) if (p >= scale[i][0]) return scale[i];
    return scale[scale.length - 1];
  }

  var PRONOUNS = {
    f: { sub: 'she', pos: 'her', rel: 'daughter' },
    m: { sub: 'he', pos: 'his', rel: 'son' },
    x: { sub: 'they', pos: 'their', rel: 'child' },
  };
  function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  // ---------------------------------------------------------------- data

  // 7th CPC pay matrix: entry pay and maximum for each level. Each cell is the previous × 1.03, rounded to ₹100.
  var PAY_LEVELS = {
    1: [18000, 56900], 2: [19900, 63200], 3: [21700, 69100], 4: [25500, 81100], 5: [29200, 92300],
    6: [35400, 112400], 7: [44900, 142400], 8: [47600, 151100], 9: [53100, 167800], 10: [56100, 177500],
    11: [67700, 208700], 12: [78800, 209200], 13: [123100, 215900], '13A': [131100, 216600], 14: [144200, 218200],
  };
  var PAY_PRESETS = { prt: '6', tgt: '7', pgt: '8' };

  var GPA_POINTS = { 'A+': 4, A: 4, 'A-': 3.7, 'B+': 3.3, B: 3, 'B-': 2.7, 'C+': 2.3, C: 2, 'C-': 1.7, 'D+': 1.3, D: 1, F: 0 };

  var CHECKLISTS = {
    udise: [
      { title: 'School profile', items: [
        ['UDISE+ code is active and the head of school has working portal login details', 3],
        ['School name, address, management type and board affiliation are current', 2],
        ['Lowest and highest class, medium of instruction and school category are correct', 2],
        ['Recognition and affiliation certificate numbers and years are at hand', 1],
        ['Last session’s instructional days and school timings are recorded', 1],
      ] },
      { title: 'Facilities', items: [
        ['Classrooms counted by condition (good, minor repair, major repair)', 2],
        ['Functional toilets counted separately for boys, girls and CWSN', 2],
        ['Drinking water, handwashing and electricity status confirmed', 1],
        ['Library books, playground, ramps and boundary wall status confirmed', 1],
        ['Computers, smart classrooms and internet connection counted', 2],
        ['Medical check-ups and mid-day meal arrangements (where applicable) recorded', 1],
      ] },
      { title: 'Teachers and staff', items: [
        ['Every teaching and non-teaching staff member listed with date of joining', 2],
        ['Academic and professional qualifications recorded for each teacher', 2],
        ['Classes and subjects taught, and appointment type, recorded for each teacher', 1],
        ['In-service training received during the year recorded', 1],
        ['Staff who joined, transferred or left during the year updated', 1],
      ] },
      { title: 'Students', items: [
        ['Every student has name, date of birth, gender and parents’ names recorded', 3],
        ['Social category, minority, BPL and CWSN status recorded', 2],
        ['Aadhaar numbers collected, or the reason they are missing noted', 2],
        ['PEN generated for every student, and APAAR IDs created where parents consented', 2],
        ['New admissions, promotions and students who left are updated (progression)', 2],
        ['Previous year’s exam results (appeared, passed, marks range) are ready', 2],
        ['Incentives received (textbooks, uniforms, scholarships, transport) recorded', 1],
      ] },
      { title: 'Finance and sign-off', items: [
        ['Receipts and expenditure for the last financial year compiled', 1],
        ['Fees charged per class recorded (private schools)', 1],
        ['Data reviewed and certified by the head of school before submission', 2],
      ] },
    ],
    cbse: [
      { title: 'Documents and recognition', items: [
        ['Society, trust or company registration certificate', 3],
        ['Land documents and land certificate in the name of the society or trust', 3],
        ['Recognition certificate or NOC from the state education department', 3],
        ['Building safety certificate from a competent authority', 3],
        ['Fire safety certificate from the fire department', 3],
        ['Water, health and sanitation certificate', 3],
        ['Mandatory public disclosure (Appendix IX) up to date on the school website', 3],
        ['Fee structure approved and displayed as per state rules', 2],
      ] },
      { title: 'Staff', items: [
        ['Principal qualified as per CBSE norms', 2],
        ['All teachers hold qualifications as per NCTE and CBSE norms', 3],
        ['Teacher strength meets 1.5 teachers per section and a 30:1 pupil–teacher ratio', 2],
        ['Salaries paid as per state norms, through bank transfer', 3],
        ['EPF and other statutory benefits deducted and deposited', 2],
        ['Counsellor or wellness teacher and special educator appointed', 2],
        ['Qualified physical education teacher appointed', 1],
        ['Teachers complete the CBSE-mandated 50 hours of training a year', 1],
      ] },
      { title: 'Infrastructure', items: [
        ['Classrooms of adequate size, with at least 1 sq m per student', 2],
        ['Science labs (composite, or physics, chemistry and biology) for the classes offered', 2],
        ['Computer lab and mathematics lab', 1],
        ['Library with adequate books, periodicals and seating', 1],
        ['Playground and sports facilities', 1],
        ['Barrier-free access: ramps, rails and an accessible toilet', 2],
        ['Separate toilets for boys and girls on each floor, and safe drinking water', 2],
      ] },
      { title: 'Safety and welfare', items: [
        ['CCTV covering the premises, with footage retained', 2],
        ['POCSO compliance: committees, policy and police verification of staff', 3],
        ['School transport meets safety guidelines (GPS, female attendant, speed governor)', 2],
        ['First aid, sick room and a tie-up with a nearby hospital', 1],
        ['Fire drills and evacuation plan in place; extinguishers serviced', 2],
        ['Anti-bullying, grievance and internal complaints committees constituted', 1],
      ] },
      { title: 'Academics and governance', items: [
        ['Curriculum and textbooks as prescribed by CBSE and NCERT', 2],
        ['Timetable includes art, health and physical education, and work education', 1],
        ['Assessment records, question papers and results kept class-wise', 1],
        ['Student and staff attendance registers maintained and up to date', 2],
        ['School Management Committee constituted, with meeting minutes', 2],
      ] },
    ],
  };

  var MATURITY = [
    { title: 'Devices and connectivity', next: 'Give every teacher a device for school work, get reliable internet in the office and staff room, and name one person responsible for IT support.', questions: [
      'Teachers have a device (laptop, tablet or phone) they can use for school work.',
      'Reliable internet is available in the office and staff room.',
      'Classrooms have a projector, smart board or screen.',
      'Devices are maintained, and someone is responsible for IT support.',
    ] },
    { title: 'Administration', next: 'Move student records, attendance, fees and marks out of registers and into one connected system, so totals and reports need no manual work.', questions: [
      'Student and staff records are kept in a digital system, not registers.',
      'Attendance is recorded digitally, and percentages are available instantly.',
      'Fees are tracked digitally, with receipts and dues visible to the office.',
      'Exam marks and report cards are produced from a system.',
    ] },
    { title: 'Teaching and learning', next: 'Plan a short training on digital tools each term, and share homework and study material digitally so students can catch up after absences.', questions: [
      'Teachers use digital content or tools in lessons every week.',
      'Homework and study material are shared digitally.',
      'Teachers have had training on using technology in class in the last year.',
      'Students have scheduled time on computers or devices.',
    ] },
    { title: 'Communication', next: 'Send absence alerts, homework and announcements to parents’ phones, and let parents check marks and attendance without visiting the school.', questions: [
      'Parents get absence, homework and announcement updates digitally.',
      'Parents can see marks and attendance without visiting the school.',
      'Staff circulars and leave requests are handled digitally.',
      'The school website is current and includes mandatory disclosures.',
    ] },
    { title: 'Data, safety and decisions', next: 'Give every user their own login, limit access by role, back up records automatically off the premises, and review attendance and results data each month.', questions: [
      'Every user has their own login; passwords are not shared.',
      'Records are backed up automatically, away from the school premises.',
      'Access to student data is limited by role, and changes are logged.',
      'Leadership reviews attendance and results data to make decisions.',
    ] },
  ];

  var CIRCULARS = {
    holiday: {
      subject: 'Holiday on account of Diwali',
      body: 'Dear Parents,\n\nThis is to inform you that the school will remain closed from 20 October to 24 October 2026 on account of Diwali. Classes will resume as usual on Monday, 26 October 2026.\n\nWe wish you and your family a safe and happy Diwali.',
    },
    ptm: {
      subject: 'Parent–Teacher Meeting',
      body: 'Dear Parents,\n\nA Parent–Teacher Meeting will be held on Saturday, 14 November 2026, from 9:00 am to 12:30 pm in the respective classrooms. Class teachers will discuss your ward’s progress in the half-yearly examination.\n\nYour presence is requested. Please bring the student diary.',
    },
    fees: {
      subject: 'Reminder: Second-term fee payment',
      body: 'Dear Parents,\n\nThis is a reminder that the second-term fee is due by 10 October 2026. A late fee will be charged on payments received after the due date.\n\nFees can be paid at the school office between 9:00 am and 1:00 pm, or online. Please ignore this notice if you have already paid.',
    },
    exam: {
      subject: 'Half-yearly examination schedule',
      body: 'Dear Parents,\n\nThe half-yearly examinations for Classes 1 to 8 will begin on 21 September 2026. The date sheet and syllabus are attached.\n\nStudents must carry their admit card and their own stationery. School will close at 12:30 pm on examination days.',
    },
    event: {
      subject: 'Annual Day celebration',
      body: 'Dear Parents,\n\nWe are pleased to invite you to our Annual Day celebration on Saturday, 19 December 2026, at 5:00 pm in the school auditorium.\n\nStudents taking part must report by 3:30 pm in costume. Entry for parents is by the invitation card sent with this circular.',
    },
    blank: { subject: '', body: '' },
  };

  // ---------------------------------------------------------------- Alpine

  document.addEventListener('alpine:init', function () {
    Alpine.magic('fmt', function () { return fmt; });
    Alpine.magic('inr', function () { return inr; });
    Alpine.magic('date', function () { return longDate; });
    Alpine.magic('words', function () { return rupeesInWords; });
    Alpine.magic('print', function () {
      return function (selector, landscape) { printElement(document.querySelector(selector), landscape); };
    });

    // The school's letterhead, shared by every document generator and remembered in this browser.
    var SCHOOL_KEY = 'campy-tools:school';
    Alpine.store('school', {
      name: '', address: '', code: '', phone: '', email: '', principal: '', logo: '',
      init: function () {
        var self = this;
        var saved = storage.get(SCHOOL_KEY) || {};
        Object.keys(saved).forEach(function (k) { if (k in self) self[k] = saved[k]; });
        Alpine.effect(function () {
          storage.set(SCHOOL_KEY, { name: self.name, address: self.address, code: self.code, phone: self.phone, email: self.email, principal: self.principal, logo: self.logo });
        });
      },
      get title() {
        return this.name || 'Your School Name';
      },
      get contact() {
        return [this.phone && 'Phone: ' + this.phone, this.email && 'Email: ' + this.email].filter(Boolean).join(' · ');
      },
      pickLogo: function (evt) {
        var self = this;
        var file = evt.target.files[0];
        evt.target.value = '';
        if (file) readImage(file, 320).then(function (url) { self.logo = url; });
      },
    });

    // ------------------------------------------------------------ calculators

    Alpine.data('attendance', function () {
      return {
        held: 120, attended: 84, target: 75, remaining: 80,
        days: 210, min: 75,
        sheet: 'Name\tDays present\nAarav Sharma\t196\nDiya Patel\t151\nIshaan Reddy\t172\nMeera Nair\t205\nKabir Singh\t149\nAnanya Iyer\t188',
        get valid() {
          return this.held > 0 && this.attended >= 0 && this.attended <= this.held;
        },
        get pct() {
          return this.valid ? (this.attended / this.held) * 100 : 0;
        },
        get t() {
          return Math.min(99.99, Math.max(1, num(this.target))) / 100;
        },
        get need() {
          return Math.max(0, Math.ceil((this.t * this.held - this.attended) / (1 - this.t) - 1e-9));
        },
        get canMiss() {
          return Math.max(0, Math.floor((this.attended - this.t * this.held) / this.t + 1e-9));
        },
        get best() {
          var r = num(this.remaining);
          return ((num(this.attended) + r) / (num(this.held) + r)) * 100;
        },
        get rows() {
          var total = num(this.days);
          var min = num(this.min);
          return parseTable(this.sheet).filter(function (r) { return r.length > 1 && isNumber(r[1]); }).map(function (r) {
            var present = num(r[1]);
            var pct = total ? (present / total) * 100 : 0;
            return { name: r[0], present: present, absent: Math.max(0, total - present), pct: pct, ok: pct >= min };
          });
        },
        get average() {
          var rows = this.rows;
          return rows.length ? rows.reduce(function (s, r) { return s + r.pct; }, 0) / rows.length : 0;
        },
        get shortCount() {
          return this.rows.filter(function (r) { return !r.ok; }).length;
        },
        load: function (evt) {
          var self = this;
          var file = evt.target.files[0];
          if (file) readText(file).then(function (t) { self.sheet = t; });
          evt.target.value = '';
        },
        csv: function () {
          var min = this.min;
          downloadCsv('attendance-report.csv', [['Name', 'Days present', 'Days absent', 'Attendance %', 'Status']].concat(this.rows.map(function (r) {
            return [r.name, r.present, r.absent, r.pct.toFixed(2), r.ok ? 'Eligible' : 'Below ' + min + '%'];
          })));
        },
      };
    });

    Alpine.data('ratio', function () {
      return {
        students: 640, teachers: 19, sections: 16,
        get ptr() {
          return this.teachers > 0 ? this.students / this.teachers : 0;
        },
        get perSection() {
          return this.sections > 0 ? this.teachers / this.sections : 0;
        },
        get classSize() {
          return this.sections > 0 ? this.students / this.sections : 0;
        },
        get norms() {
          var n = Math.max(0, Math.round(num(this.students)));
          var s = Math.max(0, Math.round(num(this.sections)));
          var rtePrimary = n === 0 ? 0 : n <= 60 ? 2 : n <= 90 ? 3 : n <= 120 ? 4 : n <= 150 ? 5 : n <= 200 ? 6 : Math.ceil(n / 40) + 1;
          var list = [
            { name: 'RTE, Classes 1–5', rule: 'Slabs up to 200 children, then 40:1 plus a head teacher', need: rtePrimary },
            { name: 'RTE, Classes 6–8', rule: '35:1, at least 3 subject teachers', need: n ? Math.max(3, Math.ceil(n / 35)) : 0 },
            { name: 'CBSE affiliation', rule: '30:1 and 1.5 teachers per section', need: Math.max(Math.ceil(n / 30), Math.ceil(s * 1.5)) },
            { name: 'NEP 2020', rule: 'Under 30:1', need: Math.ceil(n / 30) },
            { name: 'NEP 2020, disadvantaged areas', rule: 'Under 25:1', need: Math.ceil(n / 25) },
          ];
          var have = num(this.teachers);
          return list.map(function (x) { x.gap = x.need - have; return x; });
        },
      };
    });

    Alpine.data('feeCollection', function () {
      return {
        students: 600, concessionShare: 12, concessionAvg: 30, collectionRate: 93, instalments: 4,
        heads: [
          { name: 'Tuition fee', amount: 3200, times: 12, share: 100 },
          { name: 'Annual charges', amount: 6500, times: 1, share: 100 },
          { name: 'Transport', amount: 1500, times: 11, share: 45 },
          { name: 'Exam and activity fee', amount: 1200, times: 2, share: 100 },
        ],
        add: function () {
          this.heads.push({ name: '', amount: 0, times: 1, share: 100 });
        },
        perStudent: function (h) {
          return num(h.amount) * num(h.times);
        },
        headTotal: function (h) {
          return this.perStudent(h) * num(this.students) * (num(h.share) / 100);
        },
        get gross() {
          var self = this;
          return this.heads.reduce(function (s, h) { return s + self.headTotal(h); }, 0);
        },
        get concession() {
          return this.gross * (num(this.concessionShare) / 100) * (num(this.concessionAvg) / 100);
        },
        get net() {
          return this.gross - this.concession;
        },
        get expected() {
          return this.net * (num(this.collectionRate) / 100);
        },
        get perInstalment() {
          return this.instalments > 0 ? this.expected / this.instalments : 0;
        },
      };
    });

    Alpine.data('salary', function (preset) {
      return {
        level: PAY_PRESETS[preset] || '6', steps: 0, da: 58, hraClass: 'X', taCity: 'higher', nps: true, pt: 200, other: 0,
        levels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '13A', '14'],
        get basic() {
          var lv = PAY_LEVELS[this.level];
          var pay = lv[0];
          for (var i = 0; i < Math.min(40, Math.max(0, Math.round(num(this.steps)))); i++) pay = Math.round((pay * 1.03) / 100) * 100;
          return Math.min(pay, lv[1]);
        },
        get daAmount() {
          return Math.round(this.basic * num(this.da) / 100);
        },
        get hra() {
          var rate = { X: 0.3, Y: 0.2, Z: 0.1 }[this.hraClass];
          var minimum = { X: 5400, Y: 3600, Z: 1800 }[this.hraClass];
          return Math.max(Math.round(this.basic * rate), minimum);
        },
        get ta() {
          var lv = this.level === '13A' ? 13 : +this.level;
          var higher = this.taCity === 'higher';
          if (lv >= 9) return higher ? 7200 : 3600;
          if (lv >= 3 || this.basic >= 24200) return higher ? 3600 : 1800;
          return higher ? 1350 : 900;
        },
        get daOnTa() {
          return Math.round(this.ta * num(this.da) / 100);
        },
        get gross() {
          return this.basic + this.daAmount + this.hra + this.ta + this.daOnTa;
        },
        get npsAmount() {
          return this.nps ? Math.round((this.basic + this.daAmount) * 0.1) : 0;
        },
        get deductions() {
          return this.npsAmount + num(this.pt) + num(this.other);
        },
        get net() {
          return this.gross - this.deductions;
        },
      };
    });

    Alpine.data('admissionAge', function () {
      var now = new Date();
      return {
        dob: '2021-02-14', session: now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear(), cutoff: '03-31', minAge: 6,
        get cutoffDate() {
          var p = this.cutoff.split('-');
          return new Date(num(this.session), +p[0] - 1, +p[1]);
        },
        get birth() {
          return parseDate(this.dob);
        },
        get age() {
          var b = this.birth;
          var on = this.cutoffDate;
          if (!b || b > on) return null;
          var y = on.getFullYear() - b.getFullYear();
          var m = on.getMonth() - b.getMonth();
          var d = on.getDate() - b.getDate();
          if (d < 0) { m--; d += new Date(on.getFullYear(), on.getMonth(), 0).getDate(); }
          if (m < 0) { y--; m += 12; }
          return { y: y, m: m, d: d, months: y * 12 + m };
        },
        get ladder() {
          var c1 = num(this.minAge);
          var on = this.cutoffDate;
          var list = [['Nursery / Pre-KG', c1 - 3], ['LKG', c1 - 2], ['UKG', c1 - 1]];
          for (var i = 1; i <= 12; i++) list.push(['Class ' + i, c1 + i - 1]);
          return list.map(function (x) {
            var latest = addMonths(on, -Math.round(x[1] * 12));
            var earliest = addDays(addMonths(latest, -12), 1);
            return { name: x[0], age: x[1], earliest: earliest, latest: latest };
          });
        },
        get eligible() {
          var a = this.age;
          if (!a) return null;
          var found = null;
          this.ladder.forEach(function (c) { if (a.months >= Math.round(c.age * 12)) found = c; });
          return found;
        },
        get sessionLabel() {
          return this.session + '–' + String(num(this.session) + 1).slice(-2);
        },
        ageLabel: function (years) {
          return years % 1 ? Math.floor(years) + ' years 6 months' : years + ' years';
        },
      };
    });

    Alpine.data('workingDays', function () {
      return {
        start: '2026-04-01', end: '2027-03-31', saturdays: '24', hoursPerDay: 5.5,
        holidays: '2026-05-01 to 2026-05-31 | Summer vacation\n2026-08-15 | Independence Day\n2026-10-02 | Gandhi Jayanti\n2026-10-19 to 2026-10-23 | Diwali break\n2026-12-24 to 2027-01-01 | Winter vacation\n2027-01-26 | Republic Day',
        get range() {
          var a = parseDate(this.start);
          var b = parseDate(this.end);
          return a && b && b >= a ? [a, b] : null;
        },
        get months() {
          var r = this.range;
          if (!r) return [];
          var off = {};
          parseDatedLines(this.holidays).forEach(function (h) { eachDay(h.from, h.to, function (d) { off[iso(d)] = true; }); });
          var sat = this.saturdays;
          var map = {};
          var order = [];
          eachDay(r[0], r[1], function (d) {
            var key = d.getFullYear() + '-' + d.getMonth();
            if (!map[key]) { map[key] = { label: MONTHS[d.getMonth()] + ' ' + d.getFullYear(), days: 0, weekly: 0, holidays: 0, working: 0 }; order.push(key); }
            var m = map[key];
            m.days++;
            if (isWeeklyOff(d, sat)) m.weekly++;
            else if (off[iso(d)]) m.holidays++;
            else m.working++;
          });
          return order.map(function (k) { return map[k]; });
        },
        get totals() {
          return this.months.reduce(function (t, m) {
            t.days += m.days; t.weekly += m.weekly; t.holidays += m.holidays; t.working += m.working;
            return t;
          }, { days: 0, weekly: 0, holidays: 0, working: 0 });
        },
        get hours() {
          return this.totals.working * num(this.hoursPerDay);
        },
      };
    });

    Alpine.data('teacherNeed', function () {
      return {
        maxLoad: 30, reserve: 10,
        subjects: [
          { name: 'English', sections: 18, periods: 7 },
          { name: 'Hindi / Second language', sections: 18, periods: 6 },
          { name: 'Mathematics', sections: 18, periods: 7 },
          { name: 'Science', sections: 18, periods: 7 },
          { name: 'Social Science', sections: 18, periods: 6 },
          { name: 'Computer Science', sections: 18, periods: 2 },
          { name: 'Physical Education', sections: 18, periods: 3 },
          { name: 'Art and Music', sections: 18, periods: 2 },
        ],
        add: function () {
          this.subjects.push({ name: '', sections: 1, periods: 1 });
        },
        periodsFor: function (s) {
          return num(s.sections) * num(s.periods);
        },
        teachersFor: function (s) {
          return this.maxLoad > 0 ? Math.ceil(this.periodsFor(s) / num(this.maxLoad) - 1e-9) : 0;
        },
        get totalPeriods() {
          var self = this;
          return this.subjects.reduce(function (t, s) { return t + self.periodsFor(s); }, 0);
        },
        get specialists() {
          var self = this;
          return this.subjects.reduce(function (t, s) { return t + self.teachersFor(s); }, 0);
        },
        get withReserve() {
          return Math.ceil(this.specialists * (1 + num(this.reserve) / 100) - 1e-9);
        },
      };
    });

    Alpine.data('rteSeats', function () {
      return {
        entry: 'Class 1', sections: 4, seats: 40, perChild: 0, fee: 0,
        get total() {
          return Math.max(0, num(this.sections)) * Math.max(0, num(this.seats));
        },
        get perSection() {
          return Math.ceil(Math.max(0, num(this.seats)) * 0.25 - 1e-9);
        },
        get reserved() {
          return this.perSection * Math.max(0, Math.round(num(this.sections)));
        },
        get reimbursePerChild() {
          var a = num(this.perChild);
          var b = num(this.fee);
          return a && b ? Math.min(a, b) : a || b;
        },
      };
    });

    // ------------------------------------------------------------ grades

    Alpine.data('marksPercent', function () {
      return {
        subjects: [
          { name: 'English', got: 86, max: 100 },
          { name: 'Hindi', got: 78, max: 100 },
          { name: 'Mathematics', got: 92, max: 100 },
          { name: 'Science', got: 88, max: 100 },
          { name: 'Social Science', got: 81, max: 100 },
          { name: 'Information Technology', got: 95, max: 100 },
        ],
        add: function () {
          this.subjects.push({ name: '', got: 0, max: 100 });
        },
        pct: function (s) {
          return num(s.max) > 0 ? (num(s.got) / num(s.max)) * 100 : 0;
        },
        grade: function (s) {
          return gradeFor(this.pct(s))[1];
        },
        get got() {
          return this.subjects.reduce(function (t, s) { return t + num(s.got); }, 0);
        },
        get max() {
          return this.subjects.reduce(function (t, s) { return t + num(s.max); }, 0);
        },
        get overall() {
          return this.max > 0 ? (this.got / this.max) * 100 : 0;
        },
        get bestFive() {
          var self = this;
          var top = this.subjects.filter(function (s) { return num(s.max) > 0; }).sort(function (a, b) { return self.pct(b) - self.pct(a); }).slice(0, 5);
          var got = top.reduce(function (t, s) { return t + num(s.got); }, 0);
          var max = top.reduce(function (t, s) { return t + num(s.max); }, 0);
          return { pct: max ? (got / max) * 100 : 0, names: top.map(function (s) { return s.name || 'Unnamed'; }), count: top.length };
        },
      };
    });

    Alpine.data('cgpaConvert', function (mode) {
      return {
        mode: mode, value: mode === 'toPercent' ? 8.6 : 85.5, factor: 9.5,
        get result() {
          var f = num(this.factor) || 9.5;
          return this.mode === 'toPercent' ? num(this.value) * f : Math.min(10, num(this.value) / f);
        },
        get table() {
          var f = num(this.factor) || 9.5;
          var out = [];
          if (this.mode === 'toPercent') {
            for (var c = 100; c >= 40; c -= 2) out.push([fmt(c / 10, 1, true), fmt((c / 10) * f, 2)]);
          } else {
            for (var p = 95; p >= 40; p -= 2.5) out.push([fmt(p, 1) + '%', fmt(Math.min(10, p / f), 2, true)]);
          }
          return out;
        },
      };
    });

    Alpine.data('cgpa', function () {
      return {
        useMarks: false, grades: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D', 'E1', 'E2'],
        subjects: [
          { name: 'English', grade: 'A1', marks: 93 },
          { name: 'Hindi', grade: 'A2', marks: 84 },
          { name: 'Mathematics', grade: 'A1', marks: 95 },
          { name: 'Science', grade: 'A2', marks: 88 },
          { name: 'Social Science', grade: 'B1', marks: 77 },
        ],
        add: function () {
          this.subjects.push({ name: '', grade: 'B1', marks: 75 });
        },
        gradeOf: function (s) {
          return this.useMarks ? gradeFor(num(s.marks), SCALES.cce9)[1] : s.grade;
        },
        pointOf: function (s) {
          var g = this.gradeOf(s);
          var row = SCALES.cce9.filter(function (x) { return x[1] === g; })[0];
          return row ? row[2] : 0;
        },
        get value() {
          var self = this;
          if (!this.subjects.length) return 0;
          return this.subjects.reduce(function (t, s) { return t + self.pointOf(s); }, 0) / this.subjects.length;
        },
        get needsImprovement() {
          var self = this;
          return this.subjects.filter(function (s) { return /^E/.test(self.gradeOf(s)); }).length;
        },
      };
    });

    Alpine.data('gpa', function () {
      return {
        letters: Object.keys(GPA_POINTS), prevGpa: '', prevCredits: '',
        courses: [
          { name: 'English', grade: 'A', credits: 4 },
          { name: 'Mathematics', grade: 'B+', credits: 4 },
          { name: 'Physics', grade: 'A-', credits: 3 },
          { name: 'Chemistry', grade: 'B', credits: 3 },
          { name: 'Computer Science', grade: 'A+', credits: 2 },
        ],
        add: function () {
          this.courses.push({ name: '', grade: 'B', credits: 3 });
        },
        pointsFor: function (c) {
          return GPA_POINTS[c.grade] * num(c.credits);
        },
        get credits() {
          return this.courses.reduce(function (t, c) { return t + num(c.credits); }, 0);
        },
        get points() {
          var self = this;
          return this.courses.reduce(function (t, c) { return t + self.pointsFor(c); }, 0);
        },
        get term() {
          return this.credits > 0 ? this.points / this.credits : 0;
        },
        get cumulative() {
          var pc = num(this.prevCredits);
          var total = pc + this.credits;
          return total > 0 ? (num(this.prevGpa) * pc + this.points) / total : 0;
        },
      };
    });

    Alpine.data('finalGrade', function () {
      return {
        current: 78, weight: 40, target: 80, whatIf: 75,
        need: function (target) {
          var w = num(this.weight) / 100;
          return w > 0 ? (num(target) - num(this.current) * (1 - w)) / w : NaN;
        },
        get required() {
          return this.need(this.target);
        },
        get overall() {
          var w = num(this.weight) / 100;
          return num(this.current) * (1 - w) + num(this.whatIf) * w;
        },
        get table() {
          var self = this;
          return [[90, 'A'], [80, 'B'], [70, 'C'], [60, 'D'], [50, 'Pass (50%)'], [33, 'Pass (33%)']].map(function (x) {
            return { target: x[0], label: x[1], need: self.need(x[0]) };
          });
        },
      };
    });

    Alpine.data('weighted', function () {
      return {
        parts: [
          { name: 'Periodic tests', score: 17, max: 20, weight: 10 },
          { name: 'Notebook and portfolio', score: 4, max: 5, weight: 5 },
          { name: 'Subject enrichment', score: 4.5, max: 5, weight: 5 },
          { name: 'Half-yearly exam', score: 62, max: 80, weight: 30 },
          { name: 'Annual exam', score: 68, max: 80, weight: 50 },
        ],
        add: function () {
          this.parts.push({ name: '', score: 0, max: 100, weight: 10 });
        },
        pct: function (p) {
          return num(p.max) > 0 ? (num(p.score) / num(p.max)) * 100 : 0;
        },
        get totalWeight() {
          return this.parts.reduce(function (t, p) { return t + num(p.weight); }, 0);
        },
        get overall() {
          var self = this;
          var w = this.totalWeight;
          return w > 0 ? this.parts.reduce(function (t, p) { return t + self.pct(p) * num(p.weight); }, 0) / w : 0;
        },
        get grade() {
          return gradeFor(this.overall)[1];
        },
      };
    });

    Alpine.data('marksToGrade', function () {
      return {
        scheme: 'cbse8', max: 80,
        custom: SCALES.cbse8.map(function (r) { return { min: r[0], grade: r[1] }; }),
        sheet: 'Name\tMarks\nAarav Sharma\t71\nDiya Patel\t58\nIshaan Reddy\t77\nMeera Nair\t44\nKabir Singh\t29\nAnanya Iyer\t66\nRohan Das\t35\nSara Khan\t62',
        get scale() {
          if (this.scheme !== 'custom') return SCALES[this.scheme];
          return this.custom.map(function (r) { return [num(r.min), r.grade, 0]; }).sort(function (a, b) { return b[0] - a[0]; });
        },
        get rows() {
          var max = num(this.max);
          var scale = this.scale;
          return parseTable(this.sheet).filter(function (r) { return r.length > 1 && isNumber(r[1]); }).map(function (r) {
            var pct = max > 0 ? (num(r[1]) / max) * 100 : 0;
            return { name: r[0], marks: num(r[1]), pct: pct, grade: gradeFor(pct, scale)[1] };
          });
        },
        get distribution() {
          var rows = this.rows;
          return this.scale.map(function (s) {
            var count = rows.filter(function (r) { return r.grade === s[1]; }).length;
            return { grade: s[1], count: count, share: rows.length ? (count / rows.length) * 100 : 0 };
          });
        },
        addBand: function () {
          this.custom.push({ min: 0, grade: '' });
        },
        load: function (evt) {
          var self = this;
          var file = evt.target.files[0];
          if (file) readText(file).then(function (t) { self.sheet = t; });
          evt.target.value = '';
        },
        csv: function () {
          downloadCsv('grades.csv', [['Name', 'Marks', 'Percentage', 'Grade']].concat(this.rows.map(function (r) { return [r.name, r.marks, r.pct.toFixed(2), r.grade]; })));
        },
      };
    });

    Alpine.data('resultAnalysis', function () {
      return {
        title: 'Class 9A · Half-yearly examination 2026–27', max: 100, pass: 33,
        sheet: 'Name\tEnglish\tHindi\tMathematics\tScience\tSocial Science\nAarav Sharma\t78\t71\t88\t82\t75\nDiya Patel\t91\t86\t79\t88\t90\nIshaan Reddy\t64\t58\t41\t55\t62\nMeera Nair\t85\t90\t95\t93\t87\nKabir Singh\t52\t47\t28\t39\t50\nAnanya Iyer\t73\t80\t67\t71\t69\nRohan Das\t45\t38\t31\t36\t44\nSara Khan\t88\t82\t91\t86\t84\nVivaan Gupta\t69\t61\t58\t63\t66\nZara Ali\t57\t66\t AB\t49\t60',
        get parsed() {
          var rows = parseTable(this.sheet);
          if (rows.length < 2) return { subjects: [], students: [] };
          var header = rows[0];
          var subjects = header.slice(1).map(function (h, i) { return h || 'Subject ' + (i + 1); });
          var students = rows.slice(1).filter(function (r) { return r[0]; }).map(function (r) {
            return { name: r[0], marks: subjects.map(function (_, i) { var v = (r[i + 1] || '').trim(); return isNumber(v) ? num(v) : null; }) };
          });
          return { subjects: subjects, students: students };
        },
        get students() {
          var max = num(this.max) || 100;
          var passMark = (num(this.pass) / 100) * max;
          var subjects = this.parsed.subjects;
          var list = this.parsed.students.map(function (s) {
            var total = 0;
            var failed = 0;
            s.marks.forEach(function (m) { if (m == null || m < passMark) failed++; total += m || 0; });
            var pct = subjects.length ? (total / (max * subjects.length)) * 100 : 0;
            return { name: s.name, marks: s.marks, total: total, pct: pct, failed: failed, passed: failed === 0, grade: gradeFor(pct)[1] };
          });
          var sorted = list.slice().sort(function (a, b) { return b.total - a.total; });
          sorted.forEach(function (s, i) { s.rank = i > 0 && sorted[i - 1].total === s.total ? sorted[i - 1].rank : i + 1; });
          return list;
        },
        get summary() {
          var st = this.students;
          var passed = st.filter(function (s) { return s.passed; }).length;
          var avg = st.length ? st.reduce(function (t, s) { return t + s.pct; }, 0) / st.length : 0;
          return { appeared: st.length, passed: passed, failed: st.length - passed, passPct: st.length ? (passed / st.length) * 100 : 0, average: avg, highest: st.reduce(function (m, s) { return Math.max(m, s.pct); }, 0) };
        },
        get toppers() {
          return this.students.slice().sort(function (a, b) { return a.rank - b.rank; }).slice(0, 5);
        },
        get subjectStats() {
          var max = num(this.max) || 100;
          var passMark = (num(this.pass) / 100) * max;
          var students = this.students;
          return this.parsed.subjects.map(function (name, i) {
            var marks = students.map(function (s) { return { name: s.name, m: s.marks[i] }; }).filter(function (x) { return x.m != null; });
            var sum = marks.reduce(function (t, x) { return t + x.m; }, 0);
            var top = marks.reduce(function (b, x) { return !b || x.m > b.m ? x : b; }, null);
            var low = marks.reduce(function (b, x) { return !b || x.m < b.m ? x : b; }, null);
            var passed = marks.filter(function (x) { return x.m >= passMark; }).length;
            return {
              name: name, appeared: marks.length, absent: students.length - marks.length,
              average: marks.length ? sum / marks.length : 0, top: top, low: low,
              passPct: marks.length ? (passed / marks.length) * 100 : 0,
            };
          });
        },
        get bands() {
          var st = this.students;
          return [['90% and above', 90, 101], ['75–89.99%', 75, 90], ['60–74.99%', 60, 75], ['45–59.99%', 45, 60], ['33–44.99%', 33, 45], ['Below 33%', -1, 33]].map(function (b) {
            var count = st.filter(function (s) { return s.pct >= b[1] && s.pct < b[2]; }).length;
            return { label: b[0], count: count, share: st.length ? (count / st.length) * 100 : 0 };
          });
        },
        load: function (evt) {
          var self = this;
          var file = evt.target.files[0];
          if (file) readText(file).then(function (t) { self.sheet = t; });
          evt.target.value = '';
        },
        csv: function () {
          var subjects = this.parsed.subjects;
          downloadCsv('result-analysis.csv', [['Rank', 'Name'].concat(subjects, ['Total', 'Percentage', 'Grade', 'Subjects below pass', 'Result'])].concat(this.students.map(function (s) {
            return [s.rank, s.name].concat(s.marks.map(function (m) { return m == null ? 'AB' : m; }), [s.total, s.pct.toFixed(2), s.grade, s.failed, s.passed ? 'Pass' : 'Fail']);
          })));
        },
      };
    });

    Alpine.data('promotion', function () {
      return {
        title: 'Class 8 · Promotion list 2026–27', minPct: 33, minAttendance: 75, maxCompartment: 2,
        sheet: 'Name\tOverall %\tSubjects failed\tAttendance %\nAarav Sharma\t78.4\t0\t92\nDiya Patel\t86.2\t0\t95\nIshaan Reddy\t41.5\t1\t81\nMeera Nair\t91.0\t0\t97\nKabir Singh\t29.8\t4\t68\nAnanya Iyer\t66.3\t0\t88\nRohan Das\t36.2\t2\t79\nSara Khan\t72.9\t0\t71\nVivaan Gupta\t58.1\t0\t90',
        get students() {
          var self = this;
          return parseTable(this.sheet).filter(function (r) { return r.length > 1 && isNumber(r[1]); }).map(function (r) {
            var s = { name: r[0], pct: num(r[1]), failed: Math.round(num(r[2])), attendance: isNumber(r[3]) ? num(r[3]) : 100 };
            if (s.attendance < num(self.minAttendance)) { s.status = 'detained'; s.reason = 'Attendance below ' + self.minAttendance + '%'; }
            else if (s.failed === 0 && s.pct >= num(self.minPct)) { s.status = 'promoted'; s.reason = ''; }
            else if (s.failed > 0 && s.failed <= num(self.maxCompartment) && s.pct >= num(self.minPct)) { s.status = 'compartment'; s.reason = s.failed + (s.failed === 1 ? ' subject' : ' subjects') + ' for supplementary exam'; }
            else { s.status = 'detained'; s.reason = s.pct < num(self.minPct) ? 'Overall below ' + self.minPct + '%' : s.failed + ' subjects failed'; }
            return s;
          });
        },
        group: function (status) {
          return this.students.filter(function (s) { return s.status === status; });
        },
        load: function (evt) {
          var self = this;
          var file = evt.target.files[0];
          if (file) readText(file).then(function (t) { self.sheet = t; });
          evt.target.value = '';
        },
        csv: function () {
          downloadCsv('promotion-list.csv', [['Name', 'Overall %', 'Subjects failed', 'Attendance %', 'Decision', 'Reason']].concat(this.students.map(function (s) {
            return [s.name, s.pct, s.failed, s.attendance, cap(s.status), s.reason];
          })));
        },
      };
    });

    // ------------------------------------------------------------ documents

    Alpine.data('tc', function () {
      return {
        f: {
          tcNo: 'TC/2026/045', admNo: '2019/0312', name: 'Riya Menon', mother: 'Lakshmi Menon', father: 'Suresh Menon',
          nationality: 'Indian', category: 'General', dob: '2012-08-15', admissionDate: '2019-06-03', admissionClass: 'Class 2',
          lastClass: 'Class 8 (in figures: VIII)', lastExam: 'Annual examination 2025–26, CBSE', failed: 'No', subjects: 'English, Hindi, Mathematics, Science, Social Science, Computer Science',
          promoted: 'Yes, to Class 9', feesPaid: 'March 2026', concession: 'None', workingDays: 220, present: 204,
          ncc: 'No', games: 'Football, athletics', conduct: 'Good', applicationDate: '2026-04-02', leavingDate: '2026-03-31',
          issueDate: '2026-04-06', reason: 'Parents relocating to another city', remarks: 'None',
        },
        get rows() {
          var f = this.f;
          return [
            ['Name of pupil', f.name],
            ['Mother’s name', f.mother],
            ['Father’s or guardian’s name', f.father],
            ['Nationality', f.nationality],
            ['Whether the pupil belongs to SC, ST or OBC', f.category],
            ['Date of birth according to the admission register (in figures)', shortDate(f.dob)],
            ['Date of birth (in words)', dateInWords(f.dob)],
            ['Date of first admission in the school, with class', [shortDate(f.admissionDate), f.admissionClass].filter(Boolean).join(', ')],
            ['Class in which the pupil last studied', f.lastClass],
            ['School or board examination last taken, with result', f.lastExam],
            ['Whether failed, if so once or twice in the same class', f.failed],
            ['Subjects studied', f.subjects],
            ['Whether qualified for promotion to a higher class', f.promoted],
            ['Month up to which school dues have been paid', f.feesPaid],
            ['Any fee concession availed, and its nature', f.concession],
            ['Total number of working days', f.workingDays],
            ['Total number of working days present', f.present],
            ['Whether NCC cadet, Boy Scout or Girl Guide', f.ncc],
            ['Games played or extra-curricular activities', f.games],
            ['General conduct', f.conduct],
            ['Date of application for certificate', shortDate(f.applicationDate)],
            ['Date on which pupil’s name was struck off the rolls', shortDate(f.leavingDate)],
            ['Date of issue of certificate', shortDate(f.issueDate)],
            ['Reason for leaving the school', f.reason],
            ['Any other remarks', f.remarks],
          ];
        },
      };
    });

    var PURPOSES = {
      scholarship: 'applying for a scholarship',
      bank: 'opening a bank account',
      passport: 'applying for a passport',
      aadhaar: 'Aadhaar enrolment or update',
      pass: 'obtaining a bus or railway concession pass',
      exam: 'registering for a competitive examination',
      sports: 'taking part in sports competitions',
      other: '',
    };

    Alpine.data('bonafide', function () {
      return {
        f: { certNo: 'BC/2026/118', name: 'Arjun Krishnan', gender: 'm', parent: 'Ramesh Krishnan', cls: 'Class 7', section: 'B', admNo: '2020/0457', year: '2026–27', dob: '2014-01-22', purpose: 'scholarship', otherPurpose: '', date: iso(new Date()) },
        get p() {
          return PRONOUNS[this.f.gender];
        },
        get purposeText() {
          return this.f.purpose === 'other' ? this.f.otherPurpose || '…' : PURPOSES[this.f.purpose];
        },
        get body() {
          var f = this.f;
          var p = this.p;
          return [
            'This is to certify that ' + (f.name || '…') + ', ' + p.rel + ' of ' + (f.parent || '…') + ', is a bonafide student of this school, studying in ' + (f.cls || '…') + (f.section ? ', Section ' + f.section : '') + ' during the academic year ' + (f.year || '…') + '.',
            cap(p.pos) + ' admission number is ' + (f.admNo || '…') + ', and ' + p.pos + ' date of birth as recorded in the school register is ' + longDate(f.dob) + ' (' + dateInWords(f.dob) + ').',
            'This certificate is issued on request for the purpose of ' + this.purposeText + '.',
          ];
        },
      };
    });

    Alpine.data('character', function () {
      return {
        f: { certNo: 'CC/2026/032', name: 'Riya Menon', gender: 'f', parent: 'Suresh Menon', from: '2019', to: '2026', lastClass: 'Class 8', admNo: '2019/0312', conduct: 'very good', date: iso(new Date()) },
        get body() {
          var f = this.f;
          var p = PRONOUNS[f.gender];
          return [
            'This is to certify that ' + (f.name || '…') + ', ' + p.rel + ' of ' + (f.parent || '…') + ', was a student of this school from ' + (f.from || '…') + ' to ' + (f.to || '…') + ', and last studied in ' + (f.lastClass || '…') + '. ' + cap(p.pos) + ' admission number was ' + (f.admNo || '…') + '.',
            'To the best of our knowledge, ' + p.sub + ' bore a good moral character during this period, and ' + p.pos + ' conduct was ' + f.conduct + '. ' + cap(p.sub) + ' did not take part in any activity against the discipline of the school.',
            'We wish ' + (f.gender === 'x' ? 'them' : p.pos === 'her' ? 'her' : 'him') + ' every success in the future.',
          ];
        },
      };
    });

    Alpine.data('feeReceipt', function () {
      return {
        copies: 2, modes: ['Cash', 'UPI', 'Card', 'Cheque', 'Demand draft', 'Bank transfer'],
        f: { no: '2026/1482', date: iso(new Date()), name: 'Aarav Sharma', cls: 'Class 6 A', admNo: '2021/0198', parent: 'Vikram Sharma', period: 'Term 2 (October–December 2026)', mode: 'UPI', ref: 'UPI 6283 5519 0247', discount: 1500, late: 0, cashier: '' },
        heads: [
          { name: 'Tuition fee', amount: 9600 },
          { name: 'Computer fee', amount: 900 },
          { name: 'Transport fee', amount: 4500 },
          { name: 'Activity fee', amount: 600 },
        ],
        add: function () {
          this.heads.push({ name: '', amount: 0 });
        },
        get subtotal() {
          return this.heads.reduce(function (t, h) { return t + num(h.amount); }, 0);
        },
        get total() {
          return Math.max(0, this.subtotal - num(this.f.discount) + num(this.f.late));
        },
        get labels() {
          return this.copies === 2 ? ['School copy', 'Parent copy'] : ['Receipt'];
        },
      };
    });

    Alpine.data('reportCard', function () {
      return {
        f: { name: 'Meera Nair', cls: 'Class 8 B', roll: '17', admNo: '2020/0233', dob: '2013-05-09', parent: 'Anil Nair', year: '2026–27', t1Max: 100, t2Max: 100, present: 201, working: 214, remarks: 'Meera is attentive and curious. She should keep up her reading habit and take part in more group discussions.', result: 'Promoted to Class 9' },
        subjects: [
          { name: 'English', t1: 84, t2: 89 },
          { name: 'Hindi', t1: 78, t2: 82 },
          { name: 'Mathematics', t1: 91, t2: 95 },
          { name: 'Science', t1: 88, t2: 90 },
          { name: 'Social Science', t1: 80, t2: 86 },
          { name: 'Computer Science', t1: 93, t2: 96 },
        ],
        coScholastic: [
          { area: 'Work education', grade: 'A' },
          { area: 'Art education', grade: 'A' },
          { area: 'Health and physical education', grade: 'B' },
          { area: 'Discipline', grade: 'A' },
        ],
        add: function () {
          this.subjects.push({ name: '', t1: 0, t2: 0 });
        },
        get twoTerms() {
          return num(this.f.t2Max) > 0;
        },
        total: function (s) {
          return num(s.t1) + (this.twoTerms ? num(s.t2) : 0);
        },
        get subjectMax() {
          return num(this.f.t1Max) + num(this.f.t2Max);
        },
        pct: function (s) {
          return this.subjectMax ? (this.total(s) / this.subjectMax) * 100 : 0;
        },
        grade: function (s) {
          return gradeFor(this.pct(s))[1];
        },
        get grandTotal() {
          var self = this;
          return this.subjects.reduce(function (t, s) { return t + self.total(s); }, 0);
        },
        get grandMax() {
          return this.subjectMax * this.subjects.length;
        },
        get overall() {
          return this.grandMax ? (this.grandTotal / this.grandMax) * 100 : 0;
        },
        get attendancePct() {
          return num(this.f.working) ? (num(this.f.present) / num(this.f.working)) * 100 : 0;
        },
      };
    });

    Alpine.data('idCard', function () {
      return {
        copies: 4,
        // Front and back side by side, one pair per row, repeated for each copy.
        printCards: function () {
          var cards = this.$root.querySelectorAll('#id-preview .id-card');
          var sheet = document.createElement('div');
          sheet.style.cssText = 'display:grid;grid-template-columns:repeat(2,85.6mm);gap:5mm 4mm;';
          for (var i = 0; i < Math.max(1, Math.min(8, Math.round(num(this.copies)))); i++) {
            cards.forEach(function (c) { sheet.appendChild(c.cloneNode(true)); });
          }
          printElement(sheet);
        },
        f: { name: 'Ananya Iyer', cls: 'Class 5 C', admNo: '2022/0871', dob: '2016-11-03', blood: 'B+', parent: 'Karthik Iyer', phone: '+91 98400 12345', address: '14, 2nd Cross Street, Adyar, Chennai 600020', valid: '2026–27', photo: '' },
        pickPhoto: function (evt) {
          var self = this;
          var file = evt.target.files[0];
          evt.target.value = '';
          if (file) readImage(file, 480).then(function (url) { self.f.photo = url; });
        },
        get initials() {
          return (this.f.name || '?').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
        },
      };
    });

    Alpine.data('circular', function () {
      return {
        template: 'ptm',
        f: { ref: 'CIR/2026–27/054', date: iso(new Date()), to: 'Parents of Classes 1 to 8', subject: CIRCULARS.ptm.subject, body: CIRCULARS.ptm.body, sign: '', designation: 'Principal' },
        useTemplate: function () {
          var t = CIRCULARS[this.template];
          this.f.subject = t.subject;
          this.f.body = t.body;
        },
        get paragraphs() {
          return String(this.f.body || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
        },
      };
    });

    // ------------------------------------------------------------ planning

    Alpine.data('academicCalendar', function () {
      return {
        title: 'Academic calendar 2026–27', year: 2026, month: 3, saturdays: '24',
        events: '2026-04-01 | event | School reopens\n2026-05-01 to 2026-05-31 | holiday | Summer vacation\n2026-07-24 to 2026-07-31 | exam | Periodic test 1\n2026-08-15 | holiday | Independence Day\n2026-09-21 to 2026-09-30 | exam | Half-yearly exams\n2026-10-02 | holiday | Gandhi Jayanti\n2026-10-10 | event | Parent–teacher meeting\n2026-10-19 to 2026-10-23 | holiday | Diwali break\n2026-11-14 | event | Children’s Day\n2026-12-19 | event | Annual Day\n2026-12-24 to 2027-01-01 | holiday | Winter vacation\n2027-01-26 | holiday | Republic Day\n2027-02-15 to 2027-02-26 | exam | Annual exams\n2027-03-31 | event | Result day',
        monthNames: MONTHS,
        get parsed() {
          return parseDatedLines(this.events).map(function (e) {
            var type = (e.parts[0] || '').toLowerCase();
            var known = /holiday|exam|event|ptm/.test(type);
            return {
              from: e.from, to: e.to,
              type: /holiday/.test(type) ? 'holiday' : /exam/.test(type) ? 'exam' : 'event',
              title: (known ? e.parts.slice(1) : e.parts).join(' ') || 'Event',
            };
          });
        },
        get months() {
          var events = this.parsed;
          var sat = this.saturdays;
          var marks = {};
          events.forEach(function (e) { eachDay(e.from, e.to, function (d) { var k = iso(d); if (!marks[k] || e.type === 'holiday') marks[k] = e.type; }); });
          var out = [];
          for (var i = 0; i < 12; i++) {
            var first = new Date(num(this.year), num(this.month) + i, 1);
            var last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
            var cells = [];
            for (var b = 0; b < (first.getDay() + 6) % 7; b++) cells.push(null);
            var working = 0;
            eachDay(first, last, function (d) {
              var off = isWeeklyOff(d, sat);
              var mark = marks[iso(d)] || (off ? 'off' : '');
              if (!off && mark !== 'holiday') working++;
              cells.push({ day: d.getDate(), mark: mark });
            });
            var list = events.filter(function (e) { return e.from <= last && e.to >= first; }).sort(function (a, b) { return a.from - b.from; }).map(function (e) {
              var same = e.from.getTime() === e.to.getTime();
              var when = same ? e.from.getDate() + '' : e.from.getMonth() === e.to.getMonth() ? e.from.getDate() + '–' + e.to.getDate() : shortDate(e.from).slice(0, 6) + ' – ' + shortDate(e.to).slice(0, 6);
              return { when: when, title: e.title, type: e.type };
            });
            out.push({ name: MONTHS[first.getMonth()] + ' ' + first.getFullYear(), cells: cells, working: working, events: list });
          }
          return out;
        },
        get totalWorking() {
          return this.months.reduce(function (t, m) { return t + m.working; }, 0);
        },
      };
    });

    Alpine.data('dateSheet', function () {
      return {
        title: 'Half-yearly examination 2026–27', classes: 'Classes 6 to 8', start: '2026-09-21', gap: 1, saturdayOff: false,
        time: '9:00 am – 12:00 pm', holidays: '2026-10-02 | Gandhi Jayanti',
        subjects: 'English\nMathematics\nHindi\nScience\nSocial Science\nComputer Science',
        note: 'Students must report by 8:30 am with their admit card. School closes at 12:30 pm on exam days.',
        get schedule() {
          var start = parseDate(this.start);
          if (!start) return [];
          var off = {};
          parseDatedLines(this.holidays).forEach(function (h) { eachDay(h.from, h.to, function (d) { off[iso(d)] = true; }); });
          var satOff = this.saturdayOff;
          function isOff(d) { return d.getDay() === 0 || (satOff && d.getDay() === 6) || off[iso(d)]; }
          function nextSchoolDay(d) { do { d = addDays(d, 1); } while (isOff(d)); return d; }
          var d = isOff(start) ? nextSchoolDay(start) : start;
          var gap = Math.max(0, Math.round(num(this.gap)));
          return lines(this.subjects).map(function (subject, i) {
            if (i > 0) for (var g = 0; g <= gap; g++) d = nextSchoolDay(d);
            return { n: i + 1, date: shortDate(d), day: DAYS[d.getDay()], subject: subject };
          });
        },
      };
    });

    Alpine.data('timetable', function () {
      return {
        title: 'Class 7 A · Timetable 2026–27', days: 6, periods: 8, start: '08:00', length: 40, break1After: 3, break1: 15, break2After: 6, break2: 30,
        subjects: [
          { name: 'English', teacher: 'Ms Priya', periods: 7 },
          { name: 'Mathematics', teacher: 'Mr Rahul', periods: 7 },
          { name: 'Science', teacher: 'Ms Fatima', periods: 7 },
          { name: 'Social Science', teacher: 'Mr Joseph', periods: 6 },
          { name: 'Hindi', teacher: 'Ms Kavita', periods: 6 },
          { name: 'Tamil', teacher: 'Mr Senthil', periods: 4 },
          { name: 'Computer', teacher: 'Ms Neha', periods: 3 },
          { name: 'Physical Education', teacher: 'Mr Arun', periods: 4 },
          { name: 'Art', teacher: 'Ms Divya', periods: 2 },
          { name: 'Library', teacher: 'Ms Rekha', periods: 2 },
        ],
        grid: [],
        unplaced: [],
        dayNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        init: function () {
          this.generate();
        },
        add: function () {
          this.subjects.push({ name: '', teacher: '', periods: 1 });
        },
        remove: function (i) {
          this.subjects.splice(i, 1);
          this.grid = this.grid.map(function (row) { return row.map(function (c) { return c === i ? -1 : c > i ? c - 1 : c; }); });
        },
        get slots() {
          return Math.max(1, num(this.days)) * Math.max(1, num(this.periods));
        },
        get demand() {
          return this.subjects.reduce(function (t, s) { return t + Math.max(0, Math.round(num(s.periods))); }, 0);
        },
        generate: function () {
          var D = Math.min(6, Math.max(1, Math.round(num(this.days))));
          var P = Math.min(12, Math.max(1, Math.round(num(this.periods))));
          var left = this.subjects.map(function (s) { return Math.max(0, Math.round(num(s.periods))); });
          var grid = [];
          for (var d = 0; d < D; d++) {
            var used = left.map(function () { return 0; });
            var caps = left.map(function (l) { return Math.ceil(l / (D - d)); });
            var row = [];
            for (var p = 0; p < P; p++) {
              var best = -1;
              var bestScore = Infinity;
              for (var i = 0; i < left.length; i++) {
                if (!left[i]) continue;
                var score = (used[i] >= caps[i] ? 1000 : 0) + (row[p - 1] === i ? 100 : 0) - left[i] * 2 + Math.random();
                if (score < bestScore) { bestScore = score; best = i; }
              }
              if (best > -1) { left[best]--; used[best]++; }
              row.push(best);
            }
            grid.push(row);
          }
          this.grid = grid;
          var subjects = this.subjects;
          this.unplaced = left.map(function (l, i) { return l ? (subjects[i].name || 'Unnamed') + ' (' + l + ')' : ''; }).filter(Boolean);
        },
        get times() {
          var t = toMinutes(this.start);
          var out = [];
          for (var p = 1; p <= num(this.periods); p++) {
            out.push(clock(t) + '–' + clock(t + num(this.length)));
            t += num(this.length);
            if (p === num(this.break1After)) t += num(this.break1);
            if (p === num(this.break2After)) t += num(this.break2);
          }
          return out;
        },
        cell: function (i) {
          return i > -1 && this.subjects[i] ? this.subjects[i] : null;
        },
        count: function (i) {
          var n = 0;
          this.grid.forEach(function (row) { row.forEach(function (c) { if (c === i) n++; }); });
          return n;
        },
      };
    });

    Alpine.data('bellSchedule', function () {
      return {
        start: '07:50', assembly: 20, periods: 8, length: 40, passing: 0,
        breaks: [{ after: 3, minutes: 15, label: 'Short break' }, { after: 5, minutes: 35, label: 'Lunch' }],
        addBreak: function () {
          this.breaks.push({ after: 1, minutes: 10, label: 'Break' });
        },
        get schedule() {
          var t = toMinutes(this.start);
          var rows = [];
          var periods = Math.min(14, Math.max(0, Math.round(num(this.periods))));
          if (num(this.assembly) > 0) { rows.push({ label: 'Assembly', from: clock(t), to: clock(t + num(this.assembly)), minutes: num(this.assembly), kind: 'other' }); t += num(this.assembly); }
          for (var p = 1; p <= periods; p++) {
            rows.push({ label: 'Period ' + p, from: clock(t), to: clock(t + num(this.length)), minutes: num(this.length), kind: 'period' });
            t += num(this.length);
            var after = this.breaks.filter(function (b) { return num(b.after) === p; });
            after.forEach(function (b) {
              rows.push({ label: b.label || 'Break', from: clock(t), to: clock(t + num(b.minutes)), minutes: num(b.minutes), kind: 'break' });
              t += num(b.minutes);
            });
            if (!after.length && p < periods) t += num(this.passing);
          }
          return { rows: rows, ends: clock(t) };
        },
        get teaching() {
          return Math.min(14, num(this.periods)) * num(this.length);
        },
      };
    });

    Alpine.data('seating', function () {
      return {
        title: 'Half-yearly examination 2026–27',
        classes: [
          { name: 'Class 9 A', prefix: '9A-', from: 1, to: 38 },
          { name: 'Class 10 A', prefix: '10A-', from: 1, to: 36 },
          { name: 'Class 11 Science', prefix: '11S-', from: 1, to: 30 },
        ],
        rooms: [
          { name: 'Room 101', rows: 6, cols: 6 },
          { name: 'Room 102', rows: 6, cols: 6 },
          { name: 'Room 103', rows: 6, cols: 6 },
        ],
        addClass: function () {
          this.classes.push({ name: 'Class', prefix: '', from: 1, to: 30 });
        },
        addRoom: function () {
          this.rooms.push({ name: 'Room ' + (this.rooms.length + 101), rows: 6, cols: 6 });
        },
        get plan() {
          var queues = this.classes.map(function (c, i) {
            var list = [];
            for (var r = Math.round(num(c.from)); r <= Math.round(num(c.to)) && list.length < 2000; r++) list.push(r);
            return { i: i, name: c.name || 'Class ' + (i + 1), prefix: c.prefix || '', list: list };
          });
          // Columns take classes in turn, so side-by-side neighbours sit different papers.
          // The class after the previous one that still has students goes next; the same class
          // repeats only when it is the last one left.
          var prev = -1;
          function nextClass() {
            var n = queues.length;
            for (var k = 1; k <= n; k++) {
              var q = queues[(prev + k + n) % n];
              if (q.list.length) return q;
            }
            return null;
          }
          var rooms = this.rooms.map(function (room) {
            var R = Math.max(1, Math.min(20, Math.round(num(room.rows))));
            var C = Math.max(1, Math.min(20, Math.round(num(room.cols))));
            var grid = [];
            for (var r = 0; r < R; r++) grid.push(new Array(C).fill(null));
            var seated = {};
            for (var c = 0; c < C; c++) {
              var q = nextClass();
              if (!q) break;
              prev = q.i;
              for (var r2 = 0; r2 < R; r2++) {
                if (!q.list.length) {
                  q = nextClass();
                  if (!q) break;
                  prev = q.i;
                }
                var roll = q.list.shift();
                grid[r2][c] = { label: q.prefix + roll, cls: q.i };
                (seated[q.i] = seated[q.i] || { name: q.name, prefix: q.prefix, rolls: [] }).rolls.push(roll);
              }
            }
            var door = Object.keys(seated).map(function (k) {
              var s = seated[k];
              var rolls = s.rolls.sort(function (a, b) { return a - b; });
              var ranges = [];
              rolls.forEach(function (n) {
                var last = ranges[ranges.length - 1];
                if (last && n === last[1] + 1) last[1] = n; else ranges.push([n, n]);
              });
              return { name: s.name, count: rolls.length, ranges: ranges.map(function (x) { return x[0] === x[1] ? s.prefix + x[0] : s.prefix + x[0] + ' to ' + s.prefix + x[1]; }).join(', ') };
            });
            return { name: room.name, grid: grid, door: door, seats: R * C, used: door.reduce(function (t, d) { return t + d.count; }, 0) };
          });
          var unseated = queues.reduce(function (t, q) { return t + q.list.length; }, 0);
          return { rooms: rooms, unseated: unseated };
        },
        get totalStudents() {
          return this.classes.reduce(function (t, c) { return t + Math.max(0, Math.round(num(c.to)) - Math.round(num(c.from)) + 1); }, 0);
        },
        get totalSeats() {
          return this.rooms.reduce(function (t, r) { return t + Math.max(0, Math.round(num(r.rows)) * Math.round(num(r.cols))); }, 0);
        },
      };
    });

    Alpine.data('groups', function () {
      return {
        names: 'Aarav\nDiya\nIshaan\nMeera\nKabir\nAnanya\nRohan\nSara\nVivaan\nZara\nAditya\nIra\nKrish\nNisha\nArjun\nPooja\nSamar\nTara\nYash\nLeela',
        mode: 'size', value: 4, result: [], picked: '',
        get list() {
          return lines(this.names);
        },
        make: function () {
          var list = shuffle(this.list);
          var n = list.length;
          var k = this.mode === 'size' ? Math.ceil(n / Math.max(1, num(this.value))) : Math.max(1, Math.min(n, Math.round(num(this.value))));
          var out = [];
          for (var i = 0; i < k; i++) out.push([]);
          list.forEach(function (name, i) { out[i % k].push(name); });
          this.result = out;
        },
        pick: function () {
          var list = this.list;
          this.picked = list.length ? list[Math.floor(Math.random() * list.length)] : '';
        },
      };
    });

    // ------------------------------------------------------------ compliance

    Alpine.data('checklist', function (key) {
      var storeKey = 'campy-tools:check:' + key;
      return {
        sections: CHECKLISTS[key],
        done: storage.get(storeKey) || {},
        init: function () {
          var self = this;
          this.$watch('done', function () { storage.set(storeKey, self.done); }, { deep: true });
        },
        id: function (s, i) {
          return s + '.' + i;
        },
        sectionScore: function (s) {
          var self = this;
          var sec = this.sections[s];
          var total = 0;
          var got = 0;
          sec.items.forEach(function (it, i) { total += it[1]; if (self.done[self.id(s, i)]) got += it[1]; });
          return total ? (got / total) * 100 : 0;
        },
        get score() {
          var self = this;
          var total = 0;
          var got = 0;
          this.sections.forEach(function (sec, s) { sec.items.forEach(function (it, i) { total += it[1]; if (self.done[self.id(s, i)]) got += it[1]; }); });
          return total ? (got / total) * 100 : 0;
        },
        get level() {
          var s = this.score;
          return s >= 90 ? 'Ready' : s >= 70 ? 'Nearly ready' : s >= 50 ? 'Needs work' : 'Not ready';
        },
        get gaps() {
          var self = this;
          var out = [];
          this.sections.forEach(function (sec, s) { sec.items.forEach(function (it, i) { if (!self.done[self.id(s, i)]) out.push({ text: it[0], weight: it[1], section: sec.title }); }); });
          return out.sort(function (a, b) { return b.weight - a.weight; });
        },
        all: function (value) {
          var self = this;
          var next = {};
          if (value) this.sections.forEach(function (sec, s) { sec.items.forEach(function (_, i) { next[self.id(s, i)] = true; }); });
          this.done = next;
        },
      };
    });

    Alpine.data('maturity', function () {
      var storeKey = 'campy-tools:maturity';
      return {
        dims: MATURITY,
        options: ['Not yet', 'Started', 'Mostly', 'Fully'],
        answers: storage.get(storeKey) || {},
        init: function () {
          var self = this;
          this.$watch('answers', function () { storage.set(storeKey, self.answers); }, { deep: true });
        },
        dimScore: function (d) {
          var self = this;
          var sum = 0;
          this.dims[d].questions.forEach(function (_, q) { sum += num(self.answers[d + '.' + q]); });
          return (sum / (this.dims[d].questions.length * 3)) * 100;
        },
        get answered() {
          return Object.keys(this.answers).length;
        },
        get total() {
          var self = this;
          return this.dims.reduce(function (t, _, d) { return t + self.dimScore(d); }, 0) / this.dims.length;
        },
        get level() {
          var s = this.total;
          return s >= 80 ? 'Leading' : s >= 55 ? 'Established' : s >= 30 ? 'Developing' : 'Beginning';
        },
        get weakest() {
          var self = this;
          return this.dims.map(function (d, i) { return { title: d.title, next: d.next, score: self.dimScore(i) }; }).filter(function (d) { return d.score < 67; }).sort(function (a, b) { return a.score - b.score; }).slice(0, 3);
        },
      };
    });

    Alpine.data('infrastructure', function () {
      return {
        students: 820, sections: 22, classrooms: 21, roomArea: 480, largest: 42, boys: 430, girls: 390, boysToilets: 9, girlsToilets: 8,
        norm: { area: 500, perStudent: 10.76, maxClass: 40, perToilet: 40 },
        facilities: [
          { name: 'Ramps and handrails for barrier-free access', has: true },
          { name: 'Toilet accessible to children with special needs', has: false },
          { name: 'Safe drinking water on every floor', has: true },
          { name: 'Library or reading room', has: true },
          { name: 'Playground', has: true },
          { name: 'Science laboratory', has: true },
          { name: 'Computer laboratory', has: true },
          { name: 'Boundary wall or fencing', has: true },
          { name: 'Fire extinguishers serviced, and a fire safety certificate', has: false },
          { name: 'Sick room and first aid kit', has: true },
          { name: 'CCTV at entrances and corridors', has: true },
          { name: 'Head teacher’s room and office-cum-store', has: true },
        ],
        get checks() {
          var avgClass = num(this.sections) ? num(this.students) / num(this.sections) : 0;
          var perStudent = avgClass ? num(this.roomArea) / avgClass : 0;
          var boysPer = num(this.boysToilets) ? num(this.boys) / num(this.boysToilets) : Infinity;
          var girlsPer = num(this.girlsToilets) ? num(this.girls) / num(this.girlsToilets) : Infinity;
          return [
            { name: 'A classroom for every section', value: this.classrooms + ' rooms for ' + this.sections + ' sections', ok: num(this.classrooms) >= num(this.sections), source: 'RTE and CBSE' },
            { name: 'Classroom size', value: fmt(num(this.roomArea), 0) + ' sq ft (' + fmt(num(this.roomArea) / 10.764, 1) + ' m²), norm ' + this.norm.area + ' sq ft', ok: num(this.roomArea) >= num(this.norm.area), source: 'CBSE: 8 m × 6 m' },
            { name: 'Space per student', value: fmt(perStudent, 1) + ' sq ft at an average of ' + fmt(avgClass, 0) + ' per section', ok: perStudent >= num(this.norm.perStudent), source: 'CBSE: 1 m² (10.76 sq ft)' },
            { name: 'Largest section size', value: this.largest + ' students, limit ' + this.norm.maxClass, ok: num(this.largest) <= num(this.norm.maxClass), source: 'CBSE' },
            { name: 'Boys per toilet', value: isFinite(boysPer) ? fmt(boysPer, 0) + ', target ' + this.norm.perToilet : 'No toilets entered', ok: boysPer <= num(this.norm.perToilet), source: 'Your planning target' },
            { name: 'Girls per toilet', value: isFinite(girlsPer) ? fmt(girlsPer, 0) + ', target ' + this.norm.perToilet : 'No toilets entered', ok: girlsPer <= num(this.norm.perToilet), source: 'Your planning target' },
          ];
        },
        get met() {
          return this.checks.filter(function (c) { return c.ok; }).length + this.facilities.filter(function (f) { return f.has; }).length;
        },
        get total() {
          return this.checks.length + this.facilities.length;
        },
      };
    });
  });
})();
