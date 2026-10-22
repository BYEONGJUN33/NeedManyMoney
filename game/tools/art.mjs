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
  ['assets/store/cover-1920x1080.png', 1920, 1080, 'land', 300],
  ['assets/store/cover-800x1200.png', 800, 1200, 'port', 300],
  ['assets/store/cover-800x800.png', 800, 800, 'square', 300],
  ['assets/store/thumb-512x384.png', 512, 384, 'land', 300],
  ['assets/cover.jpg', 1200, 630, 'og', 300],
  ['assets/store/screenshot-1.png', 1280, 720, 'bare', 120],
  ['assets/store/screenshot-2.png', 1280, 720, 'bare', 330],
];
const browser = await chromium.launch();
for (const [file, w, h, layout, t] of shots) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(`${base}/tools/art.html?layout=${layout}&t=${t}`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  // 공유 미리보기는 용량이 작은 JPEG로 (게임 모음 첫 화면에서도 쓴다)
  await page.screenshot({ path: join(ROOT, file), ...(file.endsWith('.jpg') ? { type: 'jpeg', quality: 86 } : {}) });
  await page.close();
  console.log('✓', file);
}
// 아이콘: SVG 아이콘을 큰 크기로
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const svg = await readFile(join(ROOT, 'assets/icon.svg'), 'utf8');
  await page.setContent(`<style>body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg.replace('rx="14"', 'rx="0"')}`);
  await page.screenshot({ path: join(ROOT, `assets/icon-${size}.png`) });
  await page.close();
  console.log('✓', `assets/icon-${size}.png`);
}
await browser.close();
server.close();
