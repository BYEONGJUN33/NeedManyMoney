// 화면 공용 도우미: 숫자 입력, 금액 표기, URL 상태, 복사, 광고 초기화
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const nf = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
export const fmt = (n) => nf.format(Math.round(n || 0));
export const won = (n) => `${fmt(n)}원`;

/** 1억 2,345만 6,789원 형식 */
export function koUnit(n, { short = false } = {}) {
  let v = Math.round(Math.abs(n || 0));
  if (v === 0) return '0원';
  const eok = Math.floor(v / 1e8);
  v -= eok * 1e8;
  const man = Math.floor(v / 1e4);
  const rest = v - man * 1e4;
  const parts = [];
  if (eok) parts.push(`${fmt(eok)}억`);
  if (man) parts.push(`${fmt(man)}만`);
  if (rest && !(short && (eok || man))) parts.push(fmt(rest));
  return `${n < 0 ? '−' : ''}${parts.join(' ')}원`;
}

export const parseNum = (s) => {
  const v = Number(String(s ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(v) ? v : 0;
};

/** 쉼표 자동 입력. 커서 위치를 숫자 개수 기준으로 유지한다. */
export function moneyInput(input, onChange) {
  const reformat = () => {
    const caretDigits = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, '').length;
    const digits = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 13);
    input.value = digits ? fmt(+digits) : '';
    if (document.activeElement === input) {
      let pos = 0;
      let seen = 0;
      while (pos < input.value.length && seen < caretDigits) {
        if (/\d/.test(input.value[pos])) seen += 1;
        pos += 1;
      }
      input.setSelectionRange(pos, pos);
    }
  };
  input.addEventListener('input', () => { reformat(); onChange?.(); });
  if (input.value) input.value = fmt(parseNum(input.value));
  return {
    get: () => parseNum(input.value),
    set: (v) => { input.value = v ? fmt(v) : ''; },
  };
}

/** 금액 입력 아래에 "4,000만원" 같은 한글 단위 표시 */
export function unitHint(input, el) {
  const update = () => { el.textContent = parseNum(input.value) >= 100_000 ? koUnit(parseNum(input.value)) : ''; };
  input.addEventListener('input', update);
  update();
  return update;
}

export function stepper(root, onChange) {
  const input = $('input', root);
  const min = Number(input.min || 0);
  const max = Number(input.max || 99);
  const clampVal = () => {
    const v = Math.round(Number(input.value) || min);
    input.value = String(Math.min(max, Math.max(min, v)));
  };
  $$('button', root).forEach((b) => b.addEventListener('click', () => {
    input.value = String((Number(input.value) || 0) + Number(b.dataset.step));
    clampVal();
    onChange?.();
  }));
  input.addEventListener('change', () => { clampVal(); onChange?.(); });
  input.addEventListener('input', () => onChange?.());
}

export const radioValue = (name) => $(`input[name="${name}"]:checked`)?.value;
export function setRadio(name, value) {
  const el = $(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
}

/** 공유 링크용 URL 파라미터 읽기·쓰기 (사용할 수 없는 환경에서는 조용히 넘어간다) */
export function readParams() {
  try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(); }
}
export function shareUrl(params) {
  try {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams(params).toString();
    url.hash = '';
    return url.toString();
  } catch { return ''; }
}

let toastTimer;
export function toast(msg) {
  let el = $('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 1800);
}

export async function copy(text, okMsg = '복사했습니다') {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    toast(ok ? okMsg : '복사하지 못했습니다. 직접 선택해 복사해 주세요.');
  }
}

/** 결과 복사·링크 복사 버튼 연결 */
export function wireShare({ textFn, paramsFn }) {
  $('[data-copy-result]')?.addEventListener('click', () => copy(textFn(), '결과를 복사했습니다'));
  const linkBtn = $('[data-copy-link]');
  if (linkBtn) {
    const url = shareUrl({});
    if (!url) linkBtn.hidden = true;
    linkBtn.addEventListener('click', () => copy(shareUrl(paramsFn()), '링크를 복사했습니다'));
  }
}

export function setText(sel, text, root = document) {
  const el = typeof sel === 'string' ? $(sel, root) : sel;
  if (el) el.textContent = text;
}

/** 레저(dl) 행 렌더링 */
export function ledgerRows(dl, rows) {
  dl.replaceChildren(...rows.map((r) => {
    const div = document.createElement('div');
    if (r.cls) div.className = r.cls;
    const dt = document.createElement('dt');
    dt.textContent = r.label;
    if (r.note) {
      const small = document.createElement('small');
      small.textContent = r.note;
      dt.append(small);
    }
    const dd = document.createElement('dd');
    dd.textContent = r.value;
    div.append(dt, dd);
    return div;
  }));
}

/** 휴대폰에서 결과 전표가 보이지 않을 때 하단 바에 핵심 결과를 띄운다. 반환된 함수로 값을 갱신한다. */
export function resultDock() {
  const slip = $('.result .slip');
  if (!slip) return () => {};
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dock';
  btn.setAttribute('aria-hidden', 'true');
  btn.tabIndex = -1;
  btn.innerHTML = '<span class="dock-l"></span><span class="dock-v"></span>';
  btn.addEventListener('click', () => slip.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  document.body.append(btn);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => btn.classList.toggle('on', !e.isIntersecting), { threshold: 0.35 })
      .observe($('.slip-head', slip) || slip);
  }
  return (label, value) => {
    btn.firstChild.textContent = label;
    btn.lastChild.textContent = value;
  };
}

function centerActiveNav() {
  const nav = $('.nav');
  const cur = $('.nav [aria-current]');
  if (nav && cur && nav.scrollWidth > nav.clientWidth) {
    nav.scrollLeft = cur.offsetLeft - nav.offsetLeft - (nav.clientWidth - cur.clientWidth) / 2;
  }
}

function initAds() {
  if (document.querySelector('ins.adsbygoogle')) {
    document.querySelectorAll('ins.adsbygoogle').forEach(() => {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* 광고 차단 등 */ }
    });
  }
}

centerActiveNav();
initAds();
