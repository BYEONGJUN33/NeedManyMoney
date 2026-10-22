// 사이트 설정(site.json) → HTML. 섹션마다 함수 하나. 새 섹션은 SECTIONS에 추가한다.
import { icon } from './icons.mjs';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/** 줄바꿈(\n)은 <br>로, **굵게**는 <strong>으로 */
export const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
const paras = (t) => (Array.isArray(t) ? t : t ? [t] : []).map((p) => `<p>${rich(p)}</p>`).join('');
const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join('');

/** 렌더링에 필요한 공용 도구 (이미지 메타데이터, 사이트 설정) */
export function makeCtx(site, images) {
  const img = (src, alt, { sizes = '100vw', cls, eager = false } = {}) => {
    if (!src) return '';
    const m = images[src];
    if (!m) throw new Error(`이미지 정보 없음: ${src}`);
    const largest = m.widths[m.widths.length - 1];
    const mid = m.widths.find((w) => w >= 960) || largest;
    const srcset = m.widths.map((w) => `img/${m.base}-${w}.webp ${w}w`).join(', ');
    return `<img${attrs({ class: cls, src: `img/${m.base}-${mid}.webp`, srcset, sizes, width: m.w, height: m.h, alt: alt ?? '', loading: eager ? 'eager' : 'lazy', fetchpriority: eager ? 'high' : undefined, decoding: 'async' })}>`;
  };
  return { site, img };
}

const btn = (b, extra = '') => {
  const ext = /^https?:/.test(b.href || '') && !b.href.includes(';');
  return `<a class="btn ${b.style || 'primary'} ${extra}" href="${esc(b.href || '#')}"${ext ? ' target="_blank" rel="noopener"' : ''}>${b.icon ? icon(b.icon) : ''}<span>${esc(b.label)}</span></a>`;
};
const btns = (list, extra) => (list?.length ? `<div class="btns">${list.map((b) => btn(b, extra)).join('')}</div>` : '');
const head = (s, align = '') => (s.title || s.eyebrow || s.text
  ? `<div class="sec-head ${align}">${s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ''}${s.title ? `<h2>${rich(s.title)}</h2>` : ''}${s.text ? `<p class="sub">${rich(s.text)}</p>` : ''}</div>`
  : '');

/* ───────── 섹션 ───────── */

function hero(s, c) {
  const v = s.variant || 'full';
  const text = `<div class="hero-text">
      ${s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ''}
      <h1>${rich(s.title)}</h1>
      ${s.text ? `<p class="lead">${rich(s.text)}</p>` : ''}
      ${btns(s.buttons, 'lg')}
      ${s.badges?.length ? `<ul class="badges">${s.badges.map((b) => `<li>${b.icon ? icon(b.icon) : ''}${esc(b.label)}</li>`).join('')}</ul>` : ''}
    </div>`;
  if (v === 'full') {
    return `<section class="hero hero-full" id="${esc(s.id || 'top')}">
    <div class="hero-bg">${c.img(s.image, s.alt || '', { eager: true, sizes: '100vw' })}</div>
    <div class="wrap">${text}</div>
    ${s.scrollHint ? '<a class="scroll-hint" href="#main" aria-label="아래로">↓</a>' : ''}
  </section>`;
  }
  if (v === 'page') {
    return `<section class="hero hero-page${s.image ? ' has-img' : ''}" id="${esc(s.id || 'top')}">
    ${s.image ? `<div class="hero-bg">${c.img(s.image, s.alt || '', { eager: true, sizes: '100vw' })}</div>` : ''}
    <div class="wrap">${text}</div>
  </section>`;
  }
  if (v === 'split') {
    const card = s.card ? `<div class="hero-card">${s.card.icon ? icon(s.card.icon) : ''}<div><b>${esc(s.card.title)}</b><small>${esc(s.card.text)}</small></div></div>` : '';
    return `<section class="hero hero-split" id="${esc(s.id || 'top')}">
    <div class="wrap">${text}<div class="hero-media">${c.img(s.image, s.alt || '', { eager: true, sizes: '(min-width: 900px) 50vw, 100vw' })}${card}</div></div>
  </section>`;
  }
  if (v === 'app') {
    return `<section class="hero hero-app" id="${esc(s.id || 'top')}">
    <div class="glow" aria-hidden="true"></div>
    <div class="wrap">${text}<div class="hero-phone">${phone(s.screen || 'home', c)}</div></div>
  </section>`;
  }
  throw new Error(`hero variant 없음: ${v}`);
}

