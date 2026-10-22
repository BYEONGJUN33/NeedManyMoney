// 앱 진입점: 화면 전환, 게임 루프, 광고·저장 연결.
import { Game } from './game.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { UI } from './ui.js';
import { Ads } from './ads.js';
import { steer, pickChoice } from './bot.js';
import { CHARACTERS, STAGES, runBonusGold } from './data.js';
import { checkAchievements } from './achievements.js';
import {
  loadProfile, saveProfile, buyMeta, unlockCharacter, recordRun, claimDaily, localDay, stageUnlocked,
} from './profile.js';
import { nameOf } from './i18n.js';
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
    this.applyGfx();
    // Input의 keydown 리스너가 UI보다 먼저 등록되어야 한다 (일시정지 키가 UI에서 바로 재개되지 않게)
    this.input = new Input(document.getElementById('game'), document.getElementById('stick'));
    this.input.onPause = () => this.pause();
    this.ui = new UI(this);
    this.mode = 'menu';
    this.paused = false;
    this.runsThisSession = 0;
    this.lastState = null;
    this.perf = { work: 0, frames: 0, time: 0, calm: 0 };
    this.demo = this.newDemo();
    addEventListener('resize', () => { this.renderer.resize(); this.frozenDrawn = false; });
    document.addEventListener('visibilitychange', () => {
      this.sound.setHidden(document.hidden);
      if (document.hidden) this.pause();
    });
    addEventListener('pointerdown', () => this.sound.unlock(), { capture: true });
    addEventListener('keydown', () => this.sound.unlock(), { capture: true });
  }

  async boot() {
    this.ui.title(this.profile);
    this.last = performance.now();
    requestAnimationFrame((ts) => this.frame(ts));
    this.adsReady = Ads.init({
      onPause: () => { this.sound.mute(true); this.input.enabled = false; this.input.release(); },
      onResume: () => { this.sound.mute(false); this.input.enabled = true; },
    });
    await this.adsReady;
    Ads.loadingFinished();
    // 광고가 준비되면 타이틀의 '광고 보고 2배' 버튼을 보여 주기 위해 다시 그린다 (다른 메뉴에 있으면 그대로)
    if (this.mode === 'menu' && this.ui.screen.querySelector('.title')) this.ui.title(this.profile);
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
    const t0 = performance.now();
    if (this.mode === 'run') this.tickRun(dt);
    else this.tickDemo(dt);
    this.syncGameplay();
    if (this.mode === 'run') this.trackPerf(dt, performance.now() - t0);
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
    const frozen = this.paused || g.state !== 'play' || Ads.busy;
    if (!frozen) g.update(dt, this.input.move);
    this.handleEvents(g);
    this.renderer.consume(g);
    // 멈춘 동안에는 한 번만 그리고 쉰다 (배터리·발열)
    if (!frozen || !this.frozenDrawn) this.renderer.draw(g, frozen ? 0 : dt, frozen);
    this.frozenDrawn = frozen;
    for (const s of g.sfx) this.sound.play(s);
    g.sfx.length = 0;
    this.sound.intensity = g.boss ? 1 : Math.min(1, g.enemies.length / 150);
    this.ui.updateHud(g);
    if (g.state !== this.lastState) this.onState(g.state);
  }

  /** 포털 SDK에 "지금 실제로 플레이 중인지"를 매 프레임 맞춰 보낸다 */
  syncGameplay() {
    const active = this.mode === 'run' && !this.paused && this.game?.state === 'play' && !Ads.busy && !document.hidden;
    if (active !== Ads.playing) {
      if (active) Ads.gameplayStart();
      else Ads.gameplayStop();
    }
  }

  handleEvents(g) {
    for (const e of g.fx) {
      if (e.type === 'boss') this.ui.banner(e.name === 'overmind' ? t('finalBoss') : t('bossIncoming'));
      if (e.type === 'swarm') this.ui.banner(t('swarmIncoming'));
    }
  }

  onState(state) {
    this.lastState = state;
    this.frozenDrawn = false;
    const g = this.game;
    if (state === 'play') { this.ui.clear(); return; }
    this.input.release();
    if (state === 'levelup') this.ui.levelUp(g, { canAdReroll: Ads.rewardedAvailable });
    if (state === 'chest') this.ui.chest(g);
    if (state === 'dead') {
      const canAd = Ads.rewardedAvailable && g.adRevivesUsed < 1;
      if (g.revives > 0 || canAd) this.ui.death(g, { canAdRevive: canAd });
      else setTimeout(() => { if (this.game === g) this.endRun(); }, 900);
    }
    if (state === 'won') {
      Ads.happytime();
      setTimeout(() => { if (this.game === g && g.state === 'won') this.ui.victory(g); }, 1500);
    }
  }

  /** 그래픽 설정: auto는 실제 작업 시간을 보고 품질을 바꾼다 */
  applyGfx() {
    const g = this.profile.settings.gfx;
    const q = g === 'low' ? 0 : 1;
    if (this.renderer.quality !== q) { this.renderer.quality = q; this.renderer.resize(); }
  }

  trackPerf(dt, work) {
    if (this.profile.settings.gfx !== 'auto' || this.paused || this.game.state !== 'play') return;
    const p = this.perf;
    p.work += work;
    p.time += dt;
    p.frames += 1;
    if (p.time < 1) return;
    const avgWork = p.work / p.frames;
    p.work = 0; p.time = 0; p.frames = 0;
    const r = this.renderer;
    // 한 프레임 작업이 12ms를 넘으면(60Hz 예산의 70%) 품질을 낮추고, 5초 연속 여유가 있으면 되돌린다
    if (r.quality === 1 && avgWork > 12) { r.quality = 0; r.resize(); p.calm = 0; }
    else if (r.quality === 0 && avgWork < 5) { p.calm += 1; if (p.calm >= 5) { r.quality = 1; r.resize(); p.calm = 0; } }
    else p.calm = 0;
  }

  /* ───────── 판 진행 ───────── */

  async startRun() {
    if (this.starting || Ads.busy) return;
    this.starting = true;
    this.sound.unlock();
    document.activeElement?.blur?.();
    const token = (this.navToken = (this.navToken || 0) + 1);
    this.ui.loading();
    await this.adsReady;
    // GameDistribution은 첫 판 앞에도 광고를 요청한다 (빈도는 SDK가 조절)
    if (this.runsThisSession > 0 || Ads.provider === 'gd') await Ads.midgame();
    if (token !== this.navToken) { this.starting = false; return; }
    this.runsThisSession += 1;
    const ch = this.profile.character;
    const stage = stageUnlocked(this.profile, this.profile.stage) ? this.profile.stage : 'grid';
    this.game = new Game({ character: ch, meta: this.profile.meta, seed: Math.floor(Math.random() * 1e9), stage });
    this.game.characterColor = CHARACTERS[ch].color;
    this.mode = 'run';
    this.paused = false;
    this.lastState = 'play';
    this.frozenDrawn = false;
    this.renderer.particles.length = 0;
    this.ui.clear();
    this.ui.showHud();
    if (!this.profile.tutorialDone) {
      this.ui.tutorial();
      this.profile.tutorialDone = true;
      saveProfile(this.profile);
    }
    this.sound.startMusic();
    this.starting = false;
  }

  /** 실제로 멈췄으면 true */
  pause() {
    if (this.mode !== 'run' || this.paused || this.game.state !== 'play' || Ads.busy) return false;
    this.paused = true;
    this.input.release();
    this.ui.pause();
    return true;
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    document.activeElement?.blur?.();
    this.ui.clear();
  }

  choose(c) {
    if (!this.game || Ads.busy) return;
    this.game.choose(c);
    this.lastState = null; // 다음 레벨업이 이어지면 다시 그린다
  }

  /** 보상형 광고를 보고 결과를 돌려준다. 광고 중에는 화면을 막는다. */
  async watchAd() {
    if (Ads.busy) return false;
    document.activeElement?.blur?.();
    this.ui.adCover(true);
    try {
      return await Ads.rewarded();
    } finally {
      this.ui.adCover(false);
    }
  }

  async reroll(free) {
    const g = this.game;
    if (!g || g.state !== 'levelup' || Ads.busy) return;
    if (free) { if (g.reroll(true)) this.ui.levelUp(g, { canAdReroll: Ads.rewardedAvailable }); return; }
    if (!Ads.rewardedAvailable) return;
    const ok = await this.watchAd();
    if (g !== this.game || g.state !== 'levelup') return;
    if (ok) g.reroll(false);
    else this.ui.toast(t('adFailed'));
    this.ui.levelUp(g, { canAdReroll: Ads.rewardedAvailable });
  }

  async revive(kind) {
    const g = this.game;
    if (!g || g.state !== 'dead' || Ads.busy) return;
    if (kind === 'free') { g.useFreeRevive(); return; }
    const ok = await this.watchAd();
    if (this.mode !== 'run' || g !== this.game || g.state !== 'dead') return;
    if (ok) {
      g.adRevivesUsed += 1;
      g.revive();
    } else {
      this.ui.toast(t('adFailed'));
      this.ui.death(g, { canAdRevive: Ads.rewardedAvailable && g.adRevivesUsed < 1 });
    }
  }

  async claimDaily(withAd) {
    if (Ads.busy || this.mode !== 'menu') return;
    let mult = 1;
    if (withAd) {
      const ok = await this.watchAd();
      if (this.mode !== 'menu') return;
      if (!ok) { this.ui.toast(t('adFailed')); return; }
      mult = 2;
    }
    const got = claimDaily(this.profile, localDay(), mult);
    if (!got) return;
    saveProfile(this.profile);
    this.sound.play('chest');
    this.ui.toast(t('dailyGot', { n: got }));
    this.checkMenuAchievements();
    this.ui.title(this.profile);
  }

  endRun() {
    if (this.mode !== 'run') return;
    this.ui.hideTutorial();
    const g = this.game;
    const r = g.summary();
    r.totalGold = Math.round((g.gold + runBonusGold(r) * g.stats.greed) * STAGES[g.stage].gold);
    r.doubled = false;
    const newBest = recordRun(this.profile, { ...r, gold: r.totalGold });
    const achieved = checkAchievements(this.profile, r);
    saveProfile(this.profile);
    this.lastResult = r;
    this.mode = 'results';
    this.paused = false;
    this.navToken = (this.navToken || 0) + 1;
    this.sound.stopMusic();
    if (newBest && r.time > 60) Ads.happytime();
    this.ui.results(r, { canDouble: Ads.rewardedAvailable, newBest });
    this.announce(achieved);
    this.demo = this.newDemo();
  }

  /** 업적 달성 알림을 차례로 보여 준다 */
  announce(list) {
    if (!list.length) return;
    Ads.happytime();
    this.sound.play('chest');
    list.forEach((a, i) => setTimeout(() => this.ui.toast(t('achUnlocked', { name: nameOf('ach', a.id), gold: a.gold }), 2600), i * 2800));
  }

  /** 메뉴에서 달성되는 업적(누적 기록·영웅·출석·구매) */
  checkMenuAchievements() {
    const got = checkAchievements(this.profile);
    if (got.length) { saveProfile(this.profile); this.announce(got); }
    return got.length > 0;
  }

  continueEndless() {
    const g = this.game;
    if (!g || g.state !== 'won') return;
    g.continueEndless();
    this.lastState = null;
  }

  pickStage(id) {
    if (!Object.hasOwn(STAGES, id) || !stageUnlocked(this.profile, id)) return;
    this.profile.stage = id;
    saveProfile(this.profile);
  }

  async doubleGold(btn) {
    const r = this.lastResult;
    if (!r || r.doubled || Ads.busy) return;
    btn.disabled = true;
    const ok = await this.watchAd();
    if (this.mode !== 'results' || this.lastResult !== r || r.doubled) return;
    if (!ok) { btn.disabled = false; this.ui.toast(t('adFailed')); return; }
    r.doubled = true;
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
    this.navToken = (this.navToken || 0) + 1;
    this.mode = 'menu';
    this.ui.title(this.profile);
  }

  async share(r) {
    // 포털 iframe 안에서는 빌드 파일 주소가 아니라 문구만 공유한다
    const embedded = globalThis.top !== globalThis.self;
    const url = globalThis.NOVA_SHARE_URL || (embedded ? '' : location.href.split('?')[0]);
    const text = t('shareText', { time: formatTime(r.time), kills: r.kills.toLocaleString() });
    try {
      if (navigator.share) { await navigator.share({ title: 'NOVA SWARM', text, ...(url ? { url } : {}) }); return; }
      await navigator.clipboard.writeText(url ? `${text} ${url}` : text);
      this.ui.toast(t('copied'));
    } catch (e) {
      if (e?.name !== 'AbortError') this.ui.toast(t('shareFailed'));
    }
  }

  click() { this.sound.unlock(); this.sound.play('click'); }

  /* ───────── 메뉴 동작 ───────── */

  buyMeta(id) {
    if (!buyMeta(this.profile, id)) { this.ui.toast(t('notEnoughGold')); return; }
    saveProfile(this.profile);
    this.sound.play('coin');
    this.checkMenuAchievements();
  }

  unlockCharacter(id) {
    if (!unlockCharacter(this.profile, id)) { this.ui.toast(t('notEnoughGold')); return; }
    this.profile.character = id;
    saveProfile(this.profile);
    this.sound.play('chest');
    this.checkMenuAchievements();
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
    if (k === 'lang') { setLang(v); document.documentElement.lang = v; this.ui.translateStatic(); }
    if (k === 'gfx') this.applyGfx();
    saveProfile(this.profile);
  }
}

const app = new App();
app.boot();
globalThis.__nova = app; // 디버그·자동 테스트용
