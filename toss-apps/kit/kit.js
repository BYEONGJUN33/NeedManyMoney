// 앱 공용 도구: 저장, 광고(배너·보상형), 공유, 알림 문구.
// 토스 앱 안에서는 window.AIT(SDK 브릿지)를 쓰고, 일반 브라우저(개발·미리보기)에서는 localStorage를 쓰고 광고를 숨긴다.
// 빌드가 window.APP_CFG = { appName, ads: { banner, rewarded } }를 넣는다.
const A = () => (globalThis.AIT?.inToss() ? globalThis.AIT : null);
const CFG = () => globalThis.APP_CFG || { appName: 'dev', ads: {} };

let prefix = null;
async function ns() {
  if (prefix) return prefix;
  const key = A() ? await A().userKey() : null; // 체크리스트: 사용자 식별키를 받아 저장한다
  prefix = `${CFG().appName}:${key || 'local'}:`;
  return prefix;
}

/** 저장소: 같은 키는 0.5초 모아서 한 번만 쓴다 (브릿지 과호출 방지) */
const timers = {};
export const store = {
  async get(key, fallback = null) {
    const k = (await ns()) + key;
    let raw = null;
    if (A()) raw = await A().getItem(k);
    if (raw == null) { try { raw = localStorage.getItem(k); } catch { /* 무시 */ } }
    try { return raw == null ? fallback : JSON.parse(raw); } catch { return fallback; }
  },
  set(key, value) {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(async () => {
      const k = (await ns()) + key;
      const json = JSON.stringify(value);
      try { localStorage.setItem(k, json); } catch { /* 무시 */ }
      if (A()) A().setItem(k, json);
    }, 500);
  },
};

/** 하단 고정 배너 (토스 가이드: 너비 100%, 높이 96px, 위·아래에만). 광고가 없으면 자리를 접는다 */
export async function mountBanner(el) {
  const id = CFG().ads?.banner;
  if (!A() || !id || !A().bannerSupported()) { el.remove(); document.body.classList.remove('has-banner'); return; }
  document.body.classList.add('has-banner');
  if (!(await A().initBanner())) { el.remove(); document.body.classList.remove('has-banner'); return; }
  const collapse = () => { el.remove(); document.body.classList.remove('has-banner'); };
  A().attachBanner(id, el, { onNoFill: collapse, onAdFailedToRender: collapse });
}

/**
 * 보상형 광고: 미리 불러 둔 광고만 보여 준다. 끝까지 보면 true.
 * 실패하면 5·10·20초 간격으로 세 번까지만 다시 불러 본다.
 */
export function rewarded(onChange = () => {}) {
  const id = CFG().ads?.rewarded;
  let loaded = false;
  const load = (attempt = 0) => {
    loaded = false;
    onChange(false);
    A().loadAd(id, {
      onLoaded: () => { loaded = true; onChange(true); },
      onError: () => { if (attempt < 3) setTimeout(() => load(attempt + 1), 5000 * 2 ** attempt); },
    });
  };
  const ok = !!(A() && id && A().fullScreenSupported());
  if (ok) load();
  return {
    get supported() { return ok; },
    get ready() { return loaded; },
    show() {
      if (!ok || !loaded) return Promise.resolve(false);
      loaded = false;
      onChange(false);
      return new Promise((resolve) => {
        let earned = false;
        let done = false;
        const finish = (v) => { if (done) return; done = true; load(); resolve(v); };
        A().showAd(id, {
          onEvent: (ev) => {
            if (ev.type === 'userEarnedReward') earned = true;
            if (ev.type === 'dismissed') finish(earned);
            if (ev.type === 'failedToShow') finish(false);
          },
          onError: () => finish(false),
        });
      });
    },
  };
}

/** 공유: 토스 안에서는 intoss:// 링크를 붙여 공유 시트, 밖에서는 기기 공유·복사 */
export async function share(text, path = '') {
  if (A()) {
    const link = await A().shareLink(`intoss://${CFG().appName}${path}`);
    return A().shareMessage(link ? `${text}\n${link}` : text);
  }
  try {
    if (navigator.share) { await navigator.share({ text }); return true; }
    await navigator.clipboard.writeText(text);
    toast('복사했어요');
    return true;
  } catch { return false; }
}

let toastTimer = 0;
export function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = Object.assign(document.createElement('div'), { id: 'toast', className: 'toast' });
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

export const nf = new Intl.NumberFormat('ko-KR');
export const won = (n) => `${nf.format(Math.round(n || 0))}원`;
