// 앱인토스 SDK를 앱이 쓰는 몇 가지 함수로 감싸 window.AIT에 둔다 (build.mjs가 앱마다 한 파일로 묶는다).
// 토스 앱 밖(일반 브라우저)이나 오래된 토스 앱에서는 SDK 호출이 실패하므로 모두 안전한 기본값을 돌려준다.
import {
  loadFullScreenAd, showFullScreenAd, TossAds, Storage, User, getAnonymousKey, Share, closeView, isMinVersionSupported,
} from '@apps-in-toss/web-framework';

const warn = (e) => console.warn('[toss]', e?.message || e);
const safe = (fn, fallback) => { try { return fn(); } catch (e) { warn(e); return fallback; } };
const safeAsync = async (fn, fallback) => { try { return await fn(); } catch (e) { warn(e); return fallback; } };

globalThis.AIT = {
  /** 토스 앱 안인지: 사용자 키 API가 동작하면 토스 앱 */
  inToss: () => safe(() => User.getAnonymousKey.isSupported(), false),
  userKey: () => safeAsync(async () => {
    const r = User.getAnonymousKey.isSupported() ? await User.getAnonymousKey() : await getAnonymousKey();
    return r && r !== 'ERROR' && r.type === 'HASH' ? r.hash : null;
  }, null),
  getItem: (k) => safeAsync(() => Storage.getItem(k), null),
  setItem: (k, v) => safeAsync(async () => { await Storage.setItem(k, v); return true; }, false),
  // 전면형·보상형 (광고 그룹 ID로 종류가 정해진다)
  fullScreenSupported: () => safe(() => loadFullScreenAd.isSupported() && showFullScreenAd.isSupported(), false),
  loadAd: (adGroupId, { onLoaded, onError }) => safe(() => loadFullScreenAd({
    options: { adGroupId },
    onEvent: (e) => { if (e.type === 'loaded') onLoaded(); },
    onError,
  }), null) ?? onError(new Error('load failed')),
  showAd: (adGroupId, { onEvent, onError }) => safe(() => showFullScreenAd({ options: { adGroupId }, onEvent, onError }), null) ?? onError(new Error('show failed')),
  // 배너 (토스앱 5.241.0 이상)
  bannerSupported: () => safe(() => TossAds.initialize.isSupported() && TossAds.attachBanner.isSupported()
    && isMinVersionSupported({ android: '5.241.0', ios: '5.241.0' }), false),
  initBanner: () => new Promise((resolve) => {
    safe(() => TossAds.initialize({ callbacks: { onInitialized: () => resolve(true), onInitializationFailed: (e) => { warn(e); resolve(false); } } }), null) ?? resolve(false);
  }),
  attachBanner: (adGroupId, el, callbacks) => safe(() => TossAds.attachBanner(adGroupId, el, { theme: 'light', tone: 'grey', variant: 'expanded', callbacks }), null),
  // 공유: intoss:// 딥링크를 토스 공유 링크로 바꿔 공유 시트에 넣는다
  shareLink: (path) => safeAsync(() => Share.createLink({ path }), null),
  shareMessage: (message) => safeAsync(async () => { await Share.sendMessage({ message }); return true; }, false),
  close: () => safeAsync(() => closeView(), undefined),
};
