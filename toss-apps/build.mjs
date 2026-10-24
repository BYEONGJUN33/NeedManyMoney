// 토스 미니앱 빌드: node build.mjs <앱 폴더 이름|all>
//   apps/<id>/ 의 index.html·app.js·app.css·app.json + 공용 키트(kit/) → apps/<id>/dist → ait build → out/<appName>.ait
// 광고 ID: 기본은 테스트 ID. 출시할 때 콘솔에서 받은 ID를 환경 변수로 넣는다
//   AD_BANNER_<ID>=…  AD_REWARDED_<ID>=…   (ID는 폴더 이름 대문자, 예: AD_BANNER_SALARY)
import { readFile, writeFile, mkdir, rm, readdir, copyFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const ROOT = dirname(fileURLToPath(import.meta.url));
const TEST = { banner: 'ait-ad-test-banner-id', rewarded: 'ait-ad-test-rewarded-id' };
const AIT = join(ROOT, 'node_modules/@apps-in-toss/web-framework/bin/ait.js');
const target = process.argv[2] || 'all';
const skipAit = process.argv.includes('--no-ait'); // 브라우저 점검만 할 때

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function buildApp(id) {
  const dir = join(ROOT, 'apps', id);
  const meta = JSON.parse(await readFile(join(dir, 'app.json'), 'utf8'));
  const out = join(dir, 'dist');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  const common = { bundle: true, format: 'iife', target: ['es2019', 'safari13'], minify: true, logLevel: 'warning' };
  await build({ ...common, entryPoints: [join(ROOT, 'kit/bridge.js')], outfile: join(out, 'bridge.js') });
  await build({ ...common, entryPoints: [join(dir, 'app.js')], outfile: join(out, 'app.js') });

  const css = await readFile(join(ROOT, 'kit/kit.css'), 'utf8');
  const appCss = await readFile(join(dir, 'app.css'), 'utf8').catch(() => '');
  await writeFile(join(out, 'style.css'), `${css}\n${appCss}`);

  const env = (kind) => process.env[`AD_${kind.toUpperCase()}_${id.toUpperCase().replace(/-/g, '_')}`];
  const ads = { banner: env('banner') || TEST.banner, rewarded: env('rewarded') || TEST.rewarded };
  const cfg = { appName: meta.appName, ads };
  const body = await readFile(join(dir, 'index.html'), 'utf8');
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#f2f4f6">
<title>${esc(meta.title)}</title>
<link rel="stylesheet" href="style.css">
<style>:root{--brand:${meta.color || '#3182f6'};--brand-soft:${meta.soft || '#e8f3ff'}}</style>
</head>
<body>
${body.trim()}
<div class="ad-slot" id="ad-slot" aria-label="광고"></div>
<script>window.APP_CFG=${JSON.stringify(cfg)};</script>
<script src="bridge.js"></script>
<script src="app.js"></script>
</body>
</html>
`;
  await writeFile(join(out, 'index.html'), html);
  const usingTest = ads.banner === TEST.banner || ads.rewarded === TEST.rewarded;

  if (!skipAit) {
    const r = spawnSync(process.execPath, [AIT, 'build'], { cwd: dir, encoding: 'utf8', env: { ...process.env, AIT_LANG: 'ko' } });
    if (r.status !== 0) throw new Error(`ait build 실패 (${id}):\n${r.stdout}\n${r.stderr}`);
    await mkdir(join(ROOT, 'out'), { recursive: true });
    const file = `${meta.appName}.ait`;
    await access(join(dir, file));
    await copyFile(join(dir, file), join(ROOT, 'out', file));
  }
  console.log(`✓ ${id} → ${skipAit ? out : `out/${meta.appName}.ait`}${usingTest ? ' (테스트 광고 ID)' : ''}`);
}

const ids = target === 'all' ? (await readdir(join(ROOT, 'apps'), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name) : [target];
for (const id of ids) await buildApp(id);
