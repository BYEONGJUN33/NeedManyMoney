// 머니셈 정적 사이트 빌드. 외부 의존성 없이 Node만으로 dist/를 만든다.
//   node build.mjs                 → dist/ (배포용)
//   node build.mjs --preview       → dist-preview/ (광고·분석 없이 미리보기용)
//   node build.mjs --out=DIR       → 다른 폴더로 출력
//   node build.mjs --only=a,b      → 지정한 페이지(와 홈)만 빌드 (작업 중 빠른 확인용)
//   node build.mjs --strict        → 페이지 하나라도 불러오지 못하면 실패 (CI)
//
// 페이지는 src/pages/<slug>.meta.mjs(제목·설명·FAQ 등)와 src/pages/<slug>.html(본문)을 짝으로 두면 자동 등록된다.
import { readFile, writeFile, mkdir, rm, cp, access, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import cfg from './site.config.mjs';
import { CATEGORIES } from './src/categories.mjs';
import { calcSalary } from './src/assets/js/calc.js';
import { BASIS } from './src/assets/js/rates.js';
import { generateSalaryPages, salarySlug, manLabel } from './src/generators/salary-pages.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const PREVIEW = flag('preview');
const STRICT = flag('strict');
const ONLY = opt('only') ? new Set(opt('only').split(',').map((s) => s.trim()).filter(Boolean)) : null;
const OUT = resolve(ROOT, opt('out') || (PREVIEW ? 'dist-preview' : 'dist'));
const SITE = cfg.siteUrl.replace(/\/+$/, '');
const ads = PREVIEW ? {} : { client: cfg.adsenseClient, slots: cfg.adsenseSlots || {}, adfit: cfg.adfitUnits || {} };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => new Intl.NumberFormat('ko-KR').format(Math.round(n));
const pageUrl = (slug) => (slug === 'index' ? `${SITE}/` : `${SITE}/${slug}.html`);
const href = (slug) => (slug === 'index' ? './' : `${slug}.html`);
const exists = (p) => access(p).then(() => true, () => false);

/* ───────────── 페이지 불러오기 ───────────── */

const problems = [];
async function loadPages() {
  const dir = join(ROOT, 'src/pages');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.meta.mjs')).sort();
  const pages = [];
  for (const f of files) {
    const slug = f.replace(/\.meta\.mjs$/, '');
    try {
      const meta = (await import(pathToFileURL(join(dir, f)).href)).default;
      if (meta.slug !== slug) throw new Error(`slug '${meta.slug}'가 파일 이름과 다릅니다`);
      for (const k of ['title', 'description']) if (!meta[k]) throw new Error(`${k} 누락`);
      if (meta.kind === 'calculator') {
        for (const k of ['category', 'name', 'nav', 'desc']) if (!meta[k]) throw new Error(`${k} 누락`);
        if (!CATEGORIES.some((c) => c.key === meta.category)) throw new Error(`알 수 없는 category '${meta.category}'`);
      }
      const body = await readFile(join(dir, `${slug}.html`), 'utf8');
      if (meta.script && !(await exists(join(ROOT, 'src/assets/js/pages', meta.script)))) throw new Error(`스크립트 ${meta.script} 없음`);
      pages.push({ meta, body });
    } catch (e) {
      problems.push(`${f}: ${e.message}`);
    }
  }
  return pages;
}

const sourcePages = await loadPages();
if (problems.length) {
  console.warn(`페이지 ${problems.length}개를 건너뜀:\n  ${problems.join('\n  ')}`);
  if (STRICT) process.exit(1);
}
const generated = generateSalaryPages();
const ALL = [...sourcePages, ...generated];
const CALCS = sourcePages.map((p) => p.meta).filter((m) => m.kind === 'calculator')
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name, 'ko'));
const POPULAR = CALCS.filter((c) => c.popular).sort((a, b) => a.popular - b.popular).slice(0, 6);
const GUIDES = sourcePages.map((p) => p.meta).filter((m) => m.kind === 'guide')
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || String(b.updated).localeCompare(String(a.updated)));
const bySlug = Object.fromEntries(ALL.map((p) => [p.meta.slug, p.meta]));

