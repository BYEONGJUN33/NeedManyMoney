// 크몽용 이미지 만들기 → ../images/   (먼저 node capture.cjs)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '../images');
fs.mkdirSync(OUT, { recursive: true });
const jobs = [
  ['thumb-web.html', 'thumb-web', 652, 488, 'png'],
  ['thumb-auto.html', 'thumb-auto', 652, 488, 'png'],
  ...['cafe', 'pilates', 'interior', 'app'].map((n) => [`portfolio.html?name=${n}`, `portfolio-${n}`, 1200, 1200, 'jpg', 1]),
  ...['merge', 'order'].map((n) => [`portfolio-tool.html?name=${n}`, `portfolio-${n}-tool`, 1200, 1200, 'jpg', 1]),
  ['detail-web.html', 'detail-web', 860, 0, 'jpg', 1],
  ['detail-auto.html', 'detail-auto', 860, 0, 'jpg', 1],
];
(async () => {
  const only = process.argv[2];
  const browser = await chromium.launch();
  for (const [file, name, w, h, type, scaleOnly] of jobs) {
    if (only && !name.includes(only)) continue;
    for (const scale of scaleOnly ? [scaleOnly] : [1, 2]) {
      const page = await browser.newPage({ viewport: { width: w, height: h || 1000 }, deviceScaleFactor: scale });
      await page.goto(`file://${path.join(__dirname, file.split('?')[0])}${file.includes('?') ? `?${file.split('?')[1]}` : ''}`);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; })))));
      await page.waitForTimeout(300);
      if (!h) await page.setViewportSize({ width: w, height: await page.evaluate(() => document.documentElement.scrollHeight) });
      const target = path.join(OUT, `${name}${scale === 2 ? '@2x' : ''}.${type}`);
      await page.screenshot({ path: target, type: type === 'jpg' ? 'jpeg' : 'png', quality: type === 'jpg' ? 86 : undefined });
      if (!h) {
        // 긴 상세 이미지는 구역 경계에서 2,400px 이하 조각으로도 저장 (등록 화면 높이 제한 대비)
        const cuts = await page.evaluate(() => [...document.querySelectorAll('body > section')].map((el) => el.offsetTop).concat(document.documentElement.scrollHeight));
        let start = 0;
        let part = 1;
        for (let i = 1; i < cuts.length; i += 1) {
          const next = cuts[i + 1];
          if (next === undefined || next - start > 2400) {
            await page.screenshot({ path: path.join(OUT, `${name}-${part}.jpg`), type: 'jpeg', quality: 86, clip: { x: 0, y: start, width: w, height: cuts[i] - start } });
            console.log('  ✓', `${name}-${part}.jpg`, cuts[i] - start);
            start = cuts[i];
            part += 1;
          }
        }
      }
      await page.close();
      console.log('✓', path.basename(target));
    }
  }
  await browser.close();
})();
