'use strict';
// Pull real Search Console performance data for ilsanroom3 and print an analysis.
const { getAccessToken, searchAnalytics, inspectUrl } = require('./gsc-lib.js');

const SITE = process.env.GSC_SITE || 'https://ilsanroom3.pages.dev/';

// Date math without Date.now ban issues — Date is fine in plain Node CLI.
function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}

async function rows(token, body) {
  const r = await searchAnalytics(token, SITE, body);
  return r.rows || [];
}

(async () => {
  const token = await getAccessToken();
  const end = daysAgo(2); // GSC data lags ~2 days
  const start28 = daysAgo(30);
  const start90 = daysAgo(92);

  console.log(`# GSC REPORT — ${SITE}`);
  console.log(`범위(28일): ${start28} ~ ${end}\n`);

  // 1) Top queries (28d)
  const q = await rows(token, {
    startDate: start28, endDate: end,
    dimensions: ['query'], rowLimit: 50,
  });
  console.log('## TOP QUERIES (28일) — query | clicks | impr | ctr% | pos');
  if (!q.length) console.log('(데이터 없음 — 노출 0)');
  for (const r of q) {
    console.log(`${r.keys[0]} | ${r.clicks} | ${r.impressions} | ${(r.ctr*100).toFixed(1)} | ${r.position.toFixed(1)}`);
  }

  // 2) Top pages (28d)
  const p = await rows(token, {
    startDate: start28, endDate: end,
    dimensions: ['page'], rowLimit: 25,
  });
  console.log('\n## TOP PAGES (28일) — page | clicks | impr | pos');
  for (const r of p) {
    console.log(`${r.keys[0]} | ${r.clicks} | ${r.impressions} | ${r.position.toFixed(1)}`);
  }

  // 3) Cannibalization: query x page (90d) — same query on >1 page
  const qp = await rows(token, {
    startDate: start90, endDate: end,
    dimensions: ['query', 'page'], rowLimit: 1000,
  });
  const byQuery = {};
  for (const r of qp) {
    const [query, page] = r.keys;
    (byQuery[query] = byQuery[query] || []).push({ page, impressions: r.impressions, position: r.position });
  }
  const cann = Object.entries(byQuery).filter(([, arr]) => arr.length > 1);
  console.log(`\n## CANNIBALIZATION (90일) — 동일 쿼리가 2개+ 페이지에 노출: ${cann.length}건`);
  for (const [query, arr] of cann.sort((a,b)=>b[1].length-a[1].length).slice(0,20)) {
    console.log(`"${query}" → ${arr.length} pages`);
    for (const a of arr) console.log(`   - ${a.page} (impr ${a.impressions}, pos ${a.position.toFixed(1)})`);
  }

  // 4) Totals 28 vs prev 28
  const tot = await rows(token, { startDate: start28, endDate: end, dimensions: [] });
  const totPrev = await rows(token, { startDate: daysAgo(60), endDate: daysAgo(31), dimensions: [] });
  const fmt = (a) => a.length ? `clicks ${a[0].clicks}, impr ${a[0].impressions}, ctr ${(a[0].ctr*100).toFixed(2)}%, pos ${a[0].position.toFixed(1)}` : '0';
  console.log('\n## TOTALS');
  console.log(`최근28일: ${fmt(tot)}`);
  console.log(`이전28일: ${fmt(totPrev)}`);

  // 5) Indexing status of both URLs
  console.log('\n## INDEXING STATUS');
  for (const u of ['https://ilsanroom3.pages.dev/', 'https://ilsanroom3.pages.dev/legal/']) {
    try {
      const r = await inspectUrl(token, SITE, u);
      const idx = r.inspectionResult && r.inspectionResult.indexStatusResult || {};
      console.log(`${u} → verdict=${idx.verdict||'?'} coverage=${idx.coverageState||'?'} lastCrawl=${idx.lastCrawlTime||'없음'} robots=${idx.robotsTxtState||'?'}`);
    } catch (e) {
      console.log(`${u} → inspect 실패: ${e.message.slice(0,120)}`);
    }
  }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