/* ───────────── 조각 렌더러 ───────────── */

function adSlot(pos) {
  if (ads.client && ads.slots[pos]) {
    return `<div class="ad" aria-label="광고"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(ads.client)}" data-ad-slot="${esc(ads.slots[pos])}" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
  }
  if (ads.adfit && ads.adfit[pos]) {
    const [w, h] = cfg.adfitSize || [320, 100];
    return `<div class="ad" aria-label="광고"><ins class="kakao_ad_area" style="display:none" data-ad-unit="${esc(ads.adfit[pos])}" data-ad-width="${w}" data-ad-height="${h}"></ins></div>`;
  }
  return '';
}

const indexItem = (c) => `
      <li><a href="${href(c.slug)}"><span class="t">${esc(c.name)}</span><span class="d">${esc(c.desc)}</span><span class="go" aria-hidden="true">→</span></a></li>`;
const indexList = (items) => `<ul class="index-list">${items.map(indexItem).join('')}\n    </ul>`;

function categoryIndex(headingTag = 'h3') {
  return `<div class="cat-index">${CATEGORIES.map((cat) => {
    const items = CALCS.filter((c) => c.category === cat.key);
    if (!items.length) return '';
    return `
    <section class="cat" id="cat-${cat.key}" aria-labelledby="cat-${cat.key}-t">
      <${headingTag} class="cat-title" id="cat-${cat.key}-t">${esc(cat.name)} <span class="cat-count">${items.length}</span></${headingTag}>
      <p class="hint">${esc(cat.desc)}</p>
      ${indexList(items)}
    </section>`;
  }).join('')}
  </div>`;
}

const guideItem = (g) => ({ slug: g.slug, name: g.name, desc: g.desc });

function related(meta) {
  const cat = meta.category;
  const named = (meta.calcs || []).map((s) => CALCS.find((c) => c.slug === s)).filter(Boolean);
  const same = CALCS.filter((c) => c.category === cat && c.slug !== meta.slug && !named.includes(c));
  const others = POPULAR.filter((c) => c.category !== cat && c.slug !== meta.slug && !named.includes(c));
  const items = [...named, ...same, ...others].slice(0, 8);
  const guides = (meta.kind === 'guide'
    ? GUIDES.filter((g) => g.slug !== meta.slug && (g.category === cat || (g.calcs || []).some((s) => (meta.calcs || []).includes(s))))
    : GUIDES.filter((g) => (g.calcs || []).includes(meta.slug) || (meta.kind === 'generated' && (g.calcs || []).includes(meta.parent)))
  ).slice(0, 4);
  if (!items.length && !guides.length) return '';
  return `<section class="related" aria-labelledby="related-title">
    ${guides.length ? `<h2 id="related-guides">${meta.kind === 'guide' ? '다른 가이드' : '관련 가이드'}</h2>${indexList(guides.map(guideItem))}` : ''}
    <h2 id="related-title">함께 쓰는 계산기</h2>${indexList(items)}<p class="hint"><a href="all.html">전체 계산기 ${CALCS.length}개 보기 →</a>${GUIDES.length ? ` · <a href="guides.html">돈 가이드 ${GUIDES.length}편 →</a>` : ''}</p></section>`;
}

function guideIndex() {
  if (!GUIDES.length) return '<p class="hint">준비 중입니다.</p>';
  return indexList(GUIDES.map(guideItem));
}

function guideCalcs(meta) {
  const items = (meta.calcs || []).map((s) => CALCS.find((c) => c.slug === s)).filter(Boolean);
  if (!items.length) return '';
  return `<aside class="guide-calcs" aria-label="바로 계산해 보기"><span class="eyebrow">바로 계산해 보기</span><div class="chips">${items.map((c) => `<a class="chip" href="${href(c.slug)}">${esc(c.name)} →</a>`).join('')}</div></aside>`;
}

function faqHtml(meta) {
  if (!meta.faq?.length) return '';
  const items = meta.faq.map(([q, a]) => `
      <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
  return `<div class="faq">${items}\n    </div>`;
}

function salaryTable() {
  const amounts = [];
  for (let v = 2000; v <= 10000; v += 100) amounts.push(v);
  for (let v = 10500; v <= 15000; v += 500) amounts.push(v);
  for (let v = 16000; v <= 20000; v += 1000) amounts.push(v);
  const body = amounts.map((man) => {
    const a = man * 10_000;
    const r = calcSalary({ amount: a });
    const d = Object.fromEntries(r.deductions.map((x) => [x.key, x.value]));
    return `<tr data-annual="${a}"><td><a href="${salarySlug(man)}.html">${manLabel(man)}</a></td><td>${fmt(r.monthlyGross)}</td><td>${fmt(d.pension)}</td><td>${fmt(d.health)}</td><td>${fmt(d.care)}</td><td>${fmt(d.employment)}</td><td>${fmt(d.incomeTax)}</td><td>${fmt(d.localTax)}</td><td class="net">${fmt(r.monthlyNet)}</td><td>${fmt(r.annualNet)}</td></tr>`;
  }).join('\n');
  return `<table class="data">
      <caption class="skip">2026년 연봉별 월 실수령액 (비과세 20만원, 부양가족 1명)</caption>
      <thead><tr><th scope="col">연봉</th><th scope="col">월 급여</th><th scope="col">국민연금</th><th scope="col">건강보험</th><th scope="col">장기요양</th><th scope="col">고용보험</th><th scope="col">소득세</th><th scope="col">지방소득세</th><th scope="col">월 실수령액</th><th scope="col">연 실수령액</th></tr></thead>
      <tbody>
${body}
      </tbody>
    </table>`;
}

function homeTable() {
  const rows = [3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 10000].map((man) => {
    const r = calcSalary({ amount: man * 10_000 });
    return `<tr><td><a href="${salarySlug(man)}.html">${manLabel(man)}</a></td><td class="net">${fmt(r.monthlyNet)}</td><td>${fmt(r.totalDeduction)}</td><td>${(r.deductionRate * 100).toFixed(1)}%</td><td>${fmt(r.annualNet)}</td></tr>`;
  }).join('\n');
  return `<table class="data">
        <thead><tr><th scope="col">연봉</th><th scope="col">월 실수령액</th><th scope="col">월 공제액</th><th scope="col">공제율</th><th scope="col">연 실수령액</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>`;
}

function amountLinks() {
  const annual = [];
  for (let v = 2000; v <= 20000; v += 100) annual.push(v);
  const monthly = [];
  for (let v = 200; v <= 1000; v += 10) monthly.push(v);
  const chip = (slug, label) => `<a class="chip" href="${slug}.html">${label}</a>`;
  return `<h3>연봉별</h3><div class="chips link-chips">${annual.map((v) => chip(`salary-${v}`, manLabel(v).replace('원', ''))).join('')}</div>
      <h3>월급별</h3><div class="chips link-chips">${monthly.map((v) => chip(`wage-${v}`, manLabel(v).replace('원', ''))).join('')}</div>`;
}

const contact = cfg.contactEmail
  ? `<h2>문의</h2><p>오류 제보, 제휴 문의: <a href="mailto:${esc(cfg.contactEmail)}">${esc(cfg.contactEmail)}</a></p>`
  : '';

/* ───────────── 레이아웃 ───────────── */

function jsonLd(meta) {
  const graph = [];
  const crumbs = [{ name: cfg.name, item: `${SITE}/` }];
  if (meta.slug === 'index') {
    graph.push({ '@type': 'WebSite', name: cfg.name, url: `${SITE}/`, inLanguage: 'ko-KR', description: meta.description });
  }
  if (meta.kind === 'calculator') {
    graph.push({
      '@type': 'WebApplication',
      name: meta.name,
      url: pageUrl(meta.slug),
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      inLanguage: 'ko-KR',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    });
  }
  if (meta.kind === 'guide') {
    graph.push({
      '@type': 'Article',
      headline: meta.name,
      description: meta.description,
      inLanguage: 'ko-KR',
      datePublished: meta.published || BASIS.updated,
      dateModified: meta.updated || meta.published || BASIS.updated,
      mainEntityOfPage: pageUrl(meta.slug),
      image: ogImage(meta),
      author: { '@type': 'Organization', name: cfg.name, url: `${SITE}/` },
      publisher: { '@type': 'Organization', name: cfg.name, logo: { '@type': 'ImageObject', url: `${SITE}/assets/apple-touch-icon.png` } },
    });
  }
  if (meta.kind === 'calculator' || meta.kind === 'generated' || meta.kind === 'guide') {
    const parent = meta.kind === 'guide' ? bySlug.guides : meta.parent && bySlug[meta.parent];
    if (parent) crumbs.push({ name: parent.name, item: pageUrl(parent.slug) });
    crumbs.push({ name: meta.name, item: pageUrl(meta.slug) });
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })),
    });
  }
  if (meta.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: meta.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    });
  }
  if (!graph.length) return '';
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
}

