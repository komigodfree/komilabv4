(function () {
  'use strict';

  /* ── LANG SWITCHER ────────────────────────────────────────── */
  function switchLang(lang) {
    var path = window.location.pathname;
    if (lang === 'en') {
      if (!path.startsWith('/en/')) window.location.href = '/en' + (path === '/' ? '/' : path);
    } else {
      window.location.href = path.replace(/^\/en/, '') || '/';
    }
  }
  window.switchLang = switchLang;

  if (!localStorage.getItem('kl-lang-set')) {
    localStorage.setItem('kl-lang-set', '1');
    fetch('https://ipapi.co/json/')
      .then(function(r){ return r.json(); })
      .then(function(d){
        var en = ['US','GB','CA','AU','NZ','IE','ZA','NG','GH','KE','IN','SG'];
        if (en.indexOf(d.country_code) > -1 && document.documentElement.lang === 'fr') switchLang('en');
      }).catch(function(){});
  }

  document.addEventListener('DOMContentLoaded', function () {

    /* ── READING PROGRESS ───────────────────────────────────── */
    var bar = document.getElementById('reading-progress');
    if (bar) {
      window.addEventListener('scroll', function () {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (h > 0 ? Math.min((window.scrollY / h) * 100, 100) : 0) + '%';
      }, { passive: true });
    }

    /* ── SCROLL ANIMATIONS ──────────────────────────────────── */
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-in').forEach(function(el) { obs.observe(el); });

    /* ── MOBILE NAV ─────────────────────────────────────────── */
    var hamburger = document.getElementById('nav-hamburger');
    var mobileNav = document.getElementById('mobile-nav');
    if (hamburger && mobileNav) {
      hamburger.addEventListener('click', function () {
        var open = mobileNav.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', open);
      });
      document.addEventListener('click', function (e) {
        if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
          mobileNav.classList.remove('open');
        }
      });
    }

    /* ── ACTIVE NAV ─────────────────────────────────────────── */
    var cur = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href && href !== '/' && cur.startsWith(href)) a.classList.add('active');
    });

    /* ── COPY TO CLIPBOARD ──────────────────────────────────── */
    /* Exclut les blocs result-block (résultat attendu) et result-content */
    document.querySelectorAll('pre').forEach(function (pre) {

      /* Ne pas ajouter le bouton copier sur les blocs "Résultat attendu" */
      if (
        pre.classList.contains('result-content') ||
        (pre.parentNode && pre.parentNode.classList.contains('result-block'))
      ) return;

      /* Vérifier support clipboard — évite l'erreur silencieuse sur certains navigateurs */
      if (!navigator.clipboard) return;

      var wrapper = document.createElement('div');
      wrapper.className = 'code-wrapper';
      wrapper.style.position = 'relative';
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      var btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.setAttribute('aria-label', 'Copier le code');
      btn.setAttribute('type', 'button');
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copier';
      wrapper.appendChild(btn);

      btn.addEventListener('click', function () {
        var code = pre.querySelector('code') || pre;
        navigator.clipboard.writeText(code.innerText).then(function () {
          btn.classList.add('copied');
          btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copié !';
          setTimeout(function () {
            btn.classList.remove('copied');
            btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copier';
          }, 2000);
        }).catch(function(){});
      });
    });

    /* ── TOC ACTIVE ─────────────────────────────────────────── */
    var tocLinks = document.querySelectorAll('.lab-toc nav a');
    if (tocLinks.length > 0) {
      var headings = Array.from(document.querySelectorAll('.lab-content h2, .lab-content h3'));
      var tocObs = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');
            tocLinks.forEach(function(l) { l.classList.remove('active'); });
            var active = document.querySelector('.lab-toc nav a[href="#' + id + '"]');
            if (active) active.classList.add('active');
          }
        });
      }, { rootMargin: '-20% 0% -60% 0%' });
      headings.forEach(function(h) { if (h.id) tocObs.observe(h); });
    }

    /* ── SEARCH ─────────────────────────────────────────────── */
    var searchInput   = document.getElementById('search-input');
    var searchResults = document.getElementById('search-results');
    if (searchInput && searchResults) {
      var idx = null;
      fetch('/index.json').then(function(r){return r.json();}).then(function(d){idx=d;});
      searchInput.addEventListener('input', function() {
        var q = searchInput.value.trim().toLowerCase();
        if (!idx || q.length < 2) { searchResults.innerHTML = ''; return; }
        var res = idx.filter(function(i) {
          return (i.title+' '+(i.summary||'')+' '+(i.tags||[]).join(' ')).toLowerCase().includes(q);
        }).slice(0,8);
        searchResults.innerHTML = !res.length
          ? '<p style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-muted)">Aucun resultat.</p>'
          : res.map(function(r) {
              return '<div class="search-result"><a href="'+r.permalink+'" style="font-family:var(--font-mono);font-weight:600;color:var(--cyan)">'+r.title+'</a><p style="font-size:0.78rem;color:var(--text-muted);margin:4px 0 0">'+( r.summary||'')+'</p></div>';
            }).join('');
      });
    }

    /* ── VEILLE RSS ─────────────────────────────────────────── */
    var PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';
    function timeAgo(d) {
      var s = (Date.now() - new Date(d)) / 1000;
      if (s < 3600) return Math.floor(s/60)+'min';
      if (s < 86400) return Math.floor(s/3600)+'h';
      return Math.floor(s/86400)+'j';
    }
    function renderFeed(id, items, source) {
      var el = document.getElementById(id);
      if (!el) return;
      if (!items || !items.length) { el.innerHTML = '<div class="news-loading">Flux indisponible</div>'; return; }
      el.innerHTML = items.slice(0,6).map(function(item) {
        return '<a href="'+item.link+'" class="news-item" target="_blank" rel="noopener noreferrer">'
          +'<div class="news-item-title">'+item.title+'</div>'
          +'<div class="news-item-meta"><span class="news-item-source">'+source+'</span>'
          +'<span class="news-dot">&#183;</span><span>'+timeAgo(item.pubDate)+'</span></div>'
          +'</a>';
      }).join('');
    }
    function fetchFeed(url, id, source) {
      fetch(PROXY + encodeURIComponent(url))
        .then(function(r){return r.json();})
        .then(function(d){
          if (d.status==='ok') renderFeed(id, d.items, source);
          else { var el=document.getElementById(id); if(el) el.innerHTML='<div class="news-loading">Flux indisponible</div>'; }
        }).catch(function(){
          var el=document.getElementById(id); if(el) el.innerHTML='<div class="news-loading">Flux indisponible</div>';
        });
    }
    if (document.getElementById('feed-tech'))  fetchFeed('https://feeds.feedburner.com/TheHackersNews', 'feed-tech', 'The Hacker News');
    if (document.getElementById('feed-cyber')) fetchFeed('https://www.bleepingcomputer.com/feed/', 'feed-cyber', 'Bleeping Computer');

    /* ── NEWSLETTER ─────────────────────────────────────────── */
    document.querySelectorAll('[id="newsletter-form"]').forEach(function(form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var emailInput = form.querySelector('input[type="email"]');
        if (!emailInput || !emailInput.value) return;
        var email = emailInput.value.trim();
        var btn = form.querySelector('button[type="submit"]');
        var originalText = btn ? btn.textContent : '';

        if (btn) { btn.textContent = 'Inscription...'; btn.disabled = true; }

        fetch('/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email }),
        })
        .then(function(res) { return res.json().then(function(data) { return { status: res.status, data: data }; }); })
        .then(function(r) {
          if (r.status === 200) {
            form.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.85rem;color:var(--green-ok);font-weight:600">Inscription reussie ! Verifiez votre email pour confirmer.</p>';
          } else if (r.status === 409) {
            form.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.85rem;color:var(--cyan);font-weight:600">Cet email est deja abonne.</p>';
          } else {
            if (btn) { btn.textContent = originalText; btn.disabled = false; }
            emailInput.style.borderColor = 'var(--red-alert)';
            emailInput.placeholder = r.data.error || 'Erreur, reessayez.';
          }
        })
        .catch(function() {
          if (btn) { btn.textContent = originalText; btn.disabled = false; }
          emailInput.style.borderColor = 'var(--red-alert)';
          emailInput.placeholder = 'Erreur reseau, reessayez.';
        });
      });
    });

  });
})();
