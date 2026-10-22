// NOVA MERGE 앱: 화면, 조준·떨어뜨리기 입력, 광고, 저장
import { MergeGame, dailySeed, W, MAX_TIER } from './logic.js';
import { Renderer, COLORS } from './render.js';
import { Sound } from './audio.js';
import { Ads } from './ads.js';
import { loadProfile, saveProfile, localDay, recordGame } from './profile.js';
import { t, setLang, detectLang, getLang, LANGS } from './i18n.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => new Intl.NumberFormat(getLang()).format(n);

/** 메뉴 뒤에 보이는 장식용 통: 구슬을 미리 떨어뜨려 쌓아 둔다 */
function demoJar() {
  const g = new MergeGame({ seed: 21 });
  for (let n = 0; n < 34 && !g.over; n += 1) {
    g.aim(((n * 97) % 330) + 15);
    g.drop();
    for (let f = 0; f < 40; f += 1) g.update(1 / 60);
  }
  for (let f = 0; f < 120; f += 1) g.update(1 / 60);
  g.events.length = 0;
  g.cooldown = 99; // 들고 있는 구슬은 숨긴다
  return g;
}

class App {
  constructor() {
    this.profile = loadProfile();
    setLang(detectLang(this.profile.settings.lang));
    document.documentElement.lang = getLang();
    this.sound = new Sound();
    this.sound.setVolumes(this.profile.settings.sfx, this.profile.settings.music);
    this.renderer = new Renderer($('#game'));
    this.renderer.nextLabel = t('next');
    this.screen = $('#screen');
    this.mode = 'menu';
    this.game = null;
    this.gamesThisSession = 0;
    this.armAt = 0;
    this.saveAt = 0;
    this.keys = new Set();
    this.shown = { score: -1, best: -1 };
    addEventListener('resize', () => this.renderer.resize());
    document.addEventListener('visibilitychange', () => {
      this.sound.setHidden(document.hidden);
      if (document.hidden) this.save();
      this.syncGameplay();
    });
    addEventListener('pointerdown', () => this.sound.unlock(), { capture: true });
    addEventListener('keydown', (e) => this.onKey(e));
    addEventListener('keyup', (e) => this.keys.delete(e.key));
    addEventListener('blur', () => this.keys.clear());
    this.bindPointer($('#game'));
    $('#pause-btn').addEventListener('click', () => this.pause());
    $('#pop-btn').addEventListener('click', () => this.popWithAd());
  }

  async boot() {
    this.title();
    this.last = performance.now();
    requestAnimationFrame((ts) => this.frame(ts));
    this.adsReady = Ads.init({
      onPause: () => { this.sound.mute(true); this.aiming = null; },
      onResume: () => { this.sound.mute(false); },
    });
    await this.adsReady;
    Ads.loadingFinished();
    if (this.mode === 'menu' && this.screen.querySelector('.title')) this.title();
  }

  frame(ts) {
    const dt = Math.min(0.05, (ts - this.last) / 1000);
    this.last = ts;
    const g = this.game || this.demo || (this.demo = demoJar());
    const running = this.mode === 'play' && !Ads.busy && !document.hidden;
    if (this.game && running) {
      this.keyAim(dt);
      this.game.update(dt);
      this.handleEvents();
      if (ts > this.saveAt) { this.saveAt = ts + 3000; this.save(); }
    } else if (!this.game) g.update(dt * 0.5);
    this.renderer.consume(g);
    this.renderer.draw(g, dt, { profileBest: this.profile.bestTier });
    if (this.game) this.updateHud();
    this.syncGameplay();
    requestAnimationFrame((n) => this.frame(n));
  }

  syncGameplay() {
    const active = this.mode === 'play' && !document.hidden && !Ads.busy && this.game && !this.game.over;
    if (active !== Ads.playing) { if (active) Ads.gameplayStart(); else Ads.gameplayStop(); }
  }

  /** 소리·글씨처럼 화면 밖에서 처리할 이벤트 (렌더러가 읽기 전에) */
  handleEvents() {
    const g = this.game;
    for (const ev of g.events) {
      if (ev.type === 'drop') this.sound.play('drop');
      if (ev.type === 'merge') {
        this.sound.mergeTier = ev.tier;
        this.sound.play('merge');
        const record = ev.tier > this.profile.bestTier;
        if (record && ev.tier >= 5) {
          this.renderer.shout(t('newOrb'), COLORS[ev.tier]);
          this.sound.play('big');
          Ads.happytime();
        } else if (ev.tier >= 8) this.renderer.shout(t('bigMerge'), COLORS[ev.tier]);
      }
      if (ev.type === 'nova') {
        this.renderer.shout(t('nova'), '#ffffff');
        this.sound.play('nova');
        Ads.happytime();
      }
      if (ev.type === 'over') this.onOver();
    }
    if (g.danger > 0.3) this.sound.play('warn');
  }