function about(s, c) {
  return `<div class="wrap about ${s.reverse ? 'reverse' : ''}">
    <div class="about-media">${c.img(s.image, s.alt || '', { sizes: '(min-width: 900px) 45vw, 100vw' })}</div>
    <div class="about-text">
      ${s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ''}
      <h2>${rich(s.title)}</h2>
      <div class="prose">${paras(s.body)}</div>
      ${s.stats?.length ? `<dl class="stats">${s.stats.map((x) => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join('')}</dl>` : ''}
      ${btns(s.buttons)}
    </div>
  </div>`;
}

function features(s) {
  const cols = s.columns || Math.min(4, s.items.length);
  return `<div class="wrap">${head(s, 'center')}
    <ul class="features cols-${cols}">${s.items.map((f) => `<li class="feature">
      ${f.icon ? `<span class="feature-ico">${icon(f.icon)}</span>` : ''}
      <h3>${esc(f.title)}</h3><p>${rich(f.text)}</p></li>`).join('')}</ul>
  </div>`;
}

function menu(s, c) {
  return `<div class="wrap">${head(s, 'center')}
    <div class="menu-groups">${s.groups.map((g) => `<div class="menu-group">
      ${g.image ? `<div class="menu-img">${c.img(g.image, g.name, { sizes: '(min-width: 900px) 33vw, 100vw' })}</div>` : ''}
      <h3>${esc(g.name)}</h3>
      <ul>${g.items.map((it) => `<li>
        <div class="menu-row"><span class="menu-name">${esc(it.name)}${it.tag ? ` <em class="tag">${esc(it.tag)}</em>` : ''}</span><span class="menu-dots" aria-hidden="true"></span><span class="menu-price">${esc(it.price)}</span></div>
        ${it.desc ? `<p class="menu-desc">${esc(it.desc)}</p>` : ''}</li>`).join('')}</ul></div>`).join('')}</div>
    ${s.note ? `<p class="note center">${rich(s.note)}</p>` : ''}
  </div>`;
}

function pricing(s) {
  return `<div class="wrap">${head(s, 'center')}
    <div class="plans">${s.plans.map((p) => `<article class="plan ${p.highlight ? 'hot' : ''}">
      ${p.highlight ? `<span class="plan-badge">${esc(p.highlight === true ? '추천' : p.highlight)}</span>` : ''}
      <h3>${esc(p.name)}</h3>
      ${p.desc ? `<p class="plan-desc">${esc(p.desc)}</p>` : ''}
      <p class="price"><b>${esc(p.price)}</b>${p.unit ? `<small>${esc(p.unit)}</small>` : ''}</p>
      <ul>${(p.features || []).map((f) => `<li>${icon('check')}${esc(f)}</li>`).join('')}</ul>
      ${p.cta ? btn({ style: p.highlight ? 'primary' : 'ghost', ...p.cta }, 'block') : ''}
    </article>`).join('')}</div>
    ${s.note ? `<p class="note center">${rich(s.note)}</p>` : ''}
  </div>`;
}

function gallery(s, c) {
  return `<div class="wrap">${head(s, 'center')}
    <div class="gallery n${s.images.length}">${s.images.map((g) => `<figure><a href="img/${c.site._images[g.src].base}-${c.site._images[g.src].widths.at(-1)}.webp" data-lightbox aria-label="${esc(g.alt || '사진 크게 보기')}">${c.img(g.src, g.alt, { sizes: '(min-width: 900px) 33vw, 50vw' })}</a>${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}</figure>`).join('')}</div>
  </div>`;
}

function steps(s) {
  return `<div class="wrap">${head(s, 'center')}
    <ol class="steps n${s.items.length}">${s.items.map((it, i) => `<li><span class="step-n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(it.title)}</h3><p>${rich(it.text)}</p></li>`).join('')}</ol>
  </div>`;
}

function portfolio(s, c) {
  return `<div class="wrap">${head(s)}
    <div class="works">${s.items.map((w) => `<article class="work">
      <a class="work-img" href="img/${c.site._images[w.image].base}-${c.site._images[w.image].widths.at(-1)}.webp" data-lightbox aria-label="${esc(w.title)} 크게 보기">${c.img(w.image, w.title, { sizes: '(min-width: 900px) 50vw, 100vw' })}</a>
      <div class="work-body"><h3>${esc(w.title)}</h3>
      ${w.meta?.length ? `<ul class="chips">${w.meta.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
      ${w.text ? `<p>${rich(w.text)}</p>` : ''}</div>
    </article>`).join('')}</div>
  </div>`;
}

function testimonials(s, c) {
  const stars = (n = 5) => `<span class="stars" aria-label="별점 ${n}점">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
  return `<div class="wrap">${head(s, 'center')}
    <div class="quotes">${s.items.map((q) => `<figure class="quote">${stars(q.rating)}<blockquote>${rich(q.quote)}</blockquote><figcaption><b>${esc(q.name)}</b>${q.meta ? ` · ${esc(q.meta)}` : ''}</figcaption></figure>`).join('')}</div>
    ${c.site.sample ? '<p class="note center">샘플 사이트의 후기는 예시 문구입니다.</p>' : ''}
  </div>`;
}

function faq(s) {
  return `<div class="wrap narrow">${head(s, 'center')}
    <div class="faq">${s.items.map((f, i) => `<details${i === 0 && s.openFirst ? ' open' : ''}><summary>${esc(f.q)}${icon('plus', 'ico faq-ico')}</summary><div class="faq-a">${paras(f.a)}</div></details>`).join('')}</div>
  </div>`;
}

function location(s, c) {
  const ct = c.site.contact || {};
  const address = s.address || ct.address;
  const q = encodeURIComponent(s.mapQuery || address || c.site.name);
  const hours = s.hours || ct.hours || [];
  // map: "google"(실제 지도 임베드, 기본) | "card"(그림 지도: 샘플·지도 없이 쓰고 싶을 때)
  const map = (s.map || (c.site.sample ? 'card' : 'google')) === 'card'
    ? mapCard(s.mapLabel || c.site.name)
    : `<iframe title="지도" src="https://maps.google.com/maps?q=${q}&z=${s.zoom || 16}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  return `<div class="wrap">${head(s)}
    <div class="location">
      <div class="map">${map}</div>
      <div class="loc-info">
        ${address ? `<p class="loc-row">${icon('pin')}<span>${esc(address)}</span></p>` : ''}
        ${ct.phone ? `<p class="loc-row">${icon('phone')}<a href="tel:${esc(ct.phone.replace(/[^0-9+]/g, ''))}">${esc(ct.phone)}</a></p>` : ''}
        ${s.transit ? `<p class="loc-row">${icon('car')}<span>${rich(s.transit)}</span></p>` : ''}
        ${hours.length ? `<table class="hours"><tbody>${hours.map(([d, h]) => `<tr><th>${esc(d)}</th><td>${esc(h)}</td></tr>`).join('')}</tbody></table>` : ''}
        <div class="btns">
          <a class="btn ghost sm" href="https://map.naver.com/p/search/${q}" target="_blank" rel="noopener">${icon('pin')}<span>네이버 지도</span></a>
          <a class="btn ghost sm" href="https://map.kakao.com/?q=${q}" target="_blank" rel="noopener">${icon('pin')}<span>카카오맵</span></a>
        </div>
      </div>
    </div>
  </div>`;
}

/** 그림 지도: 블록·길·공원 위에 핀과 이름표 */
function mapCard(label) {
  const blocks = [[18, 22, 92, 58], [124, 18, 70, 64], [210, 26, 96, 52], [322, 20, 66, 62], [16, 100, 70, 74], [100, 112, 86, 60], [254, 104, 60, 70], [330, 96, 58, 84], [20, 196, 96, 80], [132, 200, 74, 76], [222, 192, 90, 86], [328, 206, 60, 74]];
  return `<svg class="map-card" viewBox="0 0 400 300" role="img" aria-label="${esc(label)} 위치 안내 그림"><rect width="400" height="300" class="m-bg"/>
    ${blocks.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="m-block"/>`).join('')}
    <path d="M-10 92H410M-10 186H410M118 -10V310M318 -10V310" class="m-road"/>
    <path d="M190 -10C206 80 222 150 238 310" class="m-park"/>
    <circle cx="214" cy="140" r="26" class="m-pulse"/>
    <path d="M214 160s-16-14-16-26a16 16 0 1 1 32 0c0 12-16 26-16 26Z" class="m-pin"/><circle cx="214" cy="134" r="6" class="m-pin-dot"/>
    <g transform="translate(214 92)"><rect x="-70" y="-30" width="140" height="34" rx="17" class="m-label"/><text y="-8" text-anchor="middle" class="m-text">${esc(label)}</text></g>
  </svg>`;
}

function cta(s) {
  return `<div class="wrap cta-band"><div>${s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ''}<h2>${rich(s.title)}</h2>${s.text ? `<p>${rich(s.text)}</p>` : ''}</div>${btns(s.buttons, 'lg')}</div>`;
}

function form(s, c) {
  const field = (f) => {
    const id = `f-${f.name}`;
    const req = f.required ? ' required' : '';
    const label = `<label for="${id}">${esc(f.label)}${f.required ? ' <i>*</i>' : ''}</label>`;
    if (f.type === 'select') return `<div class="field">${label}<select id="${id}" name="${esc(f.name)}"${req}><option value="">선택하세요</option>${f.options.map((o) => `<option>${esc(o)}</option>`).join('')}</select></div>`;
    if (f.type === 'textarea') return `<div class="field wide">${label}<textarea id="${id}" name="${esc(f.name)}" rows="4" placeholder="${esc(f.placeholder || '')}"${req}></textarea></div>`;
    if (f.type === 'chips') return `<fieldset class="field wide"><legend>${esc(f.label)}</legend><div class="chip-input">${f.options.map((o, i) => `<label><input type="${f.multiple ? 'checkbox' : 'radio'}" name="${esc(f.name)}" value="${esc(o)}"${!f.multiple && i === 0 ? ' checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div></fieldset>`;
    return `<div class="field${f.wide ? ' wide' : ''}">${label}<input id="${id}" name="${esc(f.name)}" type="${esc(f.type || 'text')}" placeholder="${esc(f.placeholder || '')}" autocomplete="${esc(f.autocomplete || 'on')}"${req}></div>`;
  };
  return `<div class="wrap form-wrap">
    <div class="form-side">${head(s)}${s.points?.length ? `<ul class="checks">${s.points.map((p) => `<li>${icon('check')}${esc(p)}</li>`).join('')}</ul>` : ''}</div>
    <form class="lead-form" data-form${s.action ? ` action="${esc(s.action)}" method="post" data-provider="${esc(s.provider || 'formspree')}"` : ''} novalidate>
      <div class="fields">${s.fields.map(field).join('')}</div>
      <label class="agree"><input type="checkbox" name="agree" required> <span>${esc(s.agree || '문의 응대를 위한 개인정보 수집·이용에 동의합니다. (이름·연락처, 상담 후 1년 보관)')}</span></label>
      <button class="btn primary lg block" type="submit"><span>${esc(s.submit || '보내기')}</span></button>
      <p class="form-msg" role="status" hidden data-ok="${esc(s.success || '접수되었습니다. 빠르게 연락드릴게요.')}" data-demo="${esc(c.site.sample ? '샘플 사이트라 실제로 전송되지는 않습니다. (입력 확인 완료)' : '')}"></p>
    </form>
  </div>`;
}

/* 앱 화면 목업 (CSS로 그린 가짜 화면) */
function phone(screen, c) {
  const app = c.site.app || {};
  const screens = {
    home: `<div class="ph-top"><small>${esc(app.month || '10월')} 남은 예산</small><b>${esc(app.balance || '₩482,300')}</b><span class="ph-chip up">${esc(app.delta || '지난달보다 12% 아낌')}</span></div>
      <div class="ph-bars">${[38, 62, 45, 80, 52, 30, 70].map((h, i) => `<i style="--h:${h}%"${i === 3 ? ' class="on"' : ''}></i>`).join('')}</div>
      <ul class="ph-list">${(app.items || [['카페', '-4,800'], ['교통', '-1,450'], ['월급', '+3,200,000'], ['장보기', '-32,900']]).map(([n, v]) => `<li><span class="dot"></span>${esc(n)}<b class="${v.startsWith('+') ? 'plus' : ''}">${esc(v)}</b></li>`).join('')}</ul>`,
    stats: `<div class="ph-top"><small>이번 달 지출</small><b>₩1,128,400</b></div>
      <div class="ph-donut"><svg viewBox="0 0 36 36"><circle r="15.9" cx="18" cy="18" class="d1" stroke-dasharray="38 62"/><circle r="15.9" cx="18" cy="18" class="d2" stroke-dasharray="24 76" stroke-dashoffset="-38"/><circle r="15.9" cx="18" cy="18" class="d3" stroke-dasharray="18 82" stroke-dashoffset="-62"/><circle r="15.9" cx="18" cy="18" class="d4" stroke-dasharray="20 80" stroke-dashoffset="-80"/></svg><b>38%<small>식비</small></b></div>
      <ul class="ph-legend"><li><i class="d1"></i>식비</li><li><i class="d2"></i>주거</li><li><i class="d3"></i>교통</li><li><i class="d4"></i>기타</li></ul>`,
    goal: `<div class="ph-top"><small>목표</small><b>제주 여행 ✈</b></div>
      <div class="ph-goal"><div class="ring" style="--p:64"><b>64%</b></div><p>₩640,000 / ₩1,000,000</p></div>
      <ul class="ph-list"><li><span class="dot"></span>매주 자동 저축<b>₩50,000</b></li><li><span class="dot"></span>예상 달성일<b>12월 18일</b></li></ul>`,
  };
  return `<div class="phone"><div class="phone-notch"></div><div class="phone-screen">${screens[screen] || screens.home}</div></div>`;
}

function appScreens(s, c) {
  return `<div class="wrap">${head(s, 'center')}
    <div class="screens">${s.items.map((it) => `<figure>${phone(it.screen, c)}<figcaption><b>${esc(it.title)}</b><span>${rich(it.text)}</span></figcaption></figure>`).join('')}</div>
  </div>`;
}

function stats(s) {
  return `<div class="wrap"><dl class="big-stats">${s.items.map((x) => `<div><dd data-count="${esc(x.value)}">${esc(x.value)}</dd><dt>${esc(x.label)}</dt></div>`).join('')}</dl></div>`;
}

function countdown(s) {
  return `<div class="wrap center-col">${head(s, 'center')}<div class="countdown" data-countdown="${esc(s.date)}">${['일', '시간', '분', '초'].map((u) => `<div><b>--</b><small>${u}</small></div>`).join('')}</div>${btns(s.buttons, 'lg')}</div>`;
}

export const SECTIONS = { hero, about, features, menu, pricing, gallery, steps, portfolio, testimonials, faq, location, cta, form, 'app-screens': appScreens, stats, countdown };

/* ───────── 페이지 ───────── */

export const pageFile = (slug) => (slug === 'index' ? './' : `${slug}.html`);

function header(site, page) {
  const links = site.pages
    ? site.pages.filter((p) => p.nav).map((p) => `<li><a href="${pageFile(p.slug)}"${p.slug === page.slug ? ' aria-current="page"' : ''}>${esc(p.nav)}</a></li>`)
    : page.sections.filter((s) => s.nav).map((s) => `<li><a href="#${esc(s.id)}">${esc(s.nav)}</a></li>`);
  const cta = site.headerCta;
  return `<header class="site-header" data-header>
    <div class="wrap header-in">
      <a class="logo" href="${site.pages ? './' : '#top'}">${site.logo ? `<img src="${esc(site.logo)}" alt="" width="28" height="28">` : `<span class="logo-mark">${esc(site.mark || site.name.slice(0, 1))}</span>`}<span>${esc(site.name)}</span></a>
      <nav class="nav" id="nav" data-nav><ul>${links.join('')}</ul>${cta ? btn(cta, 'sm nav-cta') : ''}</nav>
      <button class="nav-toggle" type="button" aria-label="메뉴" aria-controls="nav" aria-expanded="false" data-nav-toggle>${icon('menu')}</button>
    </div>
  </header>`;
}

function quickbar(site) {
  const q = site.quickbar || [];
  if (!q.length) return '';
  return `<nav class="quickbar" aria-label="바로가기">${q.map((b) => `<a href="${esc(b.href)}"${/^https?:/.test(b.href) ? ' target="_blank" rel="noopener"' : ''} class="${b.primary ? 'primary' : ''}">${icon(b.icon || 'phone')}<span>${esc(b.label)}</span></a>`).join('')}</nav>`;
}

function footer(site) {
  const b = site.business || {};
  const ct = site.contact || {};
  const rows = [
    b.company && `상호 ${b.company}`, b.owner && `대표 ${b.owner}`, b.regNo && `사업자등록번호 ${b.regNo}`,
    b.mailOrderNo && `통신판매업 ${b.mailOrderNo}`, (b.address || ct.address) && `주소 ${b.address || ct.address}`,
    ct.phone && `전화 ${ct.phone}`, ct.email && `이메일 ${ct.email}`,
  ].filter(Boolean);
  const links = [
    ct.instagram && `<a href="${esc(ct.instagram)}" target="_blank" rel="noopener" aria-label="인스타그램">${icon('instagram')}</a>`,
    ct.kakao && `<a href="${esc(ct.kakao)}" target="_blank" rel="noopener" aria-label="카카오톡 채널">${icon('chat')}</a>`,
    ct.email && `<a href="mailto:${esc(ct.email)}" aria-label="이메일">${icon('mail')}</a>`,
  ].filter(Boolean).join('');
  return `<footer class="site-footer">
    <div class="wrap footer-in">
      <div><a class="logo" href="${site.pages ? './' : '#top'}"><span class="logo-mark">${esc(site.mark || site.name.slice(0, 1))}</span><span>${esc(site.name)}</span></a>${site.footerText ? `<p class="footer-text">${rich(site.footerText)}</p>` : ''}</div>
      ${links ? `<div class="social">${links}</div>` : ''}
    </div>
    <div class="wrap footer-biz">${rows.map((r) => `<span>${esc(r)}</span>`).join('')}</div>
    <div class="wrap footer-copy"><span>© <span data-year>${new Date().getFullYear()}</span> ${esc(b.company || site.name)}</span>${site.privacyUrl ? `<a href="${esc(site.privacyUrl)}">개인정보처리방침</a>` : ''}</div>
    ${site.sample ? '<p class="wrap sample-note">이 사이트는 포트폴리오용 컨셉 샘플이며 실제 업체가 아닙니다. 사진: Unsplash</p>' : ''}
  </footer>`;
}

function jsonLd(site) {
  const ct = site.contact || {};
  const data = {
    '@context': 'https://schema.org',
    '@type': site.schemaType || 'LocalBusiness',
    name: site.name,
    description: site.description,
    ...(site.url ? { url: site.url, image: `${site.url.replace(/\/$/, '')}/img/og.jpg` } : {}),
    ...(ct.phone ? { telephone: ct.phone } : {}),
    ...(ct.address ? { address: { '@type': 'PostalAddress', streetAddress: ct.address, addressCountry: 'KR' } } : {}),
    ...(site.openingHours ? { openingHours: site.openingHours } : {}),
    ...(ct.instagram ? { sameAs: [ct.instagram] } : {}),
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

const FONTS = {
  sans: { css: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" },
  serif: { css: "'Gowun Batang', 'Noto Serif KR', serif", link: 'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap' },
  display: { css: "'Gmarket Sans', 'Pretendard Variable', Pretendard, sans-serif" },
};

function themeCss(t = {}) {
  const v = {
    '--bg': t.bg, '--surface': t.surface, '--ink': t.ink, '--muted': t.muted, '--line': t.line,
    '--primary': t.primary, '--on-primary': t.onPrimary, '--accent': t.accent,
    '--radius': t.radius != null ? `${t.radius}px` : undefined,
    '--font-head': FONTS[t.head || 'sans'].css, '--head-weight': t.headWeight,
    '--head-track': t.headTrack,
  };
  return `:root{${Object.entries(v).filter(([, x]) => x != null).map(([k, x]) => `${k}:${x}`).join(';')}}`;
}

/** page: { slug, title, description, sections } — 한 페이지 사이트는 site 자체가 페이지 */
export function renderPage(site, images, page = { slug: 'index', sections: site.sections }) {
  site._images = images;
  const c = makeCtx(site, images);
  const t = site.theme || {};
  const body = page.sections.map((s, i) => {
    const fn = SECTIONS[s.type];
    if (!fn) throw new Error(`섹션 종류 없음: ${s.type} (가능: ${Object.keys(SECTIONS).join(', ')})`);
    if (s.type === 'hero') return fn(s, c);
    return `<section class="sec sec-${s.type} ${s.tone ? `tone-${s.tone}` : ''}" id="${esc(s.id || `${s.type}-${i}`)}">${fn(s, c)}</section>`;
  });
  // 첫 섹션(히어로) 다음에 본문 시작 표시
  body.splice(1, 0, '<div id="main"></div>');
  const fontLink = FONTS[t.head || 'sans'].link;
  const base = site.url ? site.url.replace(/\/?$/, '/') : '';
  const canonical = base && (page.slug === 'index' ? base : `${base}${page.slug}.html`);
  const title = page.slug === 'index' ? site.title || `${site.name} | ${site.tagline}` : `${page.title || page.nav} | ${site.name}`;
  const description = page.description || site.description;
  const og = base ? `${base}img/og.jpg` : 'img/og.jpg';
  return `<!doctype html>
<html lang="${esc(site.lang || 'ko')}" class="${t.dark ? 'dark' : ''}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="${esc(t.bg || '#ffffff')}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${site._og ? `<meta property="og:image" content="${esc(og)}">` : ''}
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
${site.verify?.naver ? `<meta name="naver-site-verification" content="${esc(site.verify.naver)}">` : ''}
${site.verify?.google ? `<meta name="google-site-verification" content="${esc(site.verify.google)}">` : ''}
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
${fontLink ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${fontLink}">` : ''}
<link rel="stylesheet" href="site.css">
<style>${themeCss(t)}</style>
${page.slug === 'index' ? jsonLd(site) : ''}
${site.analytics?.ga ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(site.analytics.ga)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(site.analytics.ga)});</script>` : ''}
</head>
<body class="${['full', 'page'].includes(page.sections[0]?.variant) && (page.sections[0].variant === 'full' || page.sections[0].image) ? 'over-hero' : ''}">
<a class="skip" href="#main">본문으로 건너뛰기</a>
${site.sample ? '<div class="sample-ribbon">컨셉 샘플</div>' : ''}
${header(site, page)}
<main>
${body.join('\n')}
</main>
${footer(site)}
${quickbar(site)}
<div class="lightbox" data-lightbox-view hidden><button type="button" aria-label="닫기" data-lightbox-close>${icon('close')}</button><img alt=""></div>
<script src="site.js" defer></script>
</body>
</html>
`;
}

export function faviconSvg(site) {
  const t = site.theme || {};
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${esc(t.primary || '#222')}"/><text x="32" y="43" font-family="sans-serif" font-size="32" font-weight="700" text-anchor="middle" fill="${esc(t.onPrimary || '#fff')}">${esc(site.mark || site.name.slice(0, 1))}</text></svg>`;
}

/** 사이트 설정에서 쓰인 모든 사진 경로 */
export function collectImages(site) {
  const out = new Set();
  const walk = (v, key) => {
    if (typeof v === 'string' && /\.(jpe?g|png|webp)$/i.test(v) && ['image', 'src', 'ogImage'].includes(key)) out.add(v);
    else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(site.pages ? site.pages.map((p) => p.sections) : site.sections, 'sections');
  if (site.ogImage) out.add(site.ogImage);
  return [...out];
}