const pageOg = new Set(
  (await readdir(join(ROOT, 'src/assets/og')).catch(() => [])).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)),
);
const ogImage = (meta) => `${SITE}/assets/${pageOg.has(meta.slug) ? `og/${meta.slug}.png` : 'og.png'}`;

const pageCss = new Set(
  (await readdir(join(ROOT, 'src/assets/css/pages')).catch(() => [])).filter((f) => f.endsWith('.css')).map((f) => f.slice(0, -4)),
);

function head(meta) {
  const title = PREVIEW && meta.previewTitle ? meta.previewTitle : meta.title;
  const url = pageUrl(meta.slug);
  const lines = [
    `<title>${esc(title)}</title>`,
    PREVIEW ? '<meta name="claude:viewport-fit-sides" content="cover">' : '',
    `<meta name="description" content="${esc(meta.description)}">`,
    meta.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`,
    meta.slug === '404' && !PREVIEW ? `<base href="${SITE}/">` : '',
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${esc(cfg.name)}">`,
    `<meta property="og:title" content="${esc(meta.slug === 'index' ? meta.title.replace(' | ', ' — ') : meta.title.split(' | ')[0])}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${ogImage(meta)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:locale" content="ko_KR">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="theme-color" content="#0d6a52" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="#141d19" media="(prefers-color-scheme: dark)">',
    '<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">',
    '<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">',
    cfg.googleSiteVerification && !PREVIEW ? `<meta name="google-site-verification" content="${esc(cfg.googleSiteVerification)}">` : '',
    cfg.naverSiteVerification && !PREVIEW ? `<meta name="naver-site-verification" content="${esc(cfg.naverSiteVerification)}">` : '',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hahmlet:wght@500;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">',
    '<link rel="stylesheet" href="assets/css/style.css">',
    pageCss.has(meta.slug) ? `<link rel="stylesheet" href="assets/css/pages/${meta.slug}.css">` : '',
    ads.client ? `<meta name="google-adsense-account" content="${esc(ads.client)}">` : '',
    ads.client ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(ads.client)}" crossorigin="anonymous"></script>` : '',
    cfg.gaMeasurementId && !PREVIEW ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(cfg.gaMeasurementId)}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(cfg.gaMeasurementId)}');</script>` : '',
    jsonLd(meta),
  ];
  return lines.filter(Boolean).join('\n');
}

