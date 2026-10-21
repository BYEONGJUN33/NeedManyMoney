// 머니셈 정적 사이트 빌드. 외부 의존성 없이 Node만으로 dist/를 만든다.
//   node build.mjs            → dist/ (배포용)
//   node build.mjs --preview  → dist-preview/ (광고·분석 없이 미리보기용)
import { readFile, writeFile, mkdir, rm, cp, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import cfg from './site.config.mjs';
import { PAGES, CALCULATORS } from './src/pages.mjs';
import { calcSalary } from './src/assets/js/calc.js';
import { BASIS } from './src/assets/js/rates.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PREVIEW = process.argv.includes('--preview');
const OUT = join(ROOT, PREVIEW ? 'dist-preview' : 'dist');
const SITE = cfg.siteUrl.replace(/\/+$/, '');
const ads = PREVIEW ? {} : { client: cfg.adsenseClient, slots: cfg.adsenseSlots || {}, adfit: cfg.adfitUnits || {} };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => new Intl.NumberFormat('ko-KR').format(Math.round(n));
const manwon = (n) => {
  const eok = Math.floor(n / 1e8);
  const man = Math.round((n % 1e8) / 1e4);
  return `${eok ? `${eok}억` : ''}${eok && man ? ' ' : ''}${man ? `${fmt(man)}만` : ''}원`;
};
const pageUrl = (slug) => (slug === 'index' ? `${SITE}/` : `${SITE}/${slug}.html`);
const href = (slug) => (slug === 'index' ? './' : `${slug}.html`);
const exists = (p) => access(p).then(() => true, () => false);

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

function calcIndex(exclude) {
  const items = CALCULATORS.filter((c) => c.slug !== exclude).map((c) => `
      <li><a href="${href(c.slug)}"><span class="t">${esc(c.name)}</span><span class="d">${esc(c.desc)}</span><span class="go" aria-hidden="true">→</span></a></li>`).join('');
  return `<ul class="index-list">${items}\n    </ul>`;
}

function faqHtml(page) {
  if (!page.faq) return '';
  const items = page.faq.map(([q, a]) => `
      <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
  return `<div class="faq">${items}\n    </div>`;
}

function salaryTable() {
  const amounts = [];
  for (let v = 20e6; v <= 100e6; v += 1e6) amounts.push(v);
  for (let v = 105e6; v <= 150e6; v += 5e6) amounts.push(v);
  for (let v = 160e6; v <= 200e6; v += 10e6) amounts.push(v);
  const body = amounts.map((a) => {
    const r = calcSalary({ amount: a });
    const d = Object.fromEntries(r.deductions.map((x) => [x.key, x.value]));
    return `<tr data-annual="${a}"><td><a href="salary.html?amount=${a}">${manwon(a)}</a></td><td>${fmt(r.monthlyGross)}</td><td>${fmt(d.pension)}</td><td>${fmt(d.health)}</td><td>${fmt(d.care)}</td><td>${fmt(d.employment)}</td><td>${fmt(d.incomeTax)}</td><td>${fmt(d.localTax)}</td><td class="net">${fmt(r.monthlyNet)}</td><td>${fmt(r.annualNet)}</td></tr>`;
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
  const rows = [30, 35, 40, 45, 50, 60, 70, 80, 100].map((m) => {
    const a = m * 1e6;
    const r = calcSalary({ amount: a });
    return `<tr><td><a href="salary.html?amount=${a}">${manwon(a)}</a></td><td class="net">${fmt(r.monthlyNet)}</td><td>${fmt(r.totalDeduction)}</td><td>${(r.deductionRate * 100).toFixed(1)}%</td><td>${fmt(r.annualNet)}</td></tr>`;
  }).join('\n');
  return `<table class="data">
        <thead><tr><th scope="col">연봉</th><th scope="col">월 실수령액</th><th scope="col">월 공제액</th><th scope="col">공제율</th><th scope="col">연 실수령액</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>`;
}

const contact = cfg.contactEmail
  ? `<h2>문의</h2><p>오류 제보, 제휴 문의: <a href="mailto:${esc(cfg.contactEmail)}">${esc(cfg.contactEmail)}</a></p>`
  : '';

/* ───────────── 레이아웃 ───────────── */

function jsonLd(page) {
  const graph = [];
  if (page.slug === 'index') {
    graph.push({ '@type': 'WebSite', name: cfg.name, url: `${SITE}/`, inLanguage: 'ko-KR', description: page.description });
  } else if (CALCULATORS.some((c) => c.slug === page.slug)) {
    const calc = CALCULATORS.find((c) => c.slug === page.slug);
    graph.push({
      '@type': 'WebApplication',
      name: calc.name,
      url: pageUrl(page.slug),
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      inLanguage: 'ko-KR',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    });
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: cfg.name, item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: calc.name, item: pageUrl(page.slug) },
      ],
    });
  }
  if (page.faq) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: page.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    });
  }
  if (!graph.length) return '';
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
}

function head(page) {
  const title = PREVIEW && page.previewTitle ? page.previewTitle : page.title;
  const url = pageUrl(page.slug);
  const lines = [
    `<title>${esc(title)}</title>`,
    PREVIEW ? '<meta name="claude:viewport-fit-sides" content="cover">' : '',
    `<meta name="description" content="${esc(page.description)}">`,
    page.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`,
    page.slug === '404' && !PREVIEW ? `<base href="${SITE}/">` : '',
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${esc(cfg.name)}">`,
    `<meta property="og:title" content="${esc(page.slug === 'index' ? page.title.replace(' | ', ' — ') : page.title.split(' | ')[0])}">`,
    `<meta property="og:description" content="${esc(page.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${SITE}/assets/og.png">`,
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
    ads.client ? `<meta name="google-adsense-account" content="${esc(ads.client)}">` : '',
    ads.client ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(ads.client)}" crossorigin="anonymous"></script>` : '',
    cfg.gaMeasurementId && !PREVIEW ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(cfg.gaMeasurementId)}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(cfg.gaMeasurementId)}');</script>` : '',
    jsonLd(page),
  ];
  return lines.filter(Boolean).join('\n');
}

