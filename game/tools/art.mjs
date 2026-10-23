// 포털 등록용 표지·아이콘 이미지 생성: node tools/art.mjs
// 결과: assets/store/*.png (포털 업로드용), assets/cover.jpg (공유 미리보기), assets/icon-192/512.png
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(await readFile(join(ROOT, p)));
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
await mkdir(join(ROOT, 'assets/store'), { recursive: true });

const shots = [
  // 마지막 값: 보스 체력 비율(탄막 단계). 0.6 = 워든 나선 단계, 0.3 = 꽃잎 단계
  ['assets/store/cover-1920x1080.png', 1920, 1080, 'land', 302, 0.6],
  ['assets/store/cover-800x1200.png', 800, 1200, 'port', 302, 0.6],
  ['assets/store/cover-800x800.png', 800, 800, 'square', 302, 0.6],
  ['assets/store/thumb-512x384.png', 512, 384, 'land', 302, 0.6],
  ['assets/cover.jpg', 1200, 630, 'og', 302, 0.6],
  ['assets/store/screenshot-1.png', 1280, 720, 'bare', 120],
  ['assets/store/screenshot-2.png', 1280, 720, 'bare', 302, 0.3],
  // 토스 미니앱 콘솔: 썸네일 1932×828, 세로 스크린샷 636×1048 (3장 이상)
  ['assets/store/toss/thumb-1932x828.png', 1932, 828, 'land', 302, 0.6, '몰려오는 적을 버티고 탄막을 피하라'],
  ['assets/store/toss/screenshot-1.png', 636, 1048, 'bare', 120],
  ['assets/store/toss/screenshot-2.png', 636, 1048, 'bare', 302, 0.6],
  ['assets/store/toss/screenshot-3.png', 636, 1048, 'bare', 302, 0.3],
];
const browser = await chromium.launch();
for (const [file, w, h, layout, t, boss, sub] of shots) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await mkdir(dirname(join(ROOT, file)), { recursive: true });
  await page.goto(`${base}/tools/art.html?layout=${layout}&t=${t}${boss ? `&boss=${boss}` : ''}${sub ? `&sub=${encodeURIComponent(sub)}` : ''}`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  // 공유 미리보기는 용량이 작은 JPEG로 (게임 모음 첫 화면에서도 쓴다)
  await page.screenshot({ path: join(ROOT, file), ...(file.endsWith('.jpg') ? { type: 'jpeg', quality: 86 } : {}) });
  await page.close();
  console.log('✓', file);
}
// 아이콘: SVG 아이콘을 큰 크기로
// 토스 앱 로고는 600×600, 모서리 없이 배경을 채운 PNG
for (const [size, file] of [[192, 'assets/icon-192.png'], [512, 'assets/icon-512.png'], [600, 'assets/store/toss/logo-600.png']]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const svg = await readFile(join(ROOT, 'assets/icon.svg'), 'utf8');
  await page.setContent(`<style>body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg.replace('rx="14"', 'rx="0"')}`);
  await page.screenshot({ path: join(ROOT, file) });
  await page.close();
  console.log('✓', file);
}
await browser.close();
server.close();
