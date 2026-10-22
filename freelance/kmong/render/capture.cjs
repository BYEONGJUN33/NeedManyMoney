// 샘플 사이트·자동화 도구 화면 캡처 → ../../dist/shots/  (Playwright 필요)
//   node capture.cjs   (먼저 ../../kit 에서 node build.mjs --all)
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(DIST, 'shots');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = p.startsWith('/automation/') ? path.join(ROOT, p) : path.join(DIST, p);
  fs.readFile(file, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  const settle = async (page) => {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in')); document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; }); document.querySelector('.sample-ribbon')?.remove(); });
    await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = r; i.onerror = r; })))));
    await page.waitForTimeout(500);
  };
  for (const name of ['cafe', 'pilates', 'interior', 'app']) {
    // PC 첫 화면 + 전체 길이
    let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    let page = await ctx.newPage();
    await page.goto(`${base}/${name}/`, { waitUntil: 'networkidle' }).catch(() => {});
    await settle(page);
    await page.screenshot({ path: path.join(OUT, `${name}-desk.png`) });
    const full = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 1440, height: full });
    await settle(page);
    await page.screenshot({ path: path.join(OUT, `${name}-desk-full.png`) });
    await ctx.close();
    // 휴대폰 첫 화면 (2배 해상도)
    ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    page = await ctx.newPage();
    await page.goto(`${base}/${name}/`, { waitUntil: 'networkidle' }).catch(() => {});
    await settle(page);
    await page.screenshot({ path: path.join(OUT, `${name}-phone.png`) });
    await ctx.close();
    console.log('✓', name);
  }
  // 자동화 도구: 예시 데이터를 넣은 화면
  for (const tool of ['merge-tool', 'order-tool']) {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(`${base}/automation/${tool}.html`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForFunction(() => window.XLSX && window.__tool);
    await page.evaluate(() => { try { localStorage.clear(); } catch {} });
    await page.click('#demo');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${tool}-full.png`), fullPage: true });
    const out = await page.$('#outCard');
    await out.screenshot({ path: path.join(OUT, `${tool}-result.png`) });
    await ctx.close();
    console.log('✓', tool);
  }
  await browser.close();
  srv.close();
});
