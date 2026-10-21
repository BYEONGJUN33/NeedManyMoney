// 공유 미리보기 이미지(og.png)와 홈 화면 아이콘을 Chromium으로 렌더링한다.
//   node scripts/og.mjs
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// playwright는 전역 설치본도 찾을 수 있도록 require로 불러온다 (npx playwright 또는 npm i -D playwright)
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const icon = await readFile(join(ROOT, 'src/assets/favicon.svg'), 'utf8');
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hahmlet:wght@700&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans+KR:wght@500;700&display=swap">';

const og = `<!doctype html><html><head><meta charset="utf-8">${fonts}<style>
  body{margin:0;width:1200px;height:630px;background:#f3f6f4;font-family:"IBM Plex Sans KR",sans-serif;color:#13201b;display:grid;grid-template-columns:1fr 430px;align-items:center;gap:56px;padding:0 80px;box-sizing:border-box}
  .b{display:flex;align-items:center;gap:14px;font:700 34px Hahmlet,serif}
  .b svg{width:52px;height:52px}
  h1{font:700 64px/1.2 Hahmlet,serif;letter-spacing:-0.03em;margin:36px 0 20px}
  h1 em{font-style:normal;color:#0d6a52}
  p{font-size:26px;color:#3f4f49;margin:0}
  .slip{background:#fff;border:1px solid #d3ddd8;border-radius:16px;box-shadow:0 18px 40px -20px rgba(19,32,27,.35);overflow:hidden}
  .h{padding:28px 30px 22px;border-top:6px solid #f6e9cf}
  .e{font-size:17px;font-weight:700;letter-spacing:.08em;color:#9a5d07}
  .n{font:700 58px Hahmlet,serif;letter-spacing:-0.03em;margin-top:6px}
  .n small{font-size:26px;margin-left:4px}
  .r{border-top:1.5px dashed #b6c4be;padding:10px 30px 18px}
  .r div{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #d3ddd8;font-size:19px;color:#3f4f49}
  .r div:last-child{border:0}
  .r b{font:500 19px "IBM Plex Mono",monospace;color:#b3361f}
</style></head><body>
  <div><div class="b">${icon}머니셈</div><h1>월급에서 빠지는 돈,<br><em>1원 단위까지.</em></h1><p>2026 연봉 실수령액 · 퇴직금 · 대출 · 예적금 · 시급</p></div>
  <div class="slip"><div class="h"><div class="e">연봉 4,000만원 실수령액</div><div class="n">2,935,813<small>원/월</small></div></div>
  <div class="r"><div>국민연금<b>−148,810</b></div><div>건강보험<b>−112,640</b></div><div>장기요양<b>−14,800</b></div><div>고용보험<b>−28,190</b></div><div>소득세 · 지방세<b>−93,080</b></div></div></div>
</body></html>`;

const touch = `<!doctype html><html><head><style>body{margin:0}svg{display:block;width:180px;height:180px}</style></head><body>${icon.replace('rx="14"', 'rx="0"')}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(og, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(ROOT, 'src/assets/og.png') });
await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(touch);
await page.screenshot({ path: join(ROOT, 'src/assets/apple-touch-icon.png') });
await browser.close();
console.log('og.png, apple-touch-icon.png 생성 완료');
