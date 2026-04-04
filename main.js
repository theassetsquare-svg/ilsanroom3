// View count with slight randomization for social proof
(function () {
  var base = 12847;
  var random = Math.floor(Math.random() * 200);
  var count = base + random;
  var el = document.getElementById('viewCount');
  if (el) {
    el.textContent = count.toLocaleString('ko-KR');
  }
})();