  /* ───────── 조준 ───────── */

  bindPointer(el) {
    const aimAt = (e) => this.game?.aim(this.renderer.toWorldX(e.clientX));
    el.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'play' || Ads.busy || !this.game || this.game.over) return;
      el.setPointerCapture?.(e.pointerId);
      this.aiming = e.pointerId;
      aimAt(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (this.mode !== 'play' || !this.game) return;
      // 마우스는 누르지 않아도 따라가고, 터치는 누른 손가락만 따라간다
      if (e.pointerType === 'mouse' || this.aiming === e.pointerId) aimAt(e);
    });
    const release = (e, drop) => {
      if (this.aiming !== e.pointerId) return;
      this.aiming = null;
      if (!drop || this.mode !== 'play' || Ads.busy || !this.game) return;
      aimAt(e);
      this.game.drop();
    };
    el.addEventListener('pointerup', (e) => release(e, true));
    el.addEventListener('pointercancel', (e) => release(e, false));
  }

  keyAim(dt) {
    const g = this.game;
    const dir = (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D') ? 1 : 0)
      - (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A') ? 1 : 0);
    if (dir) g.aim(g.aimX + dir * W * 0.9 * dt);
  }

  /* ───────── 판 ───────── */

  async start({ daily = false, resume = false } = {}) {
    if (this.starting || Ads.busy) return;
    this.starting = true;
    this.sound.unlock();
    this.mount(`<div class="panel small"><p class="sub">${esc(t('loading'))}</p></div>`);
    await this.adsReady;
    if (this.gamesThisSession > 0 || Ads.provider === 'gd') await Ads.midgame();
    this.gamesThisSession += 1;
    const day = localDay();
    if (resume && this.profile.saved) this.game = MergeGame.restore(this.profile.saved, Date.now() % 1e9);
    else this.game = new MergeGame({ seed: daily ? dailySeed(day) : Math.floor(Math.random() * 1e9), daily });
    this.game.day = day;
    this.mode = 'play';
    this.popUsed = false;
    this.overTimer = null;
    this.renderer.overFade = 0;
    this.renderer.particles.length = 0;
    this.clear();
    $('#hud').hidden = false;
    $('#daily-tag').hidden = !daily;
    $('#daily-tag').textContent = t('dailyTag', { day });
    this.updatePop();
    this.sound.startMusic();
    if (!this.profile.tutorialDone) {
      this.toast(t('howTo'), 6000);
      this.profile.tutorialDone = true;
    }
    this.save();
    this.starting = false;
  }

  save() {
    const g = this.game;
    // 일일 도전은 하루 기록용이라 이어하기 저장을 하지 않는다
    if (g && !g.daily) this.profile.saved = g.over ? null : g.snapshot();
    saveProfile(this.profile);
  }

  updateHud() {
    const g = this.game;
    const best = g.daily ? (this.profile.daily.day === g.day ? this.profile.daily.best : 0) : this.profile.best;
    if (this.shown.score !== g.score) {
      this.shown.score = g.score;
      const el = $('#score');
      el.textContent = fmt(g.score);
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
    const b = Math.max(best, g.score);
    if (this.shown.best !== b) { this.shown.best = b; $('#best').textContent = fmt(b); }
  }

  updatePop() {
    $('#pop-btn').hidden = !(Ads.rewardedAvailable && this.mode === 'play' && !this.popUsed);
    $('#pop-btn').title = t('popAd');
    $('#pop-btn').setAttribute('aria-label', t('popAd'));
  }

  async watchAd() {
    if (Ads.busy) return false;
    this.aiming = null;
    const cover = document.createElement('div');
    cover.className = 'ad-cover';
    cover.textContent = t('adLoading');
    document.body.append(cover);
    try { return await Ads.rewarded(); } finally { cover.remove(); }
  }

  async popWithAd() {
    const g = this.game;
    if (!g || g.over || this.popUsed || this.mode !== 'play') return;
    const ok = await this.watchAd();
    if (this.game !== g || g.over) return;
    if (!ok) { this.toast(t('adFailed')); return; }
    this.popUsed = true;
    g.popSmall();
    this.sound.play('pop');
    this.updatePop();
    this.save();
  }

  /** 넘쳤으면 잠깐 회색 통을 보여 준 뒤 결과 화면으로 */
  onOver() {
    const g = this.game;
    if (this.overTimer) return;
    this.aiming = null;
    this.sound.play('over');
    this.overTimer = setTimeout(() => {
      this.overTimer = null;
      if (this.game === g && g.over && this.mode === 'play') this.gameOver();
    }, 1100);
  }

  gameOver() {
    const g = this.game;
    this.mode = 'over';
    const newBest = recordGame(this.profile, { score: g.score, tier: g.best, daily: g.daily, day: g.day, count: !g.recorded });
    g.recorded = true;
    if (!g.daily) this.profile.saved = null;
    saveProfile(this.profile);
    if (newBest && g.score > 0) Ads.happytime();
    const best = g.daily ? this.profile.daily.best : this.profile.best;
    const canRevive = Ads.rewardedAvailable && g.continues < 1;
    this.updatePop();
    this.mount(`<div class="panel">
      <h2>${esc(t('gameOver'))}</h2>
      ${newBest ? `<span class="badge">${esc(t('newBest'))}</span>` : ''}
      <dl class="results">
        <div><dt>${esc(t('score'))}</dt><dd>${fmt(g.score)}</dd></div>
        <div><dt>${esc(t('best'))}</dt><dd>${fmt(best)}</dd></div>
        <div><dt>${esc(t('merges'))}</dt><dd>${fmt(g.merges)}</dd></div>
        <div><dt>${esc(t('biggest'))}</dt><dd><i class="dot" style="--c:${COLORS[g.best]}"></i>${esc(t('tier', { n: g.best + 1 }))}</dd></div>
      </dl>
      ${canRevive ? `<button class="btn ad" data-act="revive" data-autofocus>${esc(t('reviveAd'))}</button>` : ''}
      <div class="row">
        <button class="btn primary" data-act="retry" ${canRevive ? '' : 'data-autofocus'}>${esc(t('retry'))}</button>
        <button class="btn" data-act="menu">${esc(t('menu'))}</button>
      </div>
      <button class="btn ghost" data-act="share">${esc(t('share'))}</button>
    </div>`);
    this.on('[data-act="revive"]', () => this.revive());
    this.on('[data-act="retry"]', () => this.start({ daily: g.daily }));
    this.on('[data-act="menu"]', () => this.title());
    this.on('[data-act="share"]', () => this.share(g.score));
  }

  async revive() {
    const g = this.game;
    if (!g || !g.over || g.continues >= 1) return;
    const ok = await this.watchAd();
    if (this.game !== g || this.mode !== 'over') return;
    if (!ok) { this.toast(t('adFailed')); return; }
    g.revive();
    this.sound.play('revive');
    this.mode = 'play';
    this.clear();
    this.updatePop();
    this.save();
  }

  pause() {
    if (this.mode !== 'play' || Ads.busy || this.game?.over) return;
    this.aiming = null;
    this.mode = 'paused';
    this.save();
    this.mount(`<div class="panel">
      <h2>${esc(t('paused'))}</h2>
      <button class="btn primary" data-act="resume" data-autofocus>${esc(t('resume'))}</button>
      <button class="btn" data-act="restart">${esc(t('restart'))}</button>
      <button class="btn" data-act="settings">${esc(t('settings'))}</button>
      <button class="btn ghost" data-act="menu">${esc(t('menu'))}</button>
    </div>`);
    this.on('[data-act="resume"]', () => this.resume());
    this.on('[data-act="restart"]', () => { const d = this.game.daily; this.profile.saved = null; this.start({ daily: d }); });
    this.on('[data-act="settings"]', () => this.settings(() => this.pause()));
    this.on('[data-act="menu"]', () => this.title());
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'play';
    this.clear();
  }

  /* ───────── 화면 ───────── */

  mount(html) {
    this.screen.className = 'screen dim';
    this.screen.innerHTML = html;
    this.screen.scrollTop = 0;
    this.armAt = performance.now() + 300;
    (this.screen.querySelector('[data-autofocus]') || this.screen.querySelector('button'))?.focus({ preventScroll: true });
  }

  clear() { this.screen.innerHTML = ''; this.screen.className = 'screen'; }

  on(sel, fn) {
    this.screen.querySelectorAll(sel).forEach((el) => el.addEventListener('click', (e) => {
      if (performance.now() < this.armAt || Ads.busy || el.disabled) return;
      this.sound.unlock();
      this.sound.play('click');
      fn(e, el);
    }));
  }

  title() {
    if (this.mode === 'play' || this.mode === 'paused') this.save();
    this.mode = 'menu';
    this.game = null;
    clearTimeout(this.overTimer);
    this.overTimer = null;
    $('#hud').hidden = true;
    this.sound.stopMusic();
    const day = localDay();
    const dailyBest = this.profile.daily.day === day ? this.profile.daily.best : 0;
    const saved = this.profile.saved;
    this.mount(`<div class="title">
      <h1 class="logo">NOVA<span>MERGE</span></h1>
      <p class="tagline">${esc(t('tagline'))}</p>
      <div class="stats-line"><span class="chip">${esc(t('best'))} ${fmt(this.profile.best)}</span><span class="chip"><i class="dot" style="--c:${COLORS[this.profile.bestTier]}"></i>${esc(t('tier', { n: this.profile.bestTier + 1 }))} / ${MAX_TIER + 1}</span></div>
      <div class="menu">
        ${saved ? `<button class="btn primary" data-act="resume" data-autofocus>${esc(t('resume'))} <small>${fmt(saved.score)}</small></button>` : ''}
        <button class="btn ${saved ? '' : 'primary'}" data-act="play" ${saved ? '' : 'data-autofocus'}>${esc(t('play'))}</button>
        <button class="btn daily" data-act="daily">${esc(t('daily'))} <small>${esc(t('dailyBest', { n: fmt(dailyBest) }))}</small></button>
        <button class="btn ghost" data-act="settings">${esc(t('settings'))}</button>
      </div>
      ${globalThis.NOVA_HUB ? `<p class="more"><a href="${esc(globalThis.NOVA_HUB)}">${esc(t('moreGames'))} →</a></p>` : ''}
    </div>`);
    this.screen.className = 'screen';
    this.on('[data-act="resume"]', () => this.start({ resume: true }));
    this.on('[data-act="play"]', () => { this.profile.saved = null; this.start(); });
    this.on('[data-act="daily"]', () => this.start({ daily: true }));
    this.on('[data-act="settings"]', () => this.settings(() => this.title()));
  }

  settings(back) {
    const s = this.profile.settings;
    const langs = Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${getLang() === k ? 'selected' : ''}>${v}</option>`).join('');
    this.mount(`<div class="panel">
      <h2>${esc(t('settings'))}</h2>
      <label class="setting"><span>${esc(t('sfx'))}</span><input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-set="sfx"></label>
      <label class="setting"><span>${esc(t('music'))}</span><input type="range" min="0" max="1" step="0.05" value="${s.music}" data-set="music"></label>
      <label class="setting"><span>${esc(t('language'))}</span><select data-set="lang">${langs}</select></label>
      <button class="btn" data-act="back">${esc(t('back'))}</button>
    </div>`);
    this.screen.querySelectorAll('[data-set]').forEach((el) => el.addEventListener('input', () => {
      const k = el.dataset.set;
      s[k] = el.type === 'range' ? Number(el.value) : el.value;
      if (k === 'lang') {
        setLang(s.lang);
        document.documentElement.lang = s.lang;
        this.renderer.nextLabel = t('next');
        saveProfile(this.profile);
        this.settings(back);
        return;
      }
      this.sound.setVolumes(s.sfx, s.music);
      saveProfile(this.profile);
    }));
    this.on('[data-act="back"]', () => back());
  }

  onKey(e) {
    if (Ads.busy) { e.preventDefault(); return; }
    if (e.target?.closest?.('input, select')) return;
    if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && !e.repeat) {
      if (this.mode === 'play') { e.preventDefault(); this.pause(); } else if (this.mode === 'paused') { e.preventDefault(); this.resume(); }
      return;
    }
    if (this.mode !== 'play') return;
    if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key)) { this.keys.add(e.key); e.preventDefault(); }
    if ((e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') && !e.repeat && !e.target?.closest?.('button')) {
      e.preventDefault();
      this.game?.drop();
    }
  }

  toast(msg, ms = 2400) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  }

  async share(score) {
    const embedded = globalThis.top !== globalThis.self;
    const url = globalThis.NOVA_SHARE_URL || (embedded ? '' : location.href.split('?')[0]);
    const text = t('shareText', { score: fmt(score) });
    try {
      if (navigator.share) { await navigator.share({ title: 'NOVA MERGE', text, ...(url ? { url } : {}) }); return; }
      await navigator.clipboard.writeText(url ? `${text} ${url}` : text);
      this.toast(t('copied'));
    } catch (err) {
      if (err?.name !== 'AbortError') this.toast(t('shareFailed'));
    }
  }
}

const app = new App();
app.boot();
globalThis.__merge = app;
