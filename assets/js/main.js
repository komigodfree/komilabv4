/* ============================================================
   KOMILAB v2.0 — main.js
   Theme, lang, progress, copy, TOC, nav, search, veille, newsletter
   ============================================================ */
(function () {
  'use strict';

  /* ── LANG DETECTION & SWITCHER ───────────────────────────── */
  function switchLang(lang) {
    var path = window.location.pathname;
    if (lang === 'en') {
      if (!path.startsWith('/en/')) {
        window.location.href = '/en' + (path === '/' ? '/' : path);
      }
    } else {
      window.location.href = path.replace(/^\/en/, '') || '/';
    }
  }
  window.switchLang = switchLang;

  // Auto-detect on first visit
  if (!localStorage.getItem('kl-lang-set')) {
    localStorage.setItem('kl-lang-set', '1');
    fetch('https://ipapi.co/json/')
      .then(function(r){ return r.json(); })
      .then(function(d){
        var enCountries = ['US','GB','CA','AU','NZ','IE','ZA','NG','GH','KE','IN','SG'];
        var isEN = enCountries.indexOf(d.country_code) > -1;
        var currentLang = document.documentElement.lang;
        if (isEN && currentLang === 'fr') switchLang('en');
      })
      .catch(function(){});
  }

  document.addEventListener('DOMContentLoaded', function () {

    /* ── READING PROGRESS ─────────────────────────────────── */
    var progressBar = document.getElementById('reading-progress');
    if (progressBar) {
      window.addEventListener('scroll', function () {
        var scrollTop = window.scrollY;
        var docH = document.documentElement.scrollHeight - window.innerHeight;
        progressBar.style.width = (docH > 0 ? Math.min((scrollTop / docH) * 100, 100) : 0) + '%';
      }, { passive: true });
    }

    /* ── COPY TO CLIPBOARD ────────────────────────────────── */
    document.querySelectorAll('pre').forEach(function (pre) {
      var wrapper = document.createElement('div');
      wrapper.className = 'code-wrapper';
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      var btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.setAttribute('aria-label', 'Copier');
      btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copier';
      wrapper.appendChild(btn);

      btn.addEventListener('click', function () {
        var code = pre.querySelector('code') || pre;
        navigator.clipboard.writeText(code.innerText).then(function () {
          btn.classList.add('copied');
          btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copie';
          setTimeout(function () {
            btn.classList.remove('copied');
            btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copier';
          }, 2000);
        });
      });
    });

    /* ── MOBILE NAV ───────────────────────────────────────── */
    var hamburger = document.getElementById('nav-hamburger');
    var navLinks  = document.getElementById('nav-links');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', function () {
        var open = navLinks.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', open);
      });
      document.addEventListener('click', function (e) {
        if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
          navLinks.classList.remove('open');
        }
      });
    }

    /* ── ACTIVE NAV ───────────────────────────────────────── */
    var cur = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href && href !== '/' && cur.startsWith(href)) a.classList.add('active');
    });

    /* ── TOC ACTIVE ───────────────────────────────────────── */
    var tocLinks = document.querySelectorAll('.lab-toc nav a');
    if (tocLinks.length > 0) {
      var headings = Array.from(document.querySelectorAll('.lab-content h2, .lab-content h3, .lab-content h4'));
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');
            tocLinks.forEach(function (l) { l.classList.remove('active'); });
            var active = document.querySelector('.lab-toc nav a[href="#' + id + '"]');
            if (active) active.classList.add('active');
          }
        });
      }, { rootMargin: '-20% 0% -60% 0%' });
      headings.forEach(function (h) { if (h.id) obs.observe(h); });
    }

    /* ── SEARCH ───────────────────────────────────────────── */
    var searchInput   = document.getElementById('search-input');
    var searchResults = document.getElementById('search-results');
    if (searchInput && searchResults) {
      var searchIndex = null;
      fetch('/index.json').then(function (r) { return r.json(); }).then(function (d) { searchIndex = d; });
      searchInput.addEventListener('input', function () {
        var q = searchInput.value.trim().toLowerCase();
        if (!searchIndex || q.length < 2) { searchResults.innerHTML = ''; return; }
        var results = searchIndex.filter(function (item) {
          return (item.title + ' ' + item.summary + ' ' + (item.tags || []).join(' ')).toLowerCase().includes(q);
        }).slice(0, 8);
        if (!results.length) { searchResults.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-muted)">Aucun resultat.</p>'; return; }
        searchResults.innerHTML = results.map(function (r) {
          return '<div class="search-result"><a href="' + r.permalink + '" style="font-weight:600">' + r.title + '</a><p style="font-size:0.78rem;color:var(--text-muted);margin:4px 0 0">' + (r.summary || '') + '</p></div>';
        }).join('');
      });
    }

    /* ── VEILLE RSS FEEDS ─────────────────────────────────── */
    var CORS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';
    var FEEDS = {
      tech: [
        'https://feeds.feedburner.com/TheHackersNews',
        'https://www.lemondeinformatique.fr/flux-rss/thematique/securite/rss.xml'
      ],
      cyber: [
        'https://www.bleepingcomputer.com/feed/',
        'https://feeds.feedburner.com/KrebsOnSecurity'
      ]
    };

    function timeAgo(dateStr) {
      var diff = (Date.now() - new Date(dateStr)) / 1000;
      if (diff < 3600) return Math.floor(diff / 60) + 'min';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h';
      return Math.floor(diff / 86400) + 'j';
    }

    function renderFeed(containerId, items, source) {
      var el = document.getElementById(containerId);
      if (!el) return;
      if (!items || !items.length) {
        el.innerHTML = '<div class="veille-error">Flux indisponible</div>';
        return;
      }
      el.innerHTML = items.slice(0, 6).map(function (item) {
        return '<a href="' + item.link + '" class="veille-item" target="_blank" rel="noopener noreferrer">' +
          '<div class="veille-item-source">' + source + '</div>' +
          '<div class="veille-item-title">' + item.title + '</div>' +
          '<div class="veille-item-date">' + timeAgo(item.pubDate) + '</div>' +
          '</a>';
      }).join('');
    }

    function fetchFeed(url, containerId, source) {
      fetch(CORS_PROXY + encodeURIComponent(url))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.status === 'ok') renderFeed(containerId, data.items, source);
          else document.getElementById(containerId) && (document.getElementById(containerId).innerHTML = '<div class="veille-error">Flux indisponible</div>');
        })
        .catch(function () {
          var el = document.getElementById(containerId);
          if (el) el.innerHTML = '<div class="veille-error">Flux indisponible</div>';
        });
    }

    if (document.getElementById('feed-tech')) {
      fetchFeed(FEEDS.tech[0], 'feed-tech', 'The Hacker News');
    }
    if (document.getElementById('feed-cyber')) {
      fetchFeed(FEEDS.cyber[0], 'feed-cyber', 'Bleeping Computer');
    }

    /* ── NEWSLETTER ───────────────────────────────────────── */
    var nlForm = document.getElementById('newsletter-form');
    if (nlForm) {
      nlForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = document.getElementById('newsletter-email');
        if (!email || !email.value) return;
        var btn = nlForm.querySelector('button[type="submit"]');
        if (btn) { btn.textContent = 'Inscription...'; btn.disabled = true; }

        // MailerLite API call
        var formId = '{{ .Site.Params.mailerliteFormID }}';
        if (formId && formId !== 'VOTRE_FORM_ID') {
          fetch('https://assets.mailerlite.com/jsonp/' + formId + '/forms/' + formId + '/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { email: email.value } })
          }).then(function () {
            nlForm.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.85rem;color:#22d3a5;font-weight:700">Inscription reussie. Verifiez votre email pour confirmer.</p>';
          }).catch(function () {
            nlForm.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.85rem;color:#22d3a5;font-weight:700">Verifiez votre email pour confirmer.</p>';
          });
        } else {
          setTimeout(function () {
            nlForm.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.85rem;color:#22d3a5;font-weight:700">Verifiez votre email pour confirmer.</p>';
          }, 1000);
        }
      });
    }

  }); // DOMContentLoaded
})();
