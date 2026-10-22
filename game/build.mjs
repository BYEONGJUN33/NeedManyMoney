// NOVA SWARM 배포 빌드 (외부 의존성 없음)
//   node build.mjs                → dist/web (자체 사이트) + dist/<portal>.zip (포털 제출용)
//   node build.mjs --out=../dist  → 자체 사이트 파일을 지정한 폴더에 (GitHub Pages 배포용)
// 환경 변수: SITE_URL(정식 주소), ADSENSE_CLIENT(자체 사이트 H5 게임 광고), GD_GAME_ID(GameDistribution)
import { readFile, writeFile, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const ROOT = dirname(fileURLToPath(import.meta.url));
const opt = (name) => process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const DIST = join(ROOT, 'dist');
const WEB_OUT = resolve(ROOT, opt('out') || join(DIST, 'web'));
const SITE = (process.env.SITE_URL || 'https://byeongjun33.github.io/NeedManyMoney').replace(/\/+$/, '');
const INCLUDE = ['index.html', 'style.css', 'manifest.webmanifest', 'src', 'assets'];

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    if ((await stat(p)).isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

async function collect() {
  const files = [];
  for (const item of INCLUDE) {
    const p = join(ROOT, item);
    const st = await stat(p).catch(() => null);
    if (!st) continue;
    if (st.isDirectory()) files.push(...await walk(p));
    else files.push(p);
  }
  return files
    .filter((f) => !f.includes(`${join('assets', 'store')}`)) // 포털 등록용 큰 이미지는 게임 파일에서 뺀다
    .map((f) => ({ path: relative(ROOT, f).split('\\').join('/'), abs: f }));
}

/** index.html에 배포 대상별 설정을 넣는다 */
function patchHtml(html, { portal, web }) {
  const cfg = [`window.NOVA_PORTAL=${JSON.stringify(portal)};`];
  if (portal === 'h5') cfg.push(`window.NOVA_ADSENSE=${JSON.stringify(process.env.ADSENSE_CLIENT)};`);
  if (portal === 'gd') cfg.push(`window.NOVA_GD_ID=${JSON.stringify(process.env.GD_GAME_ID || '')};`);
  let out = html.replace('<script type="module" src="src/main.js"></script>', `<script>${cfg.join('')}</script>\n<script type="module" src="src/main.js"></script>`);
  if (web) {
    out = out.replace('<link rel="icon"', `<link rel="canonical" href="${SITE}/">\n<meta property="og:url" content="${SITE}/">\n<meta name="twitter:card" content="summary_large_image">\n<link rel="icon"`)
      .replace('content="assets/cover.png"', `content="${SITE}/assets/cover.png"`)
      .replace('</body>', `<noscript><p style="padding:24px">NOVA SWARM needs JavaScript. <a href="${SITE}/money/">Money calculators</a></p></noscript>\n</body>`);
  } else {
    // 포털은 iframe 안에서 실행되므로 설치형 앱 설정을 뺀다
    out = out.replace('<link rel="manifest" href="manifest.webmanifest">\n', '');
  }
  return out;
}

/* ───────── 최소 zip 작성기 (deflate) ───────── */
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const comp = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10); local.writeUInt16LE(0x21, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, comp);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10); central.writeUInt16LE(0, 12); central.writeUInt16LE(0x21, 14); central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + comp.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

/* ───────── 빌드 ───────── */
const files = await collect();
const html = await readFile(join(ROOT, 'index.html'), 'utf8');

await rm(WEB_OUT, { recursive: true, force: true });
for (const f of files) {
  const dest = join(WEB_OUT, f.path);
  await mkdir(dirname(dest), { recursive: true });
  const data = f.path === 'index.html'
    ? Buffer.from(patchHtml(html, { portal: process.env.ADSENSE_CLIENT ? 'h5' : 'none', web: true }))
    : await readFile(f.abs);
  await writeFile(dest, data);
}
await writeFile(join(WEB_OUT, '.nojekyll'), '');
await writeFile(join(WEB_OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\nSitemap: ${SITE}/money/sitemap.xml\n`);
await writeFile(join(WEB_OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc><priority>1.0</priority></url>\n</urlset>\n`);
if (process.env.ADSENSE_CLIENT) {
  await writeFile(join(WEB_OUT, 'ads.txt'), `google.com, ${process.env.ADSENSE_CLIENT.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);
}

if (!opt('out')) {
  for (const portal of ['crazygames', 'poki', 'gd']) {
    const entries = [];
    for (const f of files) {
      // 공유 미리보기·설치 아이콘은 포털 iframe에서 쓰지 않으므로 zip에서 뺀다
      if (/^assets\/(cover|icon-\d+)\.png$/.test(f.path)) continue;
      const data = f.path === 'index.html' ? Buffer.from(patchHtml(html, { portal, web: false })) : await readFile(f.abs);
      entries.push({ name: f.path, data });
    }
    await mkdir(DIST, { recursive: true });
    await writeFile(join(DIST, `nova-swarm-${portal}.zip`), zip(entries));
  }
}

const size = (await Promise.all(files.map((f) => stat(f.abs)))).reduce((s, x) => s + x.size, 0);
console.log(`NOVA SWARM 빌드 완료: ${files.length}개 파일, ${(size / 1024).toFixed(0)}KB → ${WEB_OUT}${opt('out') ? '' : ' + 포털 zip 3개'}`);
