// 게임 모음 첫 화면 빌드: node build.mjs --out=../dist
// 사이트 맨 위(/)에 index.html, 404.html, robots.txt, sitemap.xml(각 하위 사이트 지도 묶음), ads.txt를 만든다.
// 환경 변수: SITE_URL(사이트 맨 위 주소), ADSENSE_CLIENT(자동 광고 + ads.txt)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const opt = (name) => process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const OUT = resolve(ROOT, opt('out') || join(ROOT, 'dist'));
const SITE = (process.env.SITE_URL || 'https://byeongjun33.github.io/NeedManyMoney').replace(/\/+$/, '');
const ADSENSE = process.env.ADSENSE_CLIENT || '';
const SECTIONS = ['swarm', 'blocks', 'merge', 'money'];

let html = await readFile(join(ROOT, 'index.html'), 'utf8');
html = html
  .replace('<link rel="icon"', `<link rel="canonical" href="${SITE}/">\n<meta property="og:url" content="${SITE}/">\n<meta name="twitter:card" content="summary_large_image">\n<link rel="icon"`)
  .replace('content="swarm/assets/cover.jpg"', `content="${SITE}/swarm/assets/cover.jpg"`);
if (ADSENSE) {
  html = html.replace('</head>', `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}" crossorigin="anonymous"></script>\n</head>`);
}

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'index.html'), html);
await writeFile(join(OUT, '.nojekyll'), '');
await writeFile(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
// 사이트 지도 묶음: 각 하위 사이트가 자기 sitemap.xml을 만든다
const today = new Date().toISOString().slice(0, 10);
await writeFile(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE}/sitemap-hub.xml</loc><lastmod>${today}</lastmod></sitemap>
${SECTIONS.map((s) => `  <sitemap><loc>${SITE}/${s}/sitemap.xml</loc><lastmod>${today}</lastmod></sitemap>`).join('\n')}
</sitemapindex>
`);
await writeFile(join(OUT, 'sitemap-hub.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc><priority>1.0</priority></url>\n</urlset>\n`);
// GitHub Pages는 맨 위 404.html만 쓴다: 없는 주소로 오면 게임 모음으로 안내
await writeFile(join(OUT, '404.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found — NOVA Arcade</title><meta name="robots" content="noindex"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070912;color:#e8f1ff;font:18px/1.5 system-ui,sans-serif;text-align:center}a{color:#3df2ff}</style></head><body><main><h1>404</h1><p>Page not found · 페이지를 찾을 수 없습니다</p><p><a href="${SITE}/">NOVA Arcade →</a></p></main></body></html>\n`);
if (ADSENSE) await writeFile(join(OUT, 'ads.txt'), `google.com, ${ADSENSE.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);
console.log(`게임 모음 첫 화면 빌드 완료 → ${OUT}`);
