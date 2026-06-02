'use strict';
/*
 * site-monitor.js — 일산룸 사이트 자동 점검기 (의존성 0, Node 내장 모듈만)
 *
 * 점검 항목:
 *   1) 라이브 페이지/자산 HTTP 200 여부
 *   2) 위험 단어(방심위 리스크) 노출 여부 — 영구 룰
 *   3) <title> / canonical / meta description / og:image 무결성
 *   4) JSON-LD 구조화 데이터 파싱 가능 여부
 *   5) (GSC 키 있으면) 색인 상태 — 색인 안 된 페이지 경고
 *   6) (GSC 키 있으면) 검색 성과 — 노출 급감/0 경고
 *
 * 사용:
 *   node scripts/site-monitor.js            # 로컬 (키: /home/user/.secrets/theasset-gsc.json)
 *   GSC_KEY_JSON='{...}' node scripts/site-monitor.js   # CI (시크릿 주입)
 *
 * 출력:
 *   - 콘솔 사람용 요약
 *   - monitor-report.json (전체 결과)
 *   - monitor-alert.md (문제 있을 때만 — 메일 본문)
 *   - 종료코드 1 = 문제 발견(메일 발송 트리거), 0 = 정상
 */
const https = require('https');
const fs = require('fs');

const SITE = process.env.GSC_SITE || 'https://ilsanroom3.pages.dev/';
const PAGES = [
  'https://ilsanroom3.pages.dev/',
  'https://ilsanroom3.pages.dev/legal/',
];
const ASSETS = [
  'https://ilsanroom3.pages.dev/sitemap.xml',
  'https://ilsanroom3.pages.dev/robots.txt',
  'https://ilsanroom3.pages.dev/llms.txt',
  'https://ilsanroom3.pages.dev/og-home.png',
  'https://ilsanroom3.pages.dev/site.webmanifest',
];
const DANGER = ['룸싸롱', '룸살롱', '노래방', '유흥', '밤문화', '2차', '금영'];

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'ilsanroom-monitor/1.0' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    }).on('error', (e) => resolve({ status: 0, body: '', error: e.message }));
  });
}

async function checkGsc(problems, info) {
  let gsc;
  try { gsc = require('./gsc-lib.js'); } catch { return; }
  const hasKey = process.env.GSC_KEY_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    fs.existsSync('/home/user/.secrets/theasset-gsc.json');
  if (!hasKey) { info.push('GSC 키 없음 — 색인/성과 점검 건너뜀'); return; }
  let token;
  try { token = await gsc.getAccessToken(); }
  catch (e) { problems.push(`GSC 인증 실패: ${e.message.slice(0, 120)}`); return; }

  // 색인 상태
  for (const u of PAGES) {
    try {
      const r = await gsc.inspectUrl(token, SITE, u);
      const idx = (r.inspectionResult && r.inspectionResult.indexStatusResult) || {};
      info.push(`색인[${u}] verdict=${idx.verdict} coverage=${idx.coverageState}`);
      if (idx.verdict !== 'PASS') {
        problems.push(`색인 안 됨/문제: ${u} → ${idx.coverageState || idx.verdict}`);
      }
    } catch (e) { info.push(`색인 점검 실패 ${u}: ${e.message.slice(0, 80)}`); }
  }

  // 성과 28일 vs 이전 28일
  try {
    const d = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    const cur = (await gsc.searchAnalytics(token, SITE, { startDate: d(30), endDate: d(2), dimensions: [] })).rows || [];
    const prev = (await gsc.searchAnalytics(token, SITE, { startDate: d(60), endDate: d(31), dimensions: [] })).rows || [];
    const ci = cur[0] ? cur[0].impressions : 0;
    const pi = prev[0] ? prev[0].impressions : 0;
    const cc = cur[0] ? cur[0].clicks : 0;
    const pos = cur[0] ? cur[0].position.toFixed(1) : 'n/a';
    info.push(`성과 28일: 노출 ${ci} / 클릭 ${cc} / 평균순위 ${pos} (이전 노출 ${pi})`);
    if (pi >= 10 && ci < pi * 0.5) {
      problems.push(`검색 노출 급감: ${pi} → ${ci} (50% 이상 하락)`);
    }
  } catch (e) { info.push(`성과 점검 실패: ${e.message.slice(0, 80)}`); }
}

(async () => {
  const problems = [];
  const info = [];

  // 1) 페이지 + 무결성
  for (const u of PAGES) {
    const r = await fetchUrl(u);
    if (r.status !== 200) { problems.push(`페이지 ${r.status || 'DOWN'}: ${u}`); continue; }
    const danger = DANGER.filter((w) => r.body.includes(w));
    if (danger.length) problems.push(`위험 단어 노출 ${u}: ${danger.join(', ')}`);
    if (!/<title>[^<]+<\/title>/.test(r.body)) problems.push(`<title> 없음: ${u}`);
    if (!/rel=["']canonical["']/.test(r.body)) problems.push(`canonical 없음: ${u}`);
    if (!/name=["']description["']/.test(r.body)) problems.push(`meta description 없음: ${u}`);
    if (!/property=["']og:image["']/.test(r.body)) problems.push(`og:image 없음: ${u}`);
    // JSON-LD 파싱
    const blocks = r.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    for (const b of blocks) {
      const json = b.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
      try { JSON.parse(json); } catch { problems.push(`JSON-LD 파싱 오류: ${u}`); }
    }
    info.push(`OK 200: ${u} (JSON-LD ${blocks.length}블록)`);
  }

  // 2) 자산
  for (const u of ASSETS) {
    const r = await fetchUrl(u);
    if (r.status !== 200) problems.push(`자산 ${r.status || 'DOWN'}: ${u}`);
    else info.push(`OK 200: ${u}`);
  }

  // 3) GSC
  await checkGsc(problems, info);

  // 결과
  const now = new Date().toISOString();
  const report = { checkedAt: now, site: SITE, ok: problems.length === 0, problems, info };
  fs.writeFileSync('monitor-report.json', JSON.stringify(report, null, 2));

  console.log(`\n=== 일산룸 사이트 자동 점검 (${now}) ===`);
  info.forEach((l) => console.log('  · ' + l));
  if (problems.length) {
    console.log(`\n❌ 문제 ${problems.length}건 발견:`);
    problems.forEach((p) => console.log('  ⚠ ' + p));
    const md = [
      `# 🚨 일산룸 사이트 문제 알림`,
      ``,
      `점검 시각: ${now}`,
      `사이트: ${SITE}`,
      ``,
      `## 발견된 문제 (${problems.length}건)`,
      ...problems.map((p, i) => `${i + 1}. ${p}`),
      ``,
      `## 점검 상세`,
      ...info.map((l) => `- ${l}`),
      ``,
      `---`,
      `이 메일은 site-monitor.js 자동 점검기가 발송했습니다.`,
    ].join('\n');
    fs.writeFileSync('monitor-alert.md', md);
    process.exit(1);
  } else {
    console.log('\n✅ 모든 점검 통과 — 문제 없음');
    process.exit(0);
  }
})();
