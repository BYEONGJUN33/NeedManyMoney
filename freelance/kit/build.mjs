// 고객 사이트 빌드: node build.mjs <사이트 폴더> [--out=출력 폴더]
//   사이트 폴더 = site.json + img/ (원본 사진)
//   node build.mjs --all   → ../samples/* 전부 (../dist/<이름>/)
import { readFile, writeFile, mkdir, copyFile, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage, faviconSvg, collectImages, esc } from './lib/render.mjs';

const KIT = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

/** 설정 확인: 빠뜨리기 쉬운 항목을 빌드 전에 알려 준다 */
export function validate(site) {
  const errors = [];
  for (const k of ['name', 'description', 'sections']) if (!site[k]) errors.push(`${k}가 없습니다`);
  if (site.sections && site.sections[0]?.type !== 'hero') errors.push('첫 섹션은 hero여야 합니다');
  const ids = new Set();
  for (const s of site.sections || []) {
    if (s.nav && !s.id) errors.push(`메뉴(nav)에 나오는 섹션은 id가 필요합니다: ${s.type}`);
    if (s.id) { if (ids.has(s.id)) errors.push(`id 중복: ${s.id}`); ids.add(s.id); }
  }
  if ((site.description || '').length > 160) errors.push('description은 160자 이하로 (검색 결과에서 잘림)');
  return errors;
}

function privacyPage(site) {
  const formSec = site.sections.find((s) => s.type === 'form');
  const fields = formSec.fields.filter((f) => /name|phone|tel|email|이름|연락처/i.test(`${f.name} ${f.label}`)).map((f) => f.label);
  const b = site.business || {};
  const ct = site.contact || {};
  const who = b.company || site.name;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>개인정보처리방침 | ${esc(site.name)}</title><meta name="robots" content="noindex"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"><link rel="stylesheet" href="site.css"><style>main{padding:48px 0 80px}h1{font-size:30px;margin-bottom:24px}h2{font-size:20px;margin:28px 0 8px}p,li{color:var(--muted)}</style></head><body><main class="wrap narrow">
<p><a href="./">← ${esc(site.name)}</a></p>
<h1>개인정보처리방침</h1>
<p>${esc(who)}(이하 "회사")는 문의 응대를 위해 최소한의 개인정보만 수집하며, 「개인정보 보호법」에 따라 아래와 같이 처리합니다.</p>
<h2>1. 수집 항목과 목적</h2><p>수집 항목: ${esc(fields.join(', ') || '이름, 연락처')}, 문의 내용<br>목적: 문의·상담·예약 응대</p>
<h2>2. 보유 기간</h2><p>상담 완료 후 1년간 보관한 뒤 지체 없이 파기합니다. 관계 법령에 따라 보관이 필요한 경우 그 기간 동안 보관합니다.</p>
<h2>3. 제3자 제공·처리 위탁</h2><p>수집한 정보를 제3자에게 제공하지 않습니다.${formSec.action ? ` 문의 접수를 위해 ${esc(formSec.provider === 'sheet' ? 'Google LLC(구글 시트)' : 'Formspree, Inc.')}에 처리를 위탁합니다.` : ''}</p>
<h2>4. 정보주체의 권리</h2><p>언제든지 개인정보 열람·정정·삭제·처리 정지를 요구할 수 있으며, 아래 연락처로 요청하시면 지체 없이 조치합니다.</p>
<h2>5. 개인정보 보호책임자</h2><p>${esc(b.owner || '대표자')} · ${esc(ct.phone || '')} ${esc(ct.email || '')}</p>
<h2>6. 시행일</h2><p>${new Date().toISOString().slice(0, 10)}</p>
</main></body></html>
`;
}

export async function buildSite(dir, out) {
  const site = JSON.parse(await readFile(join(dir, 'site.json'), 'utf8'));
  const errors = validate(site);
  if (errors.length) throw new Error(`${dir}\n - ${errors.join('\n - ')}`);
  await mkdir(join(out, 'img'), { recursive: true });

  // 사진: WebP 여러 크기 + 공유 이미지
  const list = collectImages(site);
  const og = site.ogImage || site.sections[0].image || list[0];
  const py = spawnSync('python3', [join(KIT, 'lib/images.py')], { input: JSON.stringify({ src: join(dir, 'img'), out: join(out, 'img'), images: list.map((p) => p.replace(/^img\//, '')), og: og?.replace(/^img\//, '') }), encoding: 'utf8', maxBuffer: 1 << 26 });
  if (py.status !== 0) throw new Error(`사진 처리 실패 (python3 + Pillow 필요)\n${py.stderr}`);
  const raw = JSON.parse(py.stdout);
  site._og = Boolean(og);
  const images = Object.fromEntries(list.map((p) => [p, raw[p.replace(/^img\//, '')]]));

  const hasForm = site.sections.some((s) => s.type === 'form');
  if (hasForm && !site.privacyUrl) site.privacyUrl = 'privacy.html';
  await writeFile(join(out, 'index.html'), renderPage(site, images));
  if (hasForm && site.privacyUrl === 'privacy.html') await writeFile(join(out, 'privacy.html'), privacyPage(site));
  await copyFile(join(KIT, 'assets/site.css'), join(out, 'site.css'));
  await copyFile(join(KIT, 'assets/site.js'), join(out, 'site.js'));
  await writeFile(join(out, 'favicon.svg'), faviconSvg(site));
  const url = site.url?.replace(/\/?$/, '/');
  await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n${url ? `\nSitemap: ${url}sitemap.xml\n` : ''}`);
  if (url) await writeFile(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${url}</loc></url>\n</urlset>\n`);
  const size = (await Promise.all((await readdir(join(out, 'img'))).map((f) => stat(join(out, 'img', f))))).reduce((s, x) => s + x.size, 0);
  return { name: site.name, out, images: list.length, kb: Math.round(size / 1024) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dirs = args.includes('--all')
    ? (await readdir(join(KIT, '../samples'))).map((d) => join(KIT, '../samples', d))
    : args.filter((a) => !a.startsWith('--')).map((d) => resolve(d));
  if (!dirs.length) { console.error('사용법: node build.mjs <사이트 폴더> [--out=폴더] | --all'); process.exit(1); }
  for (const dir of dirs) {
    const out = resolve(opt('out') && dirs.length === 1 ? opt('out') : join(KIT, '../dist', basename(dir)));
    const r = await buildSite(dir, out);
    console.log(`✓ ${r.name}: 사진 ${r.images}장 (${r.kb}KB) → ${r.out}`);
  }
}
