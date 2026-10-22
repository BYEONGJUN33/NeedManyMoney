// 광고·포털 연동 어댑터. 게임 코드는 이 파일의 함수만 부른다.
// 제공자 선택: ?portal=crazygames|poki|gd|h5|fake  또는 window.NOVA_PORTAL (배포 빌드가 넣음)
//   crazygames — CrazyGames HTML5 SDK v3
//   poki       — Poki SDK v2
//   gd         — GameDistribution SDK (window.NOVA_GD_ID 필요)
//   h5         — 자체 사이트용 Google H5 게임 광고(Ad Placement API, window.NOVA_ADSENSE 필요)
//   fake       — 개발용: 2초 가짜 광고
//   (없음)     — 광고 없음. 보상형 버튼을 숨긴다.

function loadScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}

function detect() {
  let q = null;
  try { q = new URLSearchParams(location.search).get('portal'); } catch { /* 무시 */ }
  if (q) return q;
  if (globalThis.NOVA_PORTAL) return globalThis.NOVA_PORTAL;
  const host = location.hostname;
  if (host.includes('crazygames')) return 'crazygames';
  if (host.includes('poki')) return 'poki';
  return 'none';
}

class AdManager {
  constructor() {
    this.provider = 'none';
    this.ready = false;
    this.onPause = () => {};
    this.onResume = () => {};
    this.playing = false;
  }

  get rewardedAvailable() { return this.ready && this.provider !== 'none'; }

  async init({ onPause, onResume } = {}) {
    this.onPause = onPause || this.onPause;
    this.onResume = onResume || this.onResume;
    this.provider = detect();
    try {
      if (this.provider === 'crazygames') {
        await loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js');
        this.cg = globalThis.CrazyGames.SDK;
        await this.cg.init();
      } else if (this.provider === 'poki') {
        await loadScript('https://game-cdn.poki.com/scripts/v2/poki-sdk.js');
        await globalThis.PokiSDK.init().catch(() => {});
      } else if (this.provider === 'gd') {
        const gameId = globalThis.NOVA_GD_ID;
        if (!gameId) throw new Error('NOVA_GD_ID 없음');
        this.gdWaiters = [];
        globalThis.GD_OPTIONS = {
          gameId,
          onEvent: (ev) => {
            if (ev.name === 'SDK_GAME_PAUSE') this.onPause();
            if (ev.name === 'SDK_GAME_START') this.onResume();
            if (ev.name === 'SDK_REWARDED_WATCH_COMPLETE') this.gdRewarded = true;
          },
        };
        await loadScript('https://html5.api.gamedistribution.com/main.min.js');
      } else if (this.provider === 'h5') {
        const client = globalThis.NOVA_ADSENSE;
        if (!client) throw new Error('NOVA_ADSENSE 없음');
        globalThis.adsbygoogle = globalThis.adsbygoogle || [];
        globalThis.adBreak = globalThis.adConfig = (o) => globalThis.adsbygoogle.push(o);
        await loadScript('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
          'data-ad-client': client, 'data-ad-frequency-hint': '45s', crossorigin: 'anonymous',
        });
        globalThis.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
      }
      this.ready = true;
    } catch (e) {
      // 광고 차단·네트워크 오류: 게임은 광고 없이 계속된다
      console.warn('ads disabled:', e?.message || e);
      this.provider = 'none';
      this.ready = true;
    }
  }

  loadingFinished() {
    if (this.provider === 'poki') globalThis.PokiSDK?.gameLoadingFinished();
    if (this.provider === 'crazygames') this.cg?.game?.loadingStop?.();
  }

  gameplayStart() {
    if (this.playing) return;
    this.playing = true;
    if (this.provider === 'poki') globalThis.PokiSDK?.gameplayStart();
    if (this.provider === 'crazygames') this.cg?.game?.gameplayStart?.();
  }

  gameplayStop() {
    if (!this.playing) return;
    this.playing = false;
    if (this.provider === 'poki') globalThis.PokiSDK?.gameplayStop();
    if (this.provider === 'crazygames') this.cg?.game?.gameplayStop?.();
  }

  happytime() {
    if (this.provider === 'crazygames') this.cg?.game?.happytime?.();
  }

  /** 판 사이 광고. 보여줄지는 포털이 정한다. 끝나면 resolve. */
  midgame() {
    return this.show('midgame').then(() => undefined);
  }

  /** 보상형 광고. 끝까지 봤으면 true. */
  rewarded() {
    if (!this.rewardedAvailable) return Promise.resolve(false);
    return this.show('rewarded');
  }

  show(kind) {
    const pause = () => this.onPause();
    const resume = () => this.onResume();
    const wasPlaying = this.playing;
    this.gameplayStop();
    const done = (ok) => { resume(); if (wasPlaying) this.gameplayStart(); return ok; };
    switch (this.provider) {
      case 'crazygames':
        return new Promise((resolve) => {
          this.cg.ad.requestAd(kind === 'rewarded' ? 'rewarded' : 'midgame', {
            adStarted: pause,
            adFinished: () => resolve(done(true)),
            adError: () => resolve(done(false)),
          });
        });
      case 'poki':
        pause();
        return (kind === 'rewarded' ? globalThis.PokiSDK.rewardedBreak(pause) : globalThis.PokiSDK.commercialBreak(pause).then(() => true))
          .then((ok) => done(!!ok)).catch(() => done(false));
      case 'gd':
        this.gdRewarded = false;
        if (!globalThis.gdsdk) return Promise.resolve(done(false));
        pause();
        return globalThis.gdsdk.showAd(kind === 'rewarded' ? 'rewarded' : undefined)
          .then(() => done(kind === 'rewarded' ? !!this.gdRewarded : true))
          .catch(() => done(false));
      case 'h5':
        return new Promise((resolve) => {
          let viewed = false;
          globalThis.adBreak({
            type: kind === 'rewarded' ? 'reward' : 'next',
            name: kind,
            beforeAd: pause,
            afterAd: () => {},
            beforeReward: (showAdFn) => showAdFn(),
            adViewed: () => { viewed = true; },
            adDismissed: () => { viewed = false; },
            adBreakDone: () => resolve(done(kind === 'rewarded' ? viewed : true)),
          });
        });
      case 'fake':
        pause();
        return new Promise((resolve) => {
          const el = document.createElement('div');
          el.className = 'fake-ad';
          el.textContent = 'AD (dev) 2s';
          document.body.append(el);
          setTimeout(() => { el.remove(); resolve(done(true)); }, 2000);
        });
      default:
        return Promise.resolve(done(kind !== 'rewarded'));
    }
  }
}

export const Ads = new AdManager();
