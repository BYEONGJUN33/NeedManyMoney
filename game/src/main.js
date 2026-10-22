// 앱 진입점: 화면 전환, 게임 루프, 광고·저장 연결.
import { Game } from './game.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { UI } from './ui.js';
import { Ads } from './ads.js';
import { steer, pickChoice } from './bot.js';
import { CHARACTERS, runBonusGold } from './data.js';
import {
  loadProfile, saveProfile, buyMeta, unlockCharacter, recordRun,
} from './profile.js';
import { setLang, detectLang, t } from './i18n.js';
import { formatTime } from './math.js';

class App {
  constructor() {
    this.profile = loadProfile();
    setLang(detectLang(this.profile.settings.lang));
    document.documentElement.lang = this.profile.settings.lang || detectLang();
    this.sound = new Sound();
    this.sound.setVolumes(this.profile.settings.sfx, this.profile.settings.music);
    this.renderer = new Renderer(document.getElementById('game'));
    this.renderer.shakeOn = this.profile.settings.shake;
    this.input = new Input(document.getElementById('game'), document.getElementById('stick'));
    this.input.onPause = () => this.pause();
    this.ui = new UI(this);
    this.mode = 'menu';
    this.paused = false;
    this.runsThisSession = 0;
    this.lastState = null;
    this.frameTimes = [];
    this.demo = this.newDemo();
    addEventListener('resize', () => this.renderer.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    addEventListener('pointerdown', () => this.sound.unlock(), { once: false, capture: true });
    addEventListener('keydown', () => this.sound.unlock(), { capture: true });
  }

  async boot() {
    this.ui.title(this.profile);
    this.last = performance.now();
    requestAnimationFrame((ts) => this.frame(ts));
    await Ads.init({
      onPause: () => { this.sound.mute(true); this.input.enabled = false; },
      onResume: () => { this.sound.mute(false); this.input.enabled = true; },
    });
    Ads.loadingFinished();
  }

  newDemo() {
    const g = new Game({ character: 'nova', seed: Math.floor(Math.random() * 1e6) });
    g.characterColor = CHARACTERS.nova.color;
    g.sfx = { push() {} }; // 데모는 소리 없이
    return g;
  }

  /* ───────── 루프 ───────── */

  frame(ts) {
    const dt = Math.min(0.05, (ts - this.last) / 1000);
    this.last = ts;
    this.trackPerf(dt);
    if (this.mode === 'run') this.tickRun(dt);
    else this.tickDemo(dt);
    requestAnimationFrame((n) => this.frame(n));
  }

  tickDemo(dt) {
    const g = this.demo;
    g.viewR = this.renderer.viewRadius;
    if (g.state === 'levelup') g.choose(pickChoice(g, g.choices));
    else if (g.state === 'chest') g.choose(g.chest);
    else if (g.state !== 'play' || g.t > 240) this.demo = this.newDemo();
    else g.update(dt, steer(g));
    g.fx = g.fx.filter((e) => e.type !== 'boss' && e.type !== 'swarm');
    this.renderer.consume(g);
    this.renderer.draw(g, dt);
  }

  tickRun(dt) {
    const g = this.game;
    g.viewR = this.renderer.viewRadius;
    if (!this.paused && g.state === 'play') g.update(dt, this.input.move);
    this.handleEvents(g);
    this.renderer.consume(g);
    this.renderer.draw(g, this.paused || g.state !== 'play' ? 0 : dt);
    for (const s of g.sfx) this.sound.play(s);
    g.sfx.length = 0;
    this.sound.intensity = g.boss ? 1 : Math.min(1, g.enemies.length / 150);
    this.ui.updateHud(g);
    if (g.state !== this.lastState) this.onState(g.state);
  }

  handleEvents(g) {
    for (const e of g.fx) {
      if (e.type === 'boss') this.ui.banner(e.name === 'overmind' ? t('finalBoss') : t('bossIncoming'));
      if (e.type === 'swarm') this.ui.banner(t('swarmIncoming'));
    }
  }

  onState(state) {
    this.lastState = state;
    const g = this.game;
    if (state === 'play') { this.ui.clear(); return; }
    if (state === 'levelup') this.ui.levelUp(g, { canAdReroll: Ads.rewardedAvailable });
    if (state === 'chest') this.ui.chest(g);
    if (state === 'dead') {
      const canAd = Ads.rewardedAvailable && g.adRevivesUsed < 1;
      if (g.revives > 0 || canAd) this.ui.death(g, { canAdRevive: canAd });
      else setTimeout(() => this.endRun(), 900);
    }
    if (state === 'won') {
      Ads.happytime();
      setTimeout(() => this.endRun(), 1800);
    }
  }

  trackPerf(dt) {
    // 프레임이 계속 느리면 그래픽 품질을 낮춘다
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > 0.024 && this.renderer.quality === 1) {
      this.renderer.quality = 0;
      this.renderer.resize();
    }
  }

