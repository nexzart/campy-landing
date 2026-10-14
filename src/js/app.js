/* Campy landing – client behaviour (htmx + Alpine.js). Icons are inlined as SVG at build time. Loaded after htmx, before Alpine. */
(function () {
  // Back/forward does a fresh load instead of restoring a DOM snapshot, which keeps
  // Alpine components from initialising twice. Missing pages swap in like any other page.
  htmx.config.historyCacheSize = 0;
  htmx.config.refreshOnHistoryMiss = true;
  htmx.config.responseHandling = [
    { code: '204', swap: false },
    { code: '[23]..', swap: true },
    { code: '404', swap: true },
    { code: '[45]..', swap: false, error: true },
  ];

  function normalisePath(path) {
    path = path.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    return path.length > 1 ? path.replace(/\/$/, '') : path;
  }

  function markActiveNav() {
    var here = normalisePath(location.pathname);
    document.querySelectorAll('[data-nav]').forEach(function (link) {
      var path = normalisePath(new URL(link.href).pathname);
      if (path === here || (path !== '/' && here.indexOf(path + '/') === 0)) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  // Cloudflare Turnstile: every .campy-turnstile placeholder becomes a widget. The widget adds a
  // hidden cf-turnstile-response field that htmx sends with the form. Tokens are single use, so
  // the widget is reset after each request that leaves the form on the page (for example an error).
  function renderTurnstile() {
    if (!window.turnstile) return;
    document.querySelectorAll('.campy-turnstile:not([data-rendered])').forEach(function (el) {
      el.setAttribute('data-rendered', '');
      window.turnstile.render(el, {
        sitekey: el.getAttribute('data-sitekey'),
        appearance: el.getAttribute('data-appearance') || 'always',
        theme: 'light',
      });
    });
  }
  window.campyTurnstileReady = renderTurnstile;
  document.addEventListener('htmx:afterSettle', renderTurnstile);
  document.addEventListener('htmx:afterRequest', function (evt) {
    var form = evt.detail.elt;
    if (!window.turnstile || !form || form.tagName !== 'FORM' || !document.body.contains(form)) return;
    var widget = form.querySelector('.campy-turnstile[data-rendered]');
    if (widget) window.turnstile.reset(widget);
  });

  // Boosted links that point at /page#section scroll to the section once the page has swapped in.
  var pendingHash = '';
  document.addEventListener('htmx:beforeRequest', function (evt) {
    var elt = evt.detail.elt;
    if (elt.tagName === 'A' && !elt.hasAttribute('hx-get')) {
      pendingHash = elt.hash || '';
      window.dispatchEvent(new CustomEvent('close-menu'));
    }
  });

  // Tool pages need tools.js, and a boosted swap can't add scripts to <head>,
  // so the first tool page visited loads in full. After that, boosting works as usual.
  document.addEventListener('htmx:beforeRequest', function (evt) {
    var info = evt.detail.pathInfo;
    if (window.CampyTools || !info) return;
    var target = new URL(info.requestPath, location.href);
    if (target.origin === location.origin && /^\/tools\/./.test(target.pathname)) {
      evt.preventDefault();
      location.assign(target.href);
    }
  });

  // Auto-scrolling jump menus ([data-marquee]). The links are repeated until one copy is wider
  // than the menu, then that copy is doubled so a -50% slide loops without a seam. The extra
  // copies are hidden from screen readers and the tab order. Reduced motion keeps the plain row.
  var MARQUEE_SPEED = 28; // px per second
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function initMarquee(box) {
    var track = box.firstElementChild;
    var group = track.firstElementChild;
    if (!box._marqueeItems) {
      box._marqueeItems = Array.prototype.slice.call(group.children);
      // Tabbing to a link scrolls the menu to show it; undo that so the loop has no gap.
      box.addEventListener('focusout', function () { box.scrollLeft = 0; });
    }
    box.removeAttribute('data-ready');
    while (track.children.length > 1) track.removeChild(track.lastElementChild);
    group.replaceChildren.apply(group, box._marqueeItems);
    if (reduceMotion.matches) return;

    var hide = function (el) {
      el.setAttribute('aria-hidden', 'true');
      el.querySelectorAll('a').forEach(function (a) { a.tabIndex = -1; });
      return el;
    };
    for (var i = 0; group.scrollWidth < box.clientWidth && i < 10; i++) {
      box._marqueeItems.forEach(function (li) { group.appendChild(hide(li.cloneNode(true))); });
    }
    track.appendChild(hide(group.cloneNode(true)));
    box.style.setProperty('--marquee-duration', Math.round(group.scrollWidth / MARQUEE_SPEED) + 's');
    box.setAttribute('data-ready', '');
  }

  // Only new menus by default, so an unrelated htmx swap doesn't restart a running one.
  function initMarquees(all) {
    document.querySelectorAll(all === true ? '[data-marquee]' : '[data-marquee]:not([data-ready])').forEach(initMarquee);
  }
  function resetMarquees() { initMarquees(true); }

  var marqueeWidth = window.innerWidth;
  var marqueeTimer;
  window.addEventListener('resize', function () {
    if (window.innerWidth === marqueeWidth) return; // mobile URL bar show/hide
    marqueeWidth = window.innerWidth;
    clearTimeout(marqueeTimer);
    marqueeTimer = setTimeout(resetMarquees, 200);
  });
  reduceMotion.addEventListener('change', resetMarquees);
  document.addEventListener('DOMContentLoaded', initMarquees);

  document.addEventListener('htmx:afterSettle', function () {
    initMarquees();
    markActiveNav();
    if (pendingHash) {
      var target = document.querySelector(pendingHash);
      pendingHash = '';
      if (target) target.scrollIntoView();
    }
  });

  document.addEventListener('DOMContentLoaded', markActiveNav);

  // Cookie consent. The choice itself is essential storage; everything the free tools
  // remember counts as "preferences" and is only kept when the visitor allows it.
  var CONSENT_KEY = 'campy-consent';
  function readConsent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); } catch (e) { return null; }
  }
  window.campyConsent = function () {
    var c = readConsent();
    return { decided: !!c, preferences: !!(c && c.preferences), analytics: !!(c && c.analytics) };
  };
  function forgetPreferences() {
    try {
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf('campy-tools:') === 0) localStorage.removeItem(k); });
    } catch (e) { /* storage unavailable */ }
  }

  document.addEventListener('alpine:init', function () {
    var WINDOW_SECONDS = 14 * 60 + 32;

    // Hero demo: a period register with a 20-minute marking window and parent alerts.
    Alpine.data('register', function () {
      return {
        students: [
          { roll: 1, name: 'Aarav Sharma', present: true },
          { roll: 2, name: 'Diya Patel', present: false },
          { roll: 3, name: 'Ishaan Reddy', present: true },
          { roll: 4, name: 'Meera Nair', present: true },
          { roll: 5, name: 'Kabir Singh', present: true },
          { roll: 6, name: 'Ananya Iyer', present: true },
        ],
        submitted: false,
        secondsLeft: WINDOW_SECONDS,
        timer: null,
        today: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),

        init: function () {
          var self = this;
          this.timer = setInterval(function () {
            if (!self.submitted && self.secondsLeft > 0) self.secondsLeft--;
          }, 1000);
        },
        destroy: function () {
          clearInterval(this.timer);
        },
        get clock() {
          var m = Math.floor(this.secondsLeft / 60);
          var s = this.secondsLeft % 60;
          return m + ':' + String(s).padStart(2, '0');
        },
        get windowOpen() {
          return this.secondsLeft > 0;
        },
        get absentees() {
          return this.students.filter(function (s) { return !s.present; });
        },
        get presentCount() {
          return this.students.length - this.absentees.length;
        },
        toggle: function (student) {
          if (!this.submitted && this.windowOpen) student.present = !student.present;
        },
        submit: function () {
          this.submitted = true;
        },
        reset: function () {
          this.students.forEach(function (s) { s.present = s.roll !== 2; });
          this.submitted = false;
          this.secondsLeft = WINDOW_SECONDS;
        },
      };
    });

    Alpine.data('consent', function () {
      var saved = readConsent();
      return {
        banner: !saved,
        settings: false,
        preferences: !!(saved && saved.preferences),
        analytics: !!(saved && saved.analytics),
        save: function (preferences, analytics) {
          this.preferences = preferences;
          this.analytics = analytics;
          try {
            localStorage.setItem(CONSENT_KEY, JSON.stringify({ preferences: preferences, analytics: analytics, version: 1, at: new Date().toISOString() }));
          } catch (e) { /* private mode: the banner comes back next visit */ }
          if (!preferences) forgetPreferences();
          this.banner = false;
          this.settings = false;
          window.dispatchEvent(new CustomEvent('consent-changed', { detail: { preferences: preferences, analytics: analytics } }));
        },
        acceptAll: function () { this.save(true, true); },
        essentialOnly: function () { this.save(false, false); },
        saveChoices: function () { this.save(this.preferences, this.analytics); },
        openSettings: function () {
          var self = this;
          this.settings = true;
          this.$nextTick(function () { if (self.$refs.first) self.$refs.first.focus(); });
        },
        closeSettings: function () {
          this.settings = false;
        },
      };
    });

    // Pricing page: Essential plus chosen add-on modules, compared with the Professional plan.
    Alpine.data('planBuilder', function () {
      var el = document.getElementById('plan-builder-data');
      var data = el ? JSON.parse(el.textContent) : { base: 0, professional: 0, addons: [] };
      return {
        addons: data.addons,
        professional: data.professional,
        picked: {},
        get count() {
          var self = this;
          return this.addons.filter(function (a) { return self.picked[a.id]; }).length;
        },
        get total() {
          var self = this;
          return this.addons.reduce(function (sum, a) { return sum + (self.picked[a.id] ? a.price : 0); }, data.base);
        },
        rupees: function (n) {
          return '₹' + Math.round(n).toLocaleString('en-IN');
        },
      };
    });

    // Pricing page: what the 0.1% platform fee comes to for a year's fee collections.
    Alpine.data('platformFee', function () {
      return {
        collected: 5000000,
        percent: 0.1,
        get fee() {
          return (Math.max(0, Number(this.collected) || 0) * this.percent) / 100;
        },
        rupees: function (n) {
          return '₹' + Math.round(n).toLocaleString('en-IN');
        },
      };
    });

    // Free tools index: filter the cards by search text and category.
    Alpine.data('toolFinder', function () {
      return {
        q: '',
        match: function (el) {
          var words = this.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
          var text = el.getAttribute('data-search') || '';
          return words.every(function (w) { return text.indexOf(w) > -1; });
        },
        any: function (section) {
          var self = this;
          return Array.prototype.some.call(section.querySelectorAll('[data-search]'), function (el) { return self.match(el); });
        },
        get none() {
          var self = this;
          return !!this.q.trim() && !Array.prototype.some.call(document.querySelectorAll('[data-search]'), function (el) { return self.match(el); });
        },
      };
    });

    // Pricing page: what the flat annual fee works out to per student.
    Alpine.data('sizer', function () {
      return {
        students: 600,
        get count() {
          return Math.max(1, Math.round(this.students) || 1);
        },
        perStudent: function (annualFee) {
          return annualFee / this.count;
        },
        rupees: function (n) {
          return '₹' + Math.round(n).toLocaleString('en-IN');
        },
      };
    });
  });
})();
