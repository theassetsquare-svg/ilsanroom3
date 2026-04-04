// ===== Skeleton → Content Transition =====
(function () {
  var skeleton = document.getElementById('skeleton');
  var pageWrap = document.getElementById('pageWrap');

  function showPage() {
    if (skeleton) skeleton.classList.add('hidden');
    if (pageWrap) pageWrap.classList.add('visible');
    // Remove skeleton from DOM after transition
    setTimeout(function () {
      if (skeleton && skeleton.parentNode) skeleton.parentNode.removeChild(skeleton);
    }, 400);
  }

  // Show content when DOM + critical assets ready
  if (document.readyState === 'complete') {
    showPage();
  } else {
    window.addEventListener('load', showPage);
  }
})();

// ===== Social Proof View Count =====
(function () {
  var SESSION_KEY = 'ilsanroom3_views';
  var base = 12847;
  var stored = null;

  try {
    stored = sessionStorage.getItem(SESSION_KEY);
  } catch (e) { /* private browsing */ }

  var count;
  if (stored) {
    count = parseInt(stored, 10);
  } else {
    count = base + Math.floor(Math.random() * 200);
    try {
      sessionStorage.setItem(SESSION_KEY, count.toString());
    } catch (e) { /* ignore */ }
  }

  var el = document.getElementById('viewCount');
  if (el) el.textContent = count.toLocaleString('ko-KR');
})();

// ===== Secret Section Reveal at 80% Scroll =====
(function () {
  var secret = document.getElementById('secretSection');
  if (!secret) return;

  var revealed = false;
  var observer = null;

  function onScroll() {
    if (revealed) return;
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    var pct = scrollTop / docHeight;

    if (pct >= 0.7) {
      revealed = true;
      secret.classList.add('revealed');
      window.removeEventListener('scroll', onScroll);
    }
  }

  // Use passive scroll listener for performance
  window.addEventListener('scroll', onScroll, { passive: true });

  // Check immediately in case page is already scrolled
  onScroll();
})();