  /* ───────── 판 진행 ───────── */

  async startRun() {
    if (this.starting) return;
    this.starting = true;
    this.sound.unlock();
    if (this.runsThisSession > 0) await Ads.midgame();
    this.runsThisSession += 1;
    const ch = this.profile.character;
    this.game = new Game({ character: ch, meta: this.profile.meta, seed: Math.floor(Math.random() * 1e9) });
    this.game.characterColor = CHARACTERS[ch].color;
    this.mode = 'run';
    this.paused = false;
    this.lastState = 'play';
    this.renderer.particles.length = 0;
    this.ui.clear();
    this.ui.showHud();
    this.sound.startMusic();
    Ads.gameplayStart();
    this.starting = false;
  }

  pause() {
    if (this.mode !== 'run' || this.paused || this.game.state !== 'play') return;
    this.paused = true;
    this.input.release();
    Ads.gameplayStop();
    this.ui.pause();
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.ui.clear();
    Ads.gameplayStart();
  }

  choose(c) {
    if (!this.game) return;
    this.game.choose(c);
    this.lastState = null; // 다음 레벨업이 이어지면 다시 그린다
  }

  async reroll(free) {
    const g = this.game;
    if (free) { if (g.reroll(true)) this.ui.levelUp(g, { canAdReroll: Ads.rewardedAvailable }); return; }
    const ok = await Ads.rewarded();
    if (ok) { g.reroll(false); this.ui.levelUp(g, { canAdReroll: Ads.rewardedAvailable }); }
    else this.ui.toast(t('adFailed'));
  }

  async revive(kind) {
    const g = this.game;
    if (kind === 'free') { g.useFreeRevive(); return; }
    const ok = await Ads.rewarded();
    if (ok) {
      g.adRevivesUsed += 1;
      g.revive();
    } else {
      this.ui.toast(t('adFailed'));
    }
  }

  endRun() {
    if (this.mode !== 'run') return;
    const g = this.game;
    const r = g.summary();
    r.totalGold = Math.round(g.gold + runBonusGold(r) * g.stats.greed);
    const newBest = recordRun(this.profile, { ...r, gold: r.totalGold });
    saveProfile(this.profile);
    this.lastResult = r;
    this.mode = 'results';
    this.paused = false;
    Ads.gameplayStop();
    this.sound.stopMusic();
    if (newBest && r.time > 60) Ads.happytime();
    this.ui.results(r, { canDouble: Ads.rewardedAvailable, newBest });
    this.demo = this.newDemo();
  }

  async doubleGold(btn) {
    btn.disabled = true;
    const ok = await Ads.rewarded();
    if (!ok) { btn.disabled = false; this.ui.toast(t('adFailed')); return; }
    const r = this.lastResult;
    this.profile.gold += r.totalGold;
    this.profile.stats.goldEarned += r.totalGold;
    saveProfile(this.profile);
    r.totalGold *= 2;
    const el = document.getElementById('gold-earned');
    if (el) el.textContent = new Intl.NumberFormat().format(r.totalGold);
    btn.remove();
    this.ui.toast(t('doubled'));
  }

  toMenu() {
    this.mode = 'menu';
    this.ui.title(this.profile);
  }

  async share(r) {
    const url = location.href.split('?')[0];
    const text = t('shareText', { time: formatTime(r.time), kills: r.kills.toLocaleString() });
    try {
      if (navigator.share) { await navigator.share({ title: 'NOVA SWARM', text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`);
      this.ui.toast(t('copied'));
    } catch { /* 사용자가 취소 */ }
  }

  click() { this.sound.unlock(); this.sound.play('click'); }

  /* ───────── 메뉴 동작 ───────── */

  buyMeta(id) {
    if (!buyMeta(this.profile, id)) { this.ui.toast(t('notEnoughGold')); return; }
    saveProfile(this.profile);
    this.sound.play('coin');
  }

  unlockCharacter(id) {
    if (!unlockCharacter(this.profile, id)) { this.ui.toast(t('notEnoughGold')); return; }
    this.profile.character = id;
    saveProfile(this.profile);
    this.sound.play('chest');
  }

  pickCharacter(id) {
    if (!this.profile.characters.includes(id)) return;
    this.profile.character = id;
    saveProfile(this.profile);
  }

  setSetting(k, v) {
    this.profile.settings[k] = v;
    if (k === 'sfx' || k === 'music') this.sound.setVolumes(this.profile.settings.sfx, this.profile.settings.music);
    if (k === 'shake') this.renderer.shakeOn = v;
    if (k === 'lang') { setLang(v); document.documentElement.lang = v; }
    saveProfile(this.profile);
  }
}

const app = new App();
app.boot();
globalThis.__nova = app; // 디버그·자동 테스트용