function header(meta) {
  const current = meta.kind === 'generated' ? meta.parent : meta.slug;
  const links = POPULAR.map((c) => `<a href="${href(c.slug)}"${c.slug === current ? ' aria-current="page"' : ''}>${esc(c.nav)}</a>`).join('');
  return `<a class="skip" href="#main">본문 바로가기</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="./"${meta.slug === 'index' ? ' aria-current="page"' : ''}><svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14"/><path d="M14 20h6l5 20 5-20h4l5 20 5-20h6M12 30h40M12 37h40" fill="none" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>${esc(cfg.name)}</a>
    <nav class="nav" aria-label="계산기">${links}<a class="nav-all" href="all.html"${meta.slug === 'all' ? ' aria-current="page"' : ''}>전체 ${CALCS.length}</a></nav>
  </div>
</header>`;
}

function footer() {
  const cols = CATEGORIES.map((cat) => {
    const items = CALCS.filter((c) => c.category === cat.key);
    if (!items.length) return '';
    return `<div><h2>${esc(cat.name)}</h2>${items.map((c) => `<a href="${href(c.slug)}">${esc(c.name)}</a>`).join('')}</div>`;
  }).join('');
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-cols">${cols}</div>
    <nav aria-label="사이트"><a href="all.html">전체 계산기</a>${GUIDES.length ? '<a href="guides.html">돈 가이드</a>' : ''}<a href="salary-table.html">연봉 실수령액 표</a><a href="about.html">소개·계산 기준</a><a href="privacy.html">개인정보처리방침</a></nav>
    <p>계산 결과는 참고용이며 실제 급여·세금·대출 조건에 따라 달라질 수 있습니다. 기준일 ${BASIS.updated}.</p>
    <p>© ${new Date().getFullYear()} ${esc(cfg.name)}</p>
  </div>
</footer>`;
}

function render({ meta, body: fragment }) {
  const usesAdfit = !!(ads.adfit && Object.values(ads.adfit).some(Boolean));
  const body = fragment
    .replaceAll('{{BASIS}}', BASIS.label)
    .replaceAll('{{UPDATED}}', BASIS.updated)
    .replaceAll('{{CALC_COUNT}}', String(CALCS.length))
    .replace('<!--faq-->', faqHtml(meta))
    .replace('<!--related-->', related(meta))
    .replace('<!--calc-index-->', categoryIndex())
    .replace('<!--salary-table-->', salaryTable())
    .replace('<!--home-table-->', homeTable())
    .replace('<!--amount-links-->', amountLinks())
    .replace('<!--guide-index-->', guideIndex())
    .replace('<!--guide-calcs-->', guideCalcs(meta))
    .replaceAll('{{GUIDE_COUNT}}', String(GUIDES.length))
    .replaceAll('<!--contact-->', contact)
    .replace(/<!--ad:(\w+)-->/g, (_, pos) => adSlot(pos));
  const scripts = [
    meta.script ? `<script type="module" src="assets/js/pages/${meta.script}"></script>` : '',
    usesAdfit ? '<script async src="https://t1.daumcdn.net/kas/static/ba.min.js"></script>' : '',
  ].filter(Boolean).join('\n');
  const main = `${header(meta)}
<main id="main">
${body}
${adSlot('bottom')}
</main>
${footer()}
${scripts}`;
  // 미리보기의 첫 페이지는 아티팩트 뼈대가 감싸므로 html/head/body 태그 없이 내보낸다
  if (PREVIEW && meta.slug === 'index') return `${head(meta)}\n${main}\n`;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head(meta)}
</head>
<body>
${main}
</body>
</html>
`;
}

