// 앱 로고 PNG 만들기: apps/<id>/logo.svg → store/<id>/logo-600.png (토스 콘솔 규격: 600×600, 모서리 없음, 배경 채움)
// 실행: NODE_PATH=$(npm root -g) node tools/logos.mjs   (전역 playwright 사용)
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
for (const d of await readdir(join(ROOT, 'apps'), { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const svg = await readFile(join(ROOT, 'apps', d.name, 'logo.svg'), 'utf8').catch(() => null);
  if (!svg) continue;
  const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
  await page.setContent(`<style>body{margin:0}svg{display:block;width:600px;height:600px}</style>${svg}`);
  await mkdir(join(ROOT, 'store', d.name), { recursive: true });
  await page.screenshot({ path: join(ROOT, 'store', d.name, 'logo-600.png') });
  await page.close();
  console.log('✓', `store/${d.name}/logo-600.png`);
}
await browser.close();
