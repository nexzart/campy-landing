/* Campy landing – custom dropdowns. Every <select> on the page, including ones Alpine or htmx add later,
   gets a styled button and listbox in its place. The native select stays in the DOM, hidden, so forms,
   x-model, @change handlers and required-field validation keep working. Loaded before Alpine. */
(function () {
  var syncs = new WeakMap();
  var queued = new Set();
  var uid = 0;
  var current = null; // the open dropdown's close function

  function schedule(select) {
    if (!select || !syncs.has(select) || queued.has(select)) return;
    queued.add(select);
    queueMicrotask(function () {
      queued.delete(select);
      syncs.get(select)();
    });
  }

  // x-model and :selected change the selection by setting properties, which fires no events.
  // Wrap those setters so the button text follows.
  function hook(proto, prop, selectOf) {
    var d = Object.getOwnPropertyDescriptor(proto, prop);
    Object.defineProperty(proto, prop, {
      configurable: true,
      enumerable: d.enumerable,
      get: d.get,
      set: function (v) {
        d.set.call(this, v);
        schedule(selectOf(this));
      },
    });
  }
  hook(HTMLSelectElement.prototype, 'value', function (el) { return el; });
  hook(HTMLSelectElement.prototype, 'selectedIndex', function (el) { return el; });
  hook(HTMLOptionElement.prototype, 'selected', function (el) { return el.closest('select'); });

  // The select's accessible name: its aria-label, or the text of its <label>s without the controls inside them.
  function nameOf(select) {
    var aria = select.getAttribute('aria-label');
    if (aria) return aria;
    return Array.prototype.map.call(select.labels || [], function (label) {
      var copy = label.cloneNode(true);
      copy.querySelectorAll('select, button, input, textarea').forEach(function (n) { n.remove(); });
      return copy.textContent.replace(/\s+/g, ' ').trim();
    }).filter(Boolean).join(' ');
  }

  function enhance(select) {
    if (syncs.has(select) || select.multiple || select.size > 1 || select.hasAttribute('data-native')) return;
    var id = 'dd-' + ++uid;
    var invalid = false;
    var skipFocus = false;

    var button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    var value = document.createElement('span');
    value.className = 'dd-value';
    button.appendChild(value);

    select.classList.add('dd-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select.after(button);

    // The button copies the select's classes (field, field-sm, widths, print:hidden) so it sits where the select did.
    function sync() {
      if (!select.classList.contains('dd-native')) select.classList.add('dd-native');
      var classes = select.className.replace(/(^|\s)dd-native(?=\s|$)/, '').trim();
      var opt = select.options[select.selectedIndex];
      var text = opt ? opt.text.replace(/\s+/g, ' ').trim() : '';
      var name = nameOf(select);
      button.className = classes + ' dd-button' + (!opt || opt.value === '' ? ' dd-placeholder' : '') + (invalid ? ' dd-invalid' : '');
      value.textContent = text || ' ';
      button.setAttribute('aria-label', name ? name + ': ' + text : text);
      button.disabled = select.disabled;
      button.style.display = select.style.display === 'none' ? 'none' : '';
    }
    syncs.set(select, sync);
    sync();

    new MutationObserver(function () { schedule(select); })
      .observe(select, { attributes: true, childList: true, subtree: true, characterData: true });
    if (select.form) select.form.addEventListener('reset', function () { setTimeout(sync); });

    select.addEventListener('change', function () {
      invalid = false;
      schedule(select);
    });
    // A click on the <label> focuses the hidden select; hand focus to the button instead,
    // except when the browser is pointing out a required field.
    select.addEventListener('invalid', function () {
      invalid = true;
      skipFocus = true;
      sync();
      setTimeout(function () { skipFocus = false; });
    });
    select.addEventListener('focus', function () {
      if (!skipFocus) button.focus();
    });

    // Type-ahead: jump to the next enabled option whose text starts with what was typed.
    var typed = '';
    var typedTimer = 0;
    function findByText(key, from) {
      clearTimeout(typedTimer);
      typedTimer = setTimeout(function () { typed = ''; }, 600);
      typed += key.toLowerCase();
      var opts = select.options;
      var start = typed.length > 1 ? from : from + 1;
      for (var n = 0; n < opts.length; n++) {
        var i = (start + n) % opts.length;
        if (!opts[i].disabled && !opts[i].hidden && opts[i].text.trim().toLowerCase().indexOf(typed) === 0) return i;
      }
      return -1;
    }

    function choose(i) {
      if (i < 0 || select.selectedIndex === i) return;
      select.selectedIndex = i;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function open() {
      if (current) current(false);
      var menu = document.createElement('ul');
      var active = -1;
      menu.className = 'dd-menu';
      menu.id = id + '-menu';
      menu.tabIndex = -1;
      menu.setAttribute('role', 'listbox');
      menu.setAttribute('aria-label', nameOf(select) || 'Options');
      menu.style.fontSize = getComputedStyle(button).fontSize;
      Array.prototype.forEach.call(select.options, function (o, i) {
        if (o.hidden) return;
        var li = document.createElement('li');
        li.id = id + '-opt-' + i;
        li.className = 'dd-option';
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === select.selectedIndex));
        if (o.disabled) li.setAttribute('aria-disabled', 'true');
        li.dataset.index = i;
        li.textContent = o.text.replace(/\s+/g, ' ').trim() || ' ';
        menu.appendChild(li);
      });
      var items = Array.prototype.slice.call(menu.querySelectorAll('.dd-option:not([aria-disabled])'));

      function setActive(i) {
        var li = document.getElementById(id + '-opt-' + i);
        if (!li || li.hasAttribute('aria-disabled')) return;
        var prev = menu.querySelector('.dd-active');
        if (prev) prev.classList.remove('dd-active');
        li.classList.add('dd-active');
        menu.setAttribute('aria-activedescendant', li.id);
        li.scrollIntoView({ block: 'nearest' });
        active = i;
      }
      function step(by) {
        var pos = items.findIndex(function (li) { return +li.dataset.index === active; });
        var next = items[Math.max(0, Math.min(items.length - 1, pos < 0 ? 0 : pos + by))];
        if (next) setActive(+next.dataset.index);
      }

      function place() {
        var r = button.getBoundingClientRect();
        var gap = 4;
        var edge = 8;
        var below = window.innerHeight - r.bottom - gap - edge;
        var above = r.top - gap - edge;
        menu.style.minWidth = r.width + 'px';
        menu.style.maxHeight = '';
        var up = menu.scrollHeight > below && above > below;
        menu.style.maxHeight = Math.max(96, Math.min(288, up ? above : below)) + 'px';
        menu.style.top = (up ? r.top - gap - menu.offsetHeight : r.bottom + gap) + 'px';
        menu.style.left = Math.max(edge, Math.min(r.left, window.innerWidth - menu.offsetWidth - edge)) + 'px';
      }

      function close(refocus) {
        if (current !== close) return;
        current = null;
        menu.remove();
        button.setAttribute('aria-expanded', 'false');
        button.removeAttribute('aria-controls');
        window.removeEventListener('resize', place);
        window.removeEventListener('scroll', onScroll, true);
        document.removeEventListener('pointerdown', onOutside, true);
        if (refocus) button.focus();
      }
      function onScroll(e) {
        if (e.target !== menu) place();
      }
      function onOutside(e) {
        if (!menu.contains(e.target) && !button.contains(e.target)) close(false);
      }

      menu.addEventListener('mousedown', function (e) { e.preventDefault(); });
      menu.addEventListener('click', function (e) {
        var li = e.target.closest('.dd-option');
        if (!li || li.hasAttribute('aria-disabled')) return;
        close(true);
        choose(+li.dataset.index);
      });
      menu.addEventListener('mousemove', function (e) {
        var li = e.target.closest('.dd-option');
        if (li && +li.dataset.index !== active) setActive(+li.dataset.index);
      });
      menu.addEventListener('focusout', function (e) {
        // Focus going to the button means it was clicked, and its click handler closes the menu.
        if (!menu.contains(e.relatedTarget) && e.relatedTarget !== button) close(false);
      });
      menu.addEventListener('keydown', function (e) {
        switch (e.key) {
          case 'ArrowDown': step(1); break;
          case 'ArrowUp': if (e.altKey) { close(true); choose(active); } else step(-1); break;
          case 'Home': step(-items.length); break;
          case 'End': step(items.length); break;
          case 'PageDown': step(8); break;
          case 'PageUp': step(-8); break;
          case 'Enter':
          case ' ':
            close(true);
            choose(active);
            break;
          case 'Escape': close(true); break;
          case 'Tab':
            close(true); // focus is back on the button, so Tab carries on from there
            return;
          default:
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) setActive(findByText(e.key, active));
            else return;
        }
        e.preventDefault();
      });

      current = close;
      document.body.appendChild(menu);
      button.setAttribute('aria-expanded', 'true');
      button.setAttribute('aria-controls', menu.id);
      place();
      setActive(select.selectedIndex);
      if (active < 0 && items[0]) setActive(+items[0].dataset.index);
      menu.focus({ preventScroll: true });
      window.addEventListener('resize', place);
      window.addEventListener('scroll', onScroll, true);
      document.addEventListener('pointerdown', onOutside, true);
    }

    button.addEventListener('click', function () {
      if (button.getAttribute('aria-expanded') === 'true') current(true);
      else open();
    });
    button.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        open();
      } else if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        choose(findByText(e.key, select.selectedIndex));
      }
    });
  }

  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.tagName === 'SELECT') enhance(node);
    else node.querySelectorAll('select').forEach(enhance);
  }

  // Deferred, so the document is parsed. The observer catches rows Alpine adds and pages htmx swaps in.
  scan(document.body);
  new MutationObserver(function (mutations) {
    mutations.forEach(function (m) { m.addedNodes.forEach(scan); });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
