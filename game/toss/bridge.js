// 앱인토스 SDK를 게임이 쓰는 몇 가지 함수로 감싸 window.NOVA_TOSS에 둔다 (toss/build.mjs가 한 파일로 묶는다).
// 토스 앱 밖(일반 브라우저)이나 오래된 토스 앱에서는 SDK 호출이 실패하므로 모두 안전한 기본값을 돌려준다.
import {
  loadFullScreenAd, showFullScreenAd, Storage, SafeAreaInsets, graniteEvent, getUserKeyForGame,
  submitGameCenterLeaderBoardScore, openGameCenterLeaderboard, closeView, isMinVersionSupported,
} from '@apps-in-toss/web-framework';

const safe = (fn, fallback) => {
  try {
    return fn();
  } catch (e) {
    console.warn('[toss]', e?.message || e);
    return fallback;
  }
};
const safeAsync = async (fn, fallback) => {
  try {
    return await fn();
  } catch (e) {
    console.warn('[toss]', e?.message || e);
    return fallback;
  }
};

let leaderboard = null;

globalThis.NOVA_TOSS = {
  adsSupported: () => safe(() => loadFullScreenAd.isSupported() && showFullScreenAd.isSupported(), false),
  /** 광고 미리 불러오기: 'loaded' 이벤트를 받은 뒤에만 보여 줄 수 있다 */
  loadAd: (adGroupId, { onLoaded, onError }) => safe(() => loadFullScreenAd({
    options: { adGroupId },
    onEvent: (e) => { if (e.type === 'loaded') onLoaded(); },
    onError,
  }), null) ?? onError(new Error('load failed')),
  showAd: (adGroupId, { onEvent, onError }) => safe(() => showFullScreenAd({ options: { adGroupId }, onEvent, onError }), null) ?? onError(new Error('show failed')),
  insets: () => safe(() => SafeAreaInsets.get(), null),
  onInsets: (cb) => safe(() => SafeAreaInsets.subscribe({ onEvent: cb }), () => {}),
  onBack: (cb) => safe(() => graniteEvent.addEventListener('backEvent', { onEvent: cb }), () => {}),
  userKey: () => safeAsync(async () => {
    const r = await getUserKeyForGame();
    return r && r !== 'ERROR' && r.type === 'HASH' ? r.hash : null;
  }, null),
  getItem: (k) => safeAsync(() => Storage.getItem(k), null),
  setItem: (k, v) => safeAsync(async () => { await Storage.setItem(k, v); return true; }, false),
  leaderboardSupported: () => (leaderboard ??= safe(() => isMinVersionSupported({ android: '5.221.0', ios: '5.221.0' }), false)),
  submitScore: (n) => safeAsync(async () => (await submitGameCenterLeaderBoardScore({ score: String(n) }))?.statusCode === 'SUCCESS', false),
  openLeaderboard: () => safeAsync(() => openGameCenterLeaderboard(), undefined),
  close: () => safeAsync(() => closeView(), undefined),
};
