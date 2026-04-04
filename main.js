// ===== Skeleton → Content =====
(function () {
  var skeleton = document.getElementById('skeleton');
  var pageWrap = document.getElementById('pageWrap');
  function show() {
    if (skeleton) skeleton.classList.add('hidden');
    if (pageWrap) pageWrap.classList.add('visible');
    setTimeout(function () { if (skeleton && skeleton.parentNode) skeleton.parentNode.removeChild(skeleton); }, 400);
  }
  if (document.readyState === 'complete') show();
  else window.addEventListener('load', show);
})();

// ===== Social Proof (monthly count, persist in session) =====
(function () {
  var KEY = 'ilsanroom3_mviews';
  var base = 4291;
  var stored = null;
  try { stored = sessionStorage.getItem(KEY); } catch (e) {}
  var count = stored ? parseInt(stored, 10) : base + Math.floor(Math.random() * 300);
  try { sessionStorage.setItem(KEY, count.toString()); } catch (e) {}
  var el = document.getElementById('viewCount');
  if (el) el.textContent = count.toLocaleString('ko-KR');
})();

// ===== Countdown Slots =====
(function () {
  var el = document.getElementById('countdownSlots');
  if (!el) return;
  var slots = [2, 3, 4, 5];
  var pick = slots[Math.floor(Math.random() * slots.length)];
  el.textContent = pick + '자리';
})();

// ===== Swipe Gallery =====
(function () {
  var track = document.getElementById('galleryTrack');
  var dotsContainer = document.getElementById('galleryDots');
  if (!track || !dotsContainer) return;

  var slides = track.querySelectorAll('.gallery-slide');
  var total = slides.length;
  var current = 0;
  var startX = 0;
  var diff = 0;
  var dragging = false;

  // Build dots
  for (var i = 0; i < total; i++) {
    var dot = document.createElement('button');
    dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', '슬라이드 ' + (i + 1));
    dot.dataset.idx = i;
    dotsContainer.appendChild(dot);
  }
  var dots = dotsContainer.querySelectorAll('.gallery-dot');

  function goTo(idx) {
    if (idx < 0) idx = 0;
    if (idx >= total) idx = total - 1;
    current = idx;
    track.style.transform = 'translateX(-' + (current * 100) + '%)';
    for (var j = 0; j < dots.length; j++) dots[j].classList.toggle('active', j === current);
  }

  // Dot click
  dotsContainer.addEventListener('click', function (e) {
    var btn = e.target.closest('.gallery-dot');
    if (btn) goTo(parseInt(btn.dataset.idx, 10));
  });

  // Touch swipe
  track.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; dragging = true; }, { passive: true });
  track.addEventListener('touchmove', function (e) { if (dragging) diff = e.touches[0].clientX - startX; }, { passive: true });
  track.addEventListener('touchend', function () {
    dragging = false;
    if (Math.abs(diff) > 50) goTo(current + (diff < 0 ? 1 : -1));
    diff = 0;
  });

  // Mouse drag
  track.addEventListener('mousedown', function (e) { startX = e.clientX; dragging = true; e.preventDefault(); });
  document.addEventListener('mousemove', function (e) { if (dragging) diff = e.clientX - startX; });
  document.addEventListener('mouseup', function () {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(diff) > 50) goTo(current + (diff < 0 ? 1 : -1));
    diff = 0;
  });
})();

// ===== Mini Quiz =====
var quizAnswers = {};
function quizAnswer(q, val) {
  quizAnswers[q] = val;
  var cards = document.querySelectorAll('.quiz-card');
  for (var i = 0; i < cards.length; i++) cards[i].classList.remove('active');

  if (q < 3) {
    var next = document.querySelector('.quiz-card[data-q="' + (q + 1) + '"]');
    if (next) next.classList.add('active');
  } else {
    showQuizResult();
  }
}

function showQuizResult() {
  var result = document.getElementById('quizResult');
  var title = document.getElementById('quizResultTitle');
  var desc = document.getElementById('quizResultDesc');
  if (!result || !title || !desc) return;

  var a = quizAnswers;
  var type;
  if (a[1] === 'a' || a[3] === 'a') {
    type = 'vip';
  } else if (a[1] === 'b' || a[2] === 'b') {
    type = 'party';
  } else {
    type = 'chill';
  }

  var results = {
    vip: {
      t: '프라이빗 VIP형',
      d: '조용하고 격식 있는 공간을 선호하는 당신. 마두 쪽 단골 위주 업소나 정발산 프리미엄 룸이 딱 맞다. 서비스 질과 분위기를 최우선으로 따지는 타입이다.'
    },
    party: {
      t: '에너지 파티형',
      d: '북적이는 분위기에서 에너지를 충전하는 당신. 금~토 밤 정발산역 상권이 최적이다. 단, 예약 필수! 워크인으로 가면 대기 각오해야 한다.'
    },
    chill: {
      t: '여유 힐링형',
      d: '한적한 시간대에 느긋하게 즐기는 당신. 평일 저녁이나 일요일 오후가 골든타임이다. 백석 신규 오픈 업소를 노려보면 시설 대비 만족도가 높다.'
    }
  };

  title.textContent = '당신은 "' + results[type].t + '"';
  desc.textContent = results[type].d;
  result.classList.add('active');
}

// ===== Secret Section Reveal at 80% =====
(function () {
  var secret = document.getElementById('secretSection');
  if (!secret) return;
  var revealed = false;
  function check() {
    if (revealed) return;
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0 && (scrollTop / docHeight) >= 0.7) {
      revealed = true;
      secret.classList.add('revealed');
      window.removeEventListener('scroll', check);
    }
  }
  window.addEventListener('scroll', check, { passive: true });
  check();
})();

// ===== Exit Intent (scroll up detection) =====
(function () {
  var popup = document.getElementById('exitPopup');
  var closeBtn = document.getElementById('exitClose');
  if (!popup || !closeBtn) return;

  var shown = false;
  var lastY = 0;
  var upCount = 0;
  var KEY = 'ilsanroom3_exit_shown';

  // Don't show again in same session
  try { if (sessionStorage.getItem(KEY)) return; } catch (e) {}

  function onScroll() {
    if (shown) return;
    var y = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? y / docHeight : 0;

    // Only trigger after user has scrolled past 30%
    if (pct > 0.3 && y < lastY) {
      upCount += (lastY - y);
      if (upCount > 200) {
        shown = true;
        popup.classList.add('show');
        try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
        window.removeEventListener('scroll', onScroll);
      }
    } else {
      upCount = 0;
    }
    lastY = y;
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  closeBtn.addEventListener('click', function () { popup.classList.remove('show'); });
  popup.addEventListener('click', function (e) { if (e.target === popup) popup.classList.remove('show'); });
})();
