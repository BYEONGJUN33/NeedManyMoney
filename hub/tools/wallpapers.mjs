// 메인 페이지 배경화면 만들기: wallpapers.html의 장면을 캡처해서 hub/img/wall/<장면>.webp(가로)·<장면>-tall.webp(세로)로 저장
// 실행: node hub/tools/wallpapers.mjs [장면…] (저장소 맨 위에서, playwright 필요)
// 머니셈 계산기와 토스 미니앱 화면을 실제로 띄워 찍기 때문에 두 사이트를 먼저 빌드한다.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'hub/img/wall');
const SCENES = ['default', 'games', 'swarm', 'boss', 'money', 'apps', 'planner', 'work', 'nova'];
const only = process.argv.slice(2);
const todo = only.length ? SCENES.filter((s) => only.includes(s)) : SCENES;
const { chromium } = createRequire(import.meta.url)('playwright');

const run = (args, cwd) => {
  const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${args.join(' ')} 실패\n${r.stdout}\n${r.stderr}`);
};
const money = await mkdtemp(join(tmpdir(), 'wall-money-'));
if (todo.includes('money')) run(['build.mjs', `--out=${money}`], ROOT);
if (todo.includes('apps')) run(['build.mjs', 'all', '--no-ait'], join(ROOT, 'toss-apps'));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = p.startsWith('/money/') ? join(money, p.slice(7)) : join(ROOT, p);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const k of todo) {
  for (const [s, width, height] of [['wide', 1600, 900], ['tall', 720, 1280]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${base}/hub/tools/wallpapers.html?k=${k}&s=${s}`);
    await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
    const png = (await page.screenshot()).toString('base64');
    // 브라우저 캔버스로 WebP 변환 (따로 이미지 도구를 깔지 않아도 됨)
    const webp = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/webp', 0.74).split(',')[1];
    }, png);
    const name = `${k}${s === 'tall' ? '-tall' : ''}.webp`;
    const buf = Buffer.from(webp, 'base64');
    await writeFile(join(OUT, name), buf);
    console.log(`${name} ${width}×${height} ${Math.round(buf.length / 1024)}KB`);
    await page.close();
  }
}
await browser.close();
server.close();
await rm(money, { recursive: true, force: true });