function header(page) {
  const links = CALCULATORS.map((c) => `<a href="${href(c.slug)}"${c.slug === page.slug ? ' aria-current="page"' : ''}>${esc(c.nav)}</a>`).join('');
  return `<a class="skip" href="#main">본문 바로가기</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="./"${page.slug === 'index' ? ' aria-current="page"' : ''}><svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14"/><path d="M14 20h6l5 20 5-20h4l5 20 5-20h6M12 30h40M12 37h40" fill="none" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>${esc(cfg.name)}</a>
    <nav class="nav" aria-label="계산기">${links}</nav>
  </div>
</header>`;
}

function footer() {
  const links = [...CALCULATORS.map((c) => [c.slug, c.name]), ['about', '소개·계산 기준'], ['privacy', '개인정보처리방침']]
    .map(([slug, name]) => `<a href="${href(slug)}">${esc(name)}</a>`).join('');
  return `<footer class="site-footer">
  <div class="wrap">
    <nav aria-label="사이트">${links}</nav>
    <p>계산 결과는 참고용이며 실제 급여·세금·대출 조건에 따라 달라질 수 있습니다. 기준일 ${BASIS.updated}.</p>
    <p>© ${new Date().getFullYear()} ${esc(cfg.name)}</p>
  </div>
</footer>`;
}

function render(page, fragment) {
  const usesAdfit = !!(ads.adfit && Object.values(ads.adfit).some(Boolean));
  let body = fragment
    .replaceAll('{{BASIS}}', BASIS.label)
    .replaceAll('{{UPDATED}}', BASIS.updated)
    .replace('<!--faq-->', faqHtml(page))
    .replace('<!--related-->', `<section class="related" aria-labelledby="related-title"><h2 id="related-title">다른 계산기</h2>${calcIndex(page.slug)}</section>`)
    .replace('<!--calc-index-->', calcIndex())
    .replace('<!--salary-table-->', salaryTable())
    .replace('<!--home-table-->', homeTable())
    .replaceAll('<!--contact-->', contact)
    .replace(/<!--ad:(\w+)-->/g, (_, pos) => adSlot(pos));
  const scripts = [
    page.script ? `<script type="module" src="assets/js/pages/${page.script}"></script>` : '',
    usesAdfit ? '<script async src="https://t1.daumcdn.net/kas/static/ba.min.js"></script>' : '',
  ].filter(Boolean).join('\n');
  const main = `${header(page)}
<main id="main">
${body}
${adSlot('bottom')}
</main>
${footer()}
${scripts}`;
  // 미리보기의 첫 페이지는 아티팩트 뼈대가 감싸므로 html/head/body 태그 없이 내보낸다
  if (PREVIEW && page.slug === 'index') return `${head(page)}\n${main}\n`;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head(page)}
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

for (const page of PAGES) {
  const fragment = await readFile(join(ROOT, 'src/pages', `${page.slug}.html`), 'utf8');
  await writeFile(join(OUT, `${page.slug}.html`), render(page, fragment));
}

const today = BASIS.updated;
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.filter((p) => !p.noindex).map((p) => `  <url><loc>${pageUrl(p.slug)}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>`).join('\n')}
</urlset>
`;
await writeFile(join(OUT, 'sitemap.xml'), sitemap);
await writeFile(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
if (ads.client) {
  await writeFile(join(OUT, 'ads.txt'), `google.com, ${ads.client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);
}
await writeFile(join(OUT, '.nojekyll'), '');
if (!(await exists(join(OUT, 'assets/og.png')))) console.warn('경고: src/assets/og.png 가 없습니다. node scripts/og.mjs 로 만드세요.');

console.log(`빌드 완료 → ${OUT} (${PAGES.length}개 페이지${PREVIEW ? ', 미리보기' : ''})`);
