// NOVA SWARM 토스 미니앱 번들: dist/ 에 게임 파일 + SDK 브릿지를 넣는다. 이어서 `ait build`가 dist/를 .ait로 묶는다.
//   npm run build                         → 테스트 광고 ID로 빌드 (개발·토스앱 테스트용)
//   TOSS_AD_REWARDED=<콘솔 광고 그룹 ID> npm run build → 출시용
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME = join(HERE, '..');
const OUT = join(HERE, 'dist');
// 개발 단계에서는 반드시 테스트 ID를 써야 한다 (운영 ID로 테스트하면 제재 대상)
const TEST_REWARDED = 'ait-ad-test-rewarded-id';
const rewarded = process.env.TOSS_AD_REWARDED || TEST_REWARDED;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const item of ['style.css', 'src', 'assets/fonts', 'assets/icon.svg']) await cp(join(GAME, item), join(OUT, item), { recursive: true });

await build({
  entryPoints: [join(HERE, 'bridge.js')],
  bundle: true,
  format: 'iife',
  target: ['es2019', 'safari13'],
  minify: true,
  outfile: join(OUT, 'toss-bridge.js'),
  logLevel: 'warning',
});

const cfg = `window.NOVA_PORTAL="toss";window.NOVA_TOSS_ADS=${JSON.stringify({ rewarded })};`;
let html = await readFile(join(GAME, 'index.html'), 'utf8');
html = html
  .replace('<html lang="en">', '<html lang="ko">')
  .replace('<link rel="manifest" href="manifest.webmanifest">\n', '')
  .replace(/<meta property="og:[^>]*>\n/g, '')
  .replace('<script type="module" src="src/main.js"></script>', `<script>${cfg}</script>\n<script src="toss-bridge.js"></script>\n<script type="module" src="src/main.js"></script>`);
if (!html.includes('toss-bridge.js')) throw new Error('index.html 스크립트 자리를 찾지 못했어요');
await writeFile(join(OUT, 'index.html'), html);
console.log(`토스 번들 → ${OUT} (보상형 광고 ID: ${rewarded === TEST_REWARDED ? '테스트용' : rewarded})`);