/* ───────────── 빌드 ───────────── */

await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, 'assets'), { recursive: true });
await cp(join(ROOT, 'src/assets'), join(OUT, 'assets'), { recursive: true });

const targets = ONLY ? ALL.filter((p) => ONLY.has(p.meta.slug) || p.meta.slug === 'index') : ALL;
for (const page of targets) {
  await writeFile(join(OUT, `${page.meta.slug}.html`), render(page));
}

const indexable = ALL.filter((p) => !p.meta.noindex);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${pageUrl(p.meta.slug)}</loc><lastmod>${BASIS.updated}</lastmod><priority>${p.meta.priority || '0.6'}</priority></url>`).join('\n')}
</urlset>
`;
await writeFile(join(OUT, 'sitemap.xml'), sitemap);
await writeFile(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
if (ads.client) {
  await writeFile(join(OUT, 'ads.txt'), `google.com, ${ads.client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);
}
await writeFile(join(OUT, '.nojekyll'), '');
if (!(await exists(join(OUT, 'assets/og.png')))) console.warn('경고: src/assets/og.png 가 없습니다. node scripts/og.mjs 로 만드세요.');

console.log(`빌드 완료 → ${OUT} (${targets.length}개 페이지 · 계산기 ${CALCS.length}개 · 가이드 ${GUIDES.length}편 · 금액별 ${generated.length}개${PREVIEW ? ' · 미리보기' : ''})`);
