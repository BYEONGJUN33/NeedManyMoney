// 브라우저 점검: 지정한 페이지를 빌드해 휴대폰(390px·라이트)과 PC(1280px·다크)에서 열고
// 가로 넘침, 콘솔 오류, 스크립트 오류를 찾는다. 문제가 있으면 종료 코드 1.
//   node scripts/check.mjs --only=salary,loan [--shots=폴더]
//   node scripts/check.mjs            (전체 계산기·고정 페이지, 금액별 페이지는 표본만)
import { createServer } from 'node:http';
import { readFile, stat, mkdir, rm } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const opt = (name) => process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const only = opt('only');
const shots = opt('shots');
const out = join(tmpdir(), `moneysem-check-${process.pid}`);

execFileSync(process.execPath, [join(ROOT, 'build.mjs'), `--out=${out}`, ...(only ? [`--only=${only}`] : [])], { stdio: 'inherit' });

let slugs = only ? only.split(',').map((s) => s.trim()).filter(Boolean) : null;
if (!slugs) {
  const { readdir } = await import('node:fs/promises');
  slugs = (await readdir(out)).filter((f) => f.endsWith('.html') && !/^(salary|wage)-\d+\.html$/.test(f)).map((f) => f.slice(0, -5));
  slugs.push('salary-4000', 'salary-20000', 'wage-300');
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(out, path);
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch { /* 404 아래에서 처리 */ }
  try {
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
if (shots) await mkdir(shots, { recursive: true });

const browser = await chromium.launch();
let failed = 0;
for (const [w, h, scheme] of [[390, 844, 'light'], [1280, 900, 'dark']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
  for (const slug of slugs) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push(`스크립트 오류: ${e.message}`));
    page.on('requestfailed', (r) => { if (r.url().startsWith(base)) errs.push(`로드 실패: ${r.url()}`); });
    page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) errs.push(`HTTP ${r.status()}: ${r.url()}`); });
    await page.goto(`${base}${slug === 'index' ? '' : `${slug}.html`}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > vw + 1 && !el.closest('.table-wrap,.nav,.formula,.skip,.toast,.dock'))
        .slice(0, 4).map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
      const empty = [...document.querySelectorAll('.big-num')].filter((el) => !el.textContent.trim()).length;
      return { overflow: document.documentElement.scrollWidth - vw, wide, empty, title: document.title };
    });
    const issues = [...errs];
    if (info.overflow > 0) issues.push(`가로 넘침 ${info.overflow}px: ${info.wide.join(', ')}`);
    if (info.empty) issues.push(`결과 숫자가 비어 있음 (${info.empty}곳)`);
    if (issues.length) failed += 1;
    console.log(`${issues.length ? '✗' : '✓'} ${w}px ${scheme} ${slug} — ${info.title}${issues.length ? `\n    ${issues.join('\n    ')}` : ''}`);
    if (shots) await page.screenshot({ path: join(shots, `${slug}-${w}-${scheme}.png`), fullPage: true });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
server.close();
await rm(out, { recursive: true, force: true });
console.log(failed ? `\n문제 ${failed}건` : '\n문제 없음');
process.exit(failed ? 1 : 0);
