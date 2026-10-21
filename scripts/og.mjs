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

// 계산기·가이드별 공유 이미지: 페이지 이름과 한 줄 설명을 큰 글씨로
const CAT_NAMES = Object.fromEntries((await import('../src/categories.mjs')).CATEGORIES.map((c) => [c.key, c.name]));
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const card = (m) => `<!doctype html><html><head><meta charset="utf-8">${fonts}<style>
  body{margin:0;width:1200px;height:630px;background:#f3f6f4;font-family:"IBM Plex Sans KR",sans-serif;color:#13201b;box-sizing:border-box;padding:72px 80px;display:grid;grid-template-rows:auto 1fr auto}
  .b{display:flex;align-items:center;gap:14px;font:700 32px Hahmlet,serif}
  .b svg{width:48px;height:48px}
  .tag{display:inline-block;margin-top:56px;padding:6px 16px;border-radius:999px;background:#dcefe7;color:#08513e;font-size:22px;font-weight:700}
  h1{font:700 76px/1.15 Hahmlet,serif;letter-spacing:-0.03em;margin:22px 0 0;max-width:1000px}
  p{font-size:30px;color:#3f4f49;margin:20px 0 0;max-width:980px;line-height:1.45}
  .f{display:flex;justify-content:space-between;align-items:center;border-top:3px solid #13201b;padding-top:22px;font-size:22px;color:#64746e}
  .f b{color:#0d6a52;font:500 22px "IBM Plex Mono",monospace}
</style></head><body>
  <div class="b">${icon}머니셈</div>
  <div><span class="tag">${esc(m.kind === 'guide' ? '돈 가이드' : CAT_NAMES[m.category] || '계산기')}</span><h1>${esc(m.name)}</h1><p>${esc(m.desc)}</p></div>
  <div class="f"><span>2026년 기준 · 가입 없이 무료</span><b>moneysem</b></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(og, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(ROOT, 'src/assets/og.png') });

const { readdir, mkdir } = await import('node:fs/promises');
const { pathToFileURL } = await import('node:url');
await mkdir(join(ROOT, 'src/assets/og'), { recursive: true });
const dir = join(ROOT, 'src/pages');
let n = 0;
for (const f of (await readdir(dir)).filter((x) => x.endsWith('.meta.mjs'))) {
  const m = (await import(pathToFileURL(join(dir, f)).href)).default;
  if (m.kind !== 'calculator' && m.kind !== 'guide') continue;
  await page.setContent(card(m), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(ROOT, 'src/assets/og', `${m.slug}.png`) });
  n += 1;
}

await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(touch);
await page.screenshot({ path: join(ROOT, 'src/assets/apple-touch-icon.png') });
await browser.close();
console.log(`og.png, 페이지별 공유 이미지 ${n}개, apple-touch-icon.png 생성 완료`);
