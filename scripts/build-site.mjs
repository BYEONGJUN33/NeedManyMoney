// 사이트 전체 빌드: 첫 화면(NOVA LAB) + 게임 3개 + 머니셈 계산기를 dist/ 하나로 모은다
// 실행: node scripts/build-site.mjs (Cloudflare Pages의 빌드 명령, GitHub Actions도 같은 것을 쓴다)
//   / = 첫 화면, /swarm/ /blocks/ /merge/ = 게임, /money/ = 계산기
// 사이트 주소(SITE_URL): 환경 변수 > Cloudflare Pages 빌드면 <프로젝트>.pages.dev > GitHub Pages 기본 주소
// 그 밖에 ADSENSE_CLIENT, GA_ID, CONTACT_EMAIL, KMONG_URL 환경 변수는 각 빌드에 그대로 넘긴다
import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');

function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  // CF_PAGES_URL은 이번 배포의 주소(https://<해시>.<프로젝트>.pages.dev)라서 맨 앞 이름을 떼면 진짜 주소가 된다
  if (process.env.CF_PAGES_URL) return `https://${new URL(process.env.CF_PAGES_URL).hostname.split('.').slice(1).join('.')}`;
  return 'https://byeongjun33.github.io/NeedManyMoney';
}
const SITE = siteUrl();

const steps = [
  ['첫 화면', 'hub', ['build.mjs', `--out=${OUT}`], SITE],
  ['NOVA SWARM', 'game', ['build.mjs', `--out=${join(OUT, 'swarm')}`], `${SITE}/swarm`],
  ['NOVA BLOCKS', 'blocks', ['build.mjs', `--out=${join(OUT, 'blocks')}`], `${SITE}/blocks`],
  ['NOVA MERGE', 'merge', ['build.mjs', `--out=${join(OUT, 'merge')}`], `${SITE}/merge`],
  ['머니셈 계산기', '.', ['build.mjs', '--strict', `--out=${join(OUT, 'money')}`], `${SITE}/money`],
];

await rm(OUT, { recursive: true, force: true });
console.log(`사이트 주소: ${SITE}`);
for (const [name, dir, args, url] of steps) {
  const r = spawnSync(process.execPath, args, { cwd: join(ROOT, dir), env: { ...process.env, SITE_URL: url }, stdio: 'inherit' });
  if (r.status !== 0) { console.error(`✗ ${name} 빌드 실패`); process.exit(1); }
  console.log(`✓ ${name}`);
}
