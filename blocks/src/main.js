// NOVA BLOCKS 앱: 화면, 끌기 입력, 광고, 저장
import './compat.js'; // 다른 모듈보다 먼저
import { BlocksGame, dailySeed, findFit } from './logic.js';
import { Renderer } from './render.js';
import { Sound } from './audio.js';
import { Ads } from './ads.js';
import { loadProfile, saveProfile, localDay, recordGame } from './profile.js';
import { t, setLang, detectLang, getLang, LANGS } from './i18n.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => new Intl.NumberFormat(getLang()).format(n);

/** 메뉴 뒤에 보이는 장식용 판: 블록 몇 개를 미리 놓아 둔다 */
function demoBoard() {
  const g = new BlocksGame({ seed: 11 });
  for (let n = 0; n < 7; n += 1) {
    const i = g.pieces.findIndex((p, k) => p && findFit(g.cells, g.piece(k)));
    if (i < 0) break;
    const [r, c] = findFit(g.cells, g.piece(i));
    g.place(i, (r + n * 3) % 6, c) || g.place(i, r, c);
  }
  g.events.length = 0;
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
    this.screen = $('#screen');
    this.mode = 'menu';
    this.game = null;
    this.gamesThisSession = 0;
    this.armAt = 0;
    this.shown = { score: -1, best: -1, combo: -1 };
    addEventListener('resize', () => this.renderer.resize());
    document.addEventListener('visibilitychange', () => { this.sound.setHidden(document.hidden); this.syncGameplay(); });
    addEventListener('pointerdown', () => this.sound.unlock(), { capture: true });
    addEventListener('keydown', (e) => this.onKey(e));
    this.bindPointer($('#game'));
    $('#pause-btn').addEventListener('click', () => this.pause());
    $('#shuffle-btn').addEventListener('click', () => this.shuffleWithAd());
    // 손가락으로 끄는 동안 페이지가 스크롤·확대되지 않게
    addEventListener('touchmove', (e) => { if (this.renderer.drag) e.preventDefault(); }, { passive: false });
  }

  async boot() {
    this.title();
    this.last = performance.now();
    requestAnimationFrame((ts) => this.frame(ts));
    this.adsReady = Ads.init({
      onPause: () => { this.sound.mute(true); this.cancelDrag(); },
      onResume: () => { this.sound.mute(false); },
    });
    await this.adsReady;
    Ads.loadingFinished();
    if (this.mode === 'menu' && this.screen.querySelector('.title')) this.title();
  }

  frame(ts) {
    const dt = Math.min(0.05, (ts - this.last) / 1000);
    this.last = ts;
    const g = this.game || this.demo || (this.demo = demoBoard());
    this.renderer.consume(g);
    this.renderer.draw(g, dt);
    if (this.game) this.updateHud();
    this.syncGameplay();
    requestAnimationFrame((n) => this.frame(n));
  }

  syncGameplay() {
    const active = this.mode === 'play' && !document.hidden && !Ads.busy && this.game && !this.game.over;
    if (active !== Ads.playing) { if (active) Ads.gameplayStart(); else Ads.gameplayStop(); }
  }

  /* ───────── 끌기 ───────── */

  bindPointer(el) {
    el.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'play' || Ads.busy || this.renderer.drag || !this.game || this.game.over) return;
      const i = this.renderer.slotAt(e.clientX, e.clientY);
      if (i < 0 || !this.game.pieces[i]) return;
      el.setPointerCapture?.(e.pointerId);
      // 터치는 손가락에 가리지 않게 블록을 손가락 위로 띄운다
      const offY = e.pointerType === 'touch' ? this.renderer.cell * 2.2 : this.renderer.cell * 0.4;
      this.renderer.drag = { i, id: e.pointerId, x: e.clientX, y: e.clientY, offY, valid: false };
      this.renderer.updateDrag(this.game, e.clientX, e.clientY);
      this.sound.play('pick');
    });
    el.addEventListener('pointermove', (e) => {
      const d = this.renderer.drag;
      if (!d || d.id !== e.pointerId) return;
      this.renderer.updateDrag(this.game, e.clientX, e.clientY);
    });
    const end = (e) => {
      const d = this.renderer.drag;
      if (!d || d.id !== e.pointerId) return;
      this.renderer.updateDrag(this.game, e.clientX, e.clientY);
      this.renderer.drag = null;
      if (d.valid) this.place(d.i, d.r, d.c);
      else {
        this.renderer.sendBack(this.game, d.i, d.x, d.y - d.offY);
        if (this.renderer.slotAt(e.clientX, e.clientY) < 0) this.sound.play('nope');
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  cancelDrag() {
    const d = this.renderer.drag;
    if (!d || !this.game) return;
    this.renderer.drag = null;
    this.renderer.sendBack(this.game, d.i, d.x, d.y - d.offY);
  }

  place(i, r, c) {
    const g = this.game;
    const res = g.place(i, r, c);
    if (!res) return;
    if (res.lines) {
      this.sound.comboPitch = Math.min(12, (res.combo - 1) * 2);
      this.sound.play(`clear${Math.min(4, res.lines)}`);
      if (res.boardClear) { this.renderer.shout(t('perfect'), '#7dff6a'); this.sound.play('perfect'); }
      else if (res.combo >= 2) this.renderer.shout(t('combo', { n: res.combo }), '#ff3d7f');
      else if (res.lines >= 3) this.renderer.shout(t('amazing'), '#ffe14d');
      else if (res.lines === 2) this.renderer.shout(t('great'), '#3df2ff');
      if (res.combo >= 3 || res.lines >= 3 || res.boardClear) Ads.happytime();
    } else {
      this.sound.play('place');
    }
    this.save();
    this.checkOver();
  }

  /** 놓을 곳이 없으면 잠깐 회색 판을 보여 준 뒤 결과 화면으로 */
  checkOver() {
    const g = this.game;
    if (!g?.over || this.overTimer) return;
    this.cancelDrag();
    this.sound.play('over');
    this.overTimer = setTimeout(() => {
      this.overTimer = null;
      if (this.game === g && g.over && this.mode === 'play') this.gameOver();
    }, 900);
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
    if (resume && this.profile.saved) this.game = BlocksGame.restore(this.profile.saved, Date.now() % 1e9);
    else this.game = new BlocksGame({ seed: daily ? dailySeed(day) : Math.floor(Math.random() * 1e9), daily });
    this.game.day = day;
    this.mode = 'play';
    this.shuffleUsed = false;
    this.renderer.overFade = 0;
    this.renderer.particles.length = 0;
    this.clear();
    $('#hud').hidden = false;
    $('#daily-tag').hidden = !daily;
    $('#daily-tag').textContent = t('dailyTag', { day });
    this.updateShuffle();
    this.sound.startMusic();
    if (!this.profile.tutorialDone) {
      this.toast(t('howTo'), 5000);
      this.profile.tutorialDone = true;
    }
    this.save();
    this.starting = false;
    this.checkOver();
  }

  save() {
    const g = this.game;
    // 일일 도전은 하루 한 판 기록용이라 이어하기 저장을 하지 않는다
    this.profile.saved = g && !g.daily && !g.over ? g.snapshot() : (g && !g.daily ? null : this.profile.saved);
    saveProfile(this.profile);
  }

  updateHud() {
    const g = this.game;
    const best = g.daily ? (this.profile.daily.day === g.day ? this.profile.daily.best : 0) : this.profile.best;
    if (this.shown.score !== g.score) { this.shown.score = g.score; $('#score').textContent = fmt(g.score); $('#score').classList.remove('bump'); void $('#score').offsetWidth; $('#score').classList.add('bump'); }
    const b = Math.max(best, g.score);
    if (this.shown.best !== b) { this.shown.best = b; $('#best').textContent = fmt(b); }
    const combo = g.combo >= 2 ? g.combo : 0;
    if (this.shown.combo !== combo) { this.shown.combo = combo; $('#combo').hidden = !combo; $('#combo').textContent = t('combo', { n: combo }); }
  }

  updateShuffle() {
    $('#shuffle-btn').hidden = !(Ads.rewardedAvailable && this.mode === 'play' && !this.shuffleUsed);
    $('#shuffle-btn').title = t('shuffleAd');
    $('#shuffle-btn').setAttribute('aria-label', t('shuffleAd'));
  }

  async watchAd() {
    if (Ads.busy) return false;
    this.cancelDrag();
    const cover = document.createElement('div');
    cover.className = 'ad-cover';
    cover.textContent = t('adLoading');
    document.body.append(cover);
    try { return await Ads.rewarded(); } finally { cover.remove(); }
  }

  async shuffleWithAd() {
    const g = this.game;
    if (!g || g.over || this.shuffleUsed || this.mode !== 'play') return;
    const ok = await this.watchAd();
    if (this.game !== g || g.over) return;
    if (!ok) { this.toast(t('adFailed')); return; }
    this.shuffleUsed = true;
    g.shuffle();
    this.updateShuffle();
    this.save();
    this.checkOver();
  }

  gameOver() {
    const g = this.game;
    this.mode = 'over';
    this.cancelDrag();
    // 이어하기 뒤 다시 끝나면 판 수는 그대로, 늘어난 줄만 더한다
    const newBest = recordGame(this.profile, { score: g.score, lines: g.linesTotal - (g.recordedLines || 0), daily: g.daily, day: g.day, count: !g.recorded });
    g.recorded = true;
    g.recordedLines = g.linesTotal;
    if (!g.daily) this.profile.saved = null;
    saveProfile(this.profile);
    if (newBest && g.score > 0) Ads.happytime();
    const best = g.daily ? this.profile.daily.best : this.profile.best;
    const canRevive = Ads.rewardedAvailable && g.continues < 1;
    this.updateShuffle();
    this.mount(`<div class="panel">
      <h2>${esc(t('gameOver'))}</h2>
      ${newBest ? `<span class="badge">${esc(t('newBest'))}</span>` : ''}
      <dl class="results">
        <div><dt>${esc(t('score'))}</dt><dd>${fmt(g.score)}</dd></div>
        <div><dt>${esc(t('best'))}</dt><dd>${fmt(best)}</dd></div>
        <div><dt>${esc(t('lines'))}</dt><dd>${fmt(g.linesTotal)}</dd></div>
        <div><dt>${esc(t('bestCombo'))}</dt><dd>×${g.bestCombo}</dd></div>
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
    this.updateShuffle();
    this.save();
  }

  pause() {
    if (this.mode !== 'play' || Ads.busy || this.game?.over) return;
    this.cancelDrag();
    this.mode = 'paused';
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
    $('#hud').hidden = true;
    this.sound.stopMusic();
    const day = localDay();
    const dailyBest = this.profile.daily.day === day ? this.profile.daily.best : 0;
    const saved = this.profile.saved;
    this.mount(`<div class="title">
      <h1 class="logo">NOVA<span>BLOCKS</span></h1>
      <p class="tagline">${esc(t('tagline'))}</p>
      <div class="stats-line"><span class="chip">${esc(t('best'))} ${fmt(this.profile.best)}</span></div>
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
      if (k === 'lang') { setLang(s.lang); document.documentElement.lang = s.lang; saveProfile(this.profile); this.settings(back); return; }
      this.sound.setVolumes(s.sfx, s.music);
      saveProfile(this.profile);
    }));
    this.on('[data-act="back"]', () => back());
  }

  onKey(e) {
    if (Ads.busy) { e.preventDefault(); return; }
    if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && !e.repeat) {
      if (this.mode === 'play') { e.preventDefault(); this.pause(); } else if (this.mode === 'paused') { e.preventDefault(); this.resume(); }
    }
    if (['ArrowUp', 'ArrowDown', ' '].includes(e.key) && !e.target?.closest?.('input, select, button')) e.preventDefault();
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
      if (navigator.share) { await navigator.share({ title: 'NOVA BLOCKS', text, ...(url ? { url } : {}) }); return; }
      await navigator.clipboard.writeText(url ? `${text} ${url}` : text);
      this.toast(t('copied'));
    } catch (err) {
      if (err?.name !== 'AbortError') this.toast(t('shareFailed'));
    }
  }
}

const app = new App();
app.boot();
globalThis.__blocks = app;
