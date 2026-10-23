// 실행 환경별 기능. 지금은 토스 미니앱(앱인토스)만 있다. 일반 웹·포털에서는 모두 아무것도 하지 않는다.
// 토스 빌드(toss/build.mjs)가 SDK를 묶은 toss-bridge.js를 먼저 실어 window.NOVA_TOSS를 만든다.
const T = () => globalThis.NOVA_TOSS || null;

let storageKey = null;
let saveTimer = 0;
let pending = null;

function setInsets(i) {
  if (!i) return;
  const s = document.documentElement.style;
  for (const k of ['top', 'bottom', 'left', 'right']) s.setProperty(`--ait-${k}`, `${Math.max(0, Number(i[k]) || 0)}px`);
}

export const Platform = {
  get name() { return T() ? 'toss' : 'web'; },
  /** 토스 게임센터 리더보드 (토스앱 5.221.0 이상) */
  get leaderboard() { return !!T()?.leaderboardSupported(); },
  /** 앱 안 공유 버튼: 토스는 내비게이션 바 더보기에 공유가 있고 외부 링크를 금지한다 */
  get canShare() { return !T(); },

  /**
   * 토스: 안전 영역 여백을 CSS 변수로, 시스템 뒤로가기를 onBack으로 연결하고 사용자 키를 받는다.
   * 저장소 키는 사용자 키별로 나눈다 (한 기기에서 토스 계정을 바꿔도 기록이 섞이지 않게).
   */
  async init({ onBack, baseKey }) {
    const t = T();
    if (!t) return;
    document.body.classList.add('toss');
    setInsets(t.insets());
    t.onInsets(setInsets);
    t.onBack(onBack);
    const user = await t.userKey();
    storageKey = user ? `${baseKey}:${user}` : baseKey;
    // 백그라운드로 갈 때 저장을 미루지 않는다
    document.addEventListener('visibilitychange', () => { if (document.hidden) Platform.flush(); });
  },

  /** 토스 기기 저장소에 남은 저장본 (JSON 문자열) */
  async restore() {
    const t = T();
    if (!t || !storageKey) return null;
    return t.getItem(storageKey);
  },

  /** 저장본을 토스 기기 저장소에도 쓴다. 짧은 시간에 여러 번 저장해도 브릿지는 한 번만 부른다 */
  persist(json) {
    if (!T() || !storageKey) return;
    pending = json;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => Platform.flush(), 800);
  },

  flush() {
    const t = T();
    if (!t || !storageKey || pending == null) return;
    clearTimeout(saveTimer);
    const json = pending;
    pending = null;
    t.setItem(storageKey, json);
  },

  /** 판이 끝난 뒤 점수 제출 (게임 시작 직후에는 부르지 않는다: 게임 프로필이 아직 없을 수 있다) */
  submitScore(n) {
    if (!Platform.leaderboard) return;
    T().submitScore(Math.max(0, Math.floor(n)));
  },

  openLeaderboard() {
    if (Platform.leaderboard) T().openLeaderboard();
  },

  /** 미니앱 닫기 (확인 모달을 보여 준 뒤에만 부른다) */
  close() {
    Platform.flush();
    T()?.close();
  },
};
