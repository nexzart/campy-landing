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
      if (normalisePath(new URL(link.href).pathname) === here) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  // Boosted links that point at /page#section scroll to the section once the page has swapped in.
  var pendingHash = '';
  document.addEventListener('htmx:beforeRequest', function (evt) {
    var elt = evt.detail.elt;
    if (elt.tagName === 'A' && !elt.hasAttribute('hx-get')) {
      pendingHash = elt.hash || '';
      window.dispatchEvent(new CustomEvent('close-menu'));
    }
  });

  document.addEventListener('htmx:afterSettle', function () {
    markActiveNav();
    if (pendingHash) {
      var target = document.querySelector(pendingHash);
      pendingHash = '';
      if (target) target.scrollIntoView();
    }
  });

  document.addEventListener('DOMContentLoaded', markActiveNav);

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
