// DOM 화면: 타이틀, 영웅, 강화 상점, 설정, 레벨업, 상자, 일시정지, 부활, 결과, HUD.
import { EVOLUTIONS, META, CHARACTERS } from './data.js';
import { weaponStats } from './upgrades.js';
import { nextMetaCost, dailyStatus, localDay } from './profile.js';
import {
  t, nameOf, descOf, LANGS, getLang,
} from './i18n.js';
import { choiceIcon, weaponIcon, passiveIcon, metaIcon } from './icons.js';
import { formatTime } from './math.js';
import { Ads } from './ads.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => new Intl.NumberFormat(getLang() === 'ko' ? 'ko-KR' : 'en-US').format(Math.round(n));
/** HUD용 짧은 숫자: 12,345 → 12.3k */
const short = (n) => (n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : fmt(n));
/** 버튼·입력에 포커스가 있을 때 Enter/Space는 그 컨트롤의 기본 동작에 맡긴다 */
const onControl = (e) => (e.key === 'Enter' || e.key === ' ') && e.target?.closest?.('button, input, select, textarea, a');

const STAT_LABEL = {
  damage: 'statDamage', cooldown: 'statCooldown', count: 'statCount', pierce: 'statPierce', radius: 'statRadius', spin: 'statSpin',
  chains: 'statChains', blast: 'statBlast', width: 'statWidth', length: 'statLength', beams: 'statBeams', maxRadius: 'statMaxRadius',
  drones: 'statDrones', slow: 'statSlow', tick: 'statTick', push: 'statPush', speed: 'statSpeed', size: 'statSize',
};
const statVal = (k, v) => (k === 'slow' ? `${Math.round(v * 100)}%` : k === 'cooldown' || k === 'tick' ? `${v}s` : v);

/** 레벨업 카드 설명: 새 무기면 설명, 강화면 바뀌는 스탯 */
export function choiceText(c) {
  if (c.type === 'weapon') {
    if (c.level === 1) {
      const evo = EVOLUTIONS[c.id];
      return { name: nameOf('weapons', c.id), tag: t('new'), desc: descOf('weapons', c.id) + (evo ? ` · ${t('evolveHint', { passive: nameOf('passives', evo.passive) })}` : '') };
    }
    const a = weaponStats(c.id, c.level - 1);
    const b = weaponStats(c.id, c.level);
    const diffs = Object.keys(b).filter((k) => STAT_LABEL[k] && a[k] !== b[k]).map((k) => `${t(STAT_LABEL[k])} ${statVal(k, a[k])} → ${statVal(k, b[k])}`);
    return { name: nameOf('weapons', c.id), tag: `Lv ${c.level}`, desc: diffs.join(' · ') };
  }
  if (c.type === 'evolve') return { name: nameOf('weapons', c.into), tag: t('evolve'), desc: descOf('weapons', c.into), evo: true };
  if (c.type === 'passive') return { name: nameOf('passives', c.id), tag: c.level === 1 ? t('new') : `Lv ${c.level}`, desc: descOf('passives', c.id) };
  if (c.type === 'gold') return { name: t('goldFiller', { n: c.amount }), tag: '', desc: '' };
  return { name: t('healFiller', { n: c.amount }), tag: '', desc: '' };
}

export class UI {
  constructor(app) {
    this.app = app;
    this.screen = $('#screen');
    this.hud = $('#hud');
    this.toastEl = $('#toast');
    this.bannerEl = $('#banner');
    this.keyHandler = null;
    this.last = {};
    this.armAt = 0;
    addEventListener('keydown', (e) => {
      if (Ads.busy) { e.preventDefault(); return; }
      if (e.repeat || onControl(e)) return;
      this.keyHandler?.(e);
    });
    // 이동 손가락을 누른 채 다른 손가락으로 눌러도 바로 반응하도록 pointerdown에서 처리한다
    $('#pause-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); app.pause(); });
    $('#pause-btn').addEventListener('click', () => app.pause());
    this.translateStatic();
  }

  /** index.html에 고정된 라벨 번역 */
  translateStatic() {
    $('#pause-btn').setAttribute('aria-label', t('pause'));
    $('#kills').parentElement.title = t('kills');
    $('#gold').parentElement.title = t('gold');
  }

  /** 판을 준비하는 동안(광고 SDK 대기·판 사이 광고) 버튼을 막는다 */
  loading() {
    this.mount(`<div class="panel" style="width:auto"><p class="sub" style="margin:0">${esc(t('loading'))}</p></div>`);
  }

  /** 보상형 광고를 요청하는 동안 화면 전체를 막는다 */
  adCover(on) {
    let el = $('#ad-cover');
    if (on && !el) {
      el = document.createElement('div');
      el.id = 'ad-cover';
      el.className = 'ad-cover';
      el.textContent = t('adLoading');
      document.body.append(el);
    }
    if (!on && el) el.remove();
  }

  clear() {
    this.screen.innerHTML = '';
    this.screen.className = 'screen';
    this.keyHandler = null;
  }

  mount(html, { dim = true, keys = null } = {}) {
    this.screen.className = `screen${dim ? ' dim' : ''}`;
    this.screen.innerHTML = html;
    this.screen.scrollTop = 0;
    this.keyHandler = keys;
    // 화면이 뜬 직후 이동하던 손가락이 닿아 실수로 고르지 않게 잠깐 입력을 받지 않는다
    this.armAt = performance.now() + 350;
    const first = this.screen.querySelector('[data-autofocus]') || this.screen.querySelector('button');
    first?.focus({ preventScroll: true });
    this.screen.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => this.app.click(), { capture: true }));
  }

  /**
   * 버튼 동작 연결. 멀티터치에서는 click이 생기지 않으므로 같은 요소의 pointerdown→pointerup도 받는다.
   * 둘 다 오면 한 번만 실행한다.
   */
  on(sel, fn) {
    this.screen.querySelectorAll(sel).forEach((el) => {
      let downId = null;
      let firedAt = 0;
      const fire = (e) => {
        if (performance.now() < this.armAt || Ads.busy || el.disabled) return;
        firedAt = performance.now();
        fn(e, el);
      };
      el.addEventListener('pointerdown', (e) => { downId = e.pointerId; });
      el.addEventListener('pointerup', (e) => { if (e.pointerId === downId && e.pointerType === 'touch') { downId = null; fire(e); } });
      el.addEventListener('click', (e) => { if (performance.now() - firedAt > 600) fire(e); });
    });
  }

  toast(msg, ms = 2200) {
    this.toastEl.textContent = msg;
    this.toastEl.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastEl.hidden = true; }, ms);
  }

  banner(msg) {
    this.bannerEl.hidden = true;
    void this.bannerEl.offsetWidth;
    this.bannerEl.textContent = msg;
    this.bannerEl.hidden = false;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => { this.bannerEl.hidden = true; }, 2400);
  }

  /* ───────── 타이틀 ───────── */

  title(profile) {
    const ch = profile.character;
    this.hud.hidden = true;
    this.mount(`
      <div class="title">
        <h1 class="logo">NOVA<span>SWARM</span></h1>
        <p class="tagline">${esc(t('tagline'))}</p>
        <div class="stats-line">
          <span class="chip gold"><b class="ico-gold"></b>${fmt(profile.gold)}</span>
          <span class="chip">${esc(t('best'))} ${formatTime(profile.best.time)}</span>
          <span class="chip">${esc(nameOf('chars', ch))}</span>
        </div>
        ${this.dailyBox(profile)}
        <div class="menu">
          <button class="btn primary" data-act="play" data-autofocus>${esc(t('play'))}</button>
          <div class="row">
            <button class="btn" data-act="heroes">${esc(t('characters'))}</button>
            <button class="btn" data-act="shop">${esc(t('upgrades'))}</button>
          </div>
          <button class="btn ghost" data-act="settings">${esc(t('settings'))}</button>
        </div>
        <p class="howto">${esc(t('howTo'))}</p>
      </div>`, { dim: false, keys: (e) => { if (e.key === 'Enter' || e.key === ' ') this.app.startRun(); } });
    this.on('[data-act="play"]', () => this.app.startRun());
    this.on('[data-act="daily"]', () => this.app.claimDaily(false));
    this.on('[data-act="daily-ad"]', () => this.app.claimDaily(true));
    this.on('[data-act="heroes"]', () => this.heroes(profile));
    this.on('[data-act="shop"]', () => this.shop(profile));
    this.on('[data-act="settings"]', () => this.settings(profile, () => this.title(profile)));
  }

  dailyBox(profile) {
    const d = dailyStatus(profile, localDay());
    if (!d.available) return '';
    return `<div class="daily">
      <span class="daily-t">${esc(t('daily'))} · ${esc(t('dailyDay', { n: d.streak }))}</span>
      <div class="row">
        <button class="btn" data-act="daily">${esc(t('dailyClaim', { n: fmt(d.amount) }))}</button>
        ${Ads.rewardedAvailable ? `<button class="btn ad" data-act="daily-ad">${esc(t('dailyAd'))}</button>` : ''}
      </div>
    </div>`;
  }

  /** 첫 판 조작 안내 (몇 초 뒤 사라진다) */
  tutorial() {
    let el = $('#tutorial');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tutorial';
      el.className = 'tutorial';
      document.body.append(el);
    }
    el.innerHTML = [t('tutMove'), t('tutAuto'), t('tutGems')].map((s) => `<p>${esc(s)}</p>`).join('');
    el.hidden = false;
    clearTimeout(this.tutTimer);
    this.tutTimer = setTimeout(() => { el.hidden = true; }, 8000);
  }

  hideTutorial() {
    const el = $('#tutorial');
    if (el) el.hidden = true;
  }

  heroes(profile) {
    const cards = Object.entries(CHARACTERS).map(([id, c]) => {
      const owned = profile.characters.includes(id);
      const sel = profile.character === id;
      const action = sel ? `<button class="btn" disabled>${esc(t('selected'))}</button>`
        : owned ? `<button class="btn primary" data-pick="${id}">${esc(t('select'))}</button>`
          : `<button class="btn" data-unlock="${id}" ${profile.gold < c.cost ? 'disabled' : ''}>${esc(t('unlock'))} <span class="cost">${fmt(c.cost)}</span></button>`;
      return `<div class="item">
        <div class="name" style="color:${c.color}">${esc(nameOf('chars', id))}</div>
        <div style="display:flex;gap:8px;align-items:center">${weaponIcon(c.weapon).replace('<svg', '<svg width="28" height="28"')}<span class="desc">${esc(descOf('chars', id))}</span></div>
        ${action}
      </div>`;
    }).join('');
    this.mount(`<div class="panel">
      <h2>${esc(t('characters'))}</h2>
      <div class="top-gold">${fmt(profile.gold)} ${esc(t('gold'))}</div>
      <div class="shop">${cards}</div>
      <button class="btn ghost" data-act="back">${esc(t('back'))}</button>
    </div>`, { keys: (e) => { if (e.key === 'Escape') this.title(profile); } });
    this.on('[data-act="back"]', () => this.title(profile));
    this.on('[data-pick]', (e, el) => { this.app.pickCharacter(el.dataset.pick); this.heroes(profile); });
    this.on('[data-unlock]', (e, el) => { this.app.unlockCharacter(el.dataset.unlock); this.heroes(profile); });
  }

  shop(profile) {
    const items = Object.keys(META).map((id) => {
      const lvl = profile.meta[id];
      const cost = nextMetaCost(profile, id);
      const pips = Array.from({ length: META[id].max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      return `<div class="item">
        <div style="display:flex;gap:8px;align-items:center">${metaIcon(id).replace('<svg', '<svg width="24" height="24"')}<span class="name">${esc(nameOf('meta', id))}</span></div>
        <div class="desc">${esc(descOf('meta', id))}</div>
        <div class="pips">${pips}</div>
        ${cost == null ? `<button class="btn" disabled>${esc(t('maxed'))}</button>`
          : `<button class="btn" data-buy="${id}" ${profile.gold < cost ? 'disabled' : ''}>${esc(t('buy'))} <span class="cost">${fmt(cost)}</span></button>`}
      </div>`;
    }).join('');
    this.mount(`<div class="panel">
      <h2>${esc(t('upgrades'))}</h2>
      <div class="top-gold">${fmt(profile.gold)} ${esc(t('gold'))}</div>
      <div class="shop">${items}</div>
      <button class="btn ghost" data-act="back">${esc(t('back'))}</button>
    </div>`, { keys: (e) => { if (e.key === 'Escape') this.title(profile); } });
    this.on('[data-act="back"]', () => this.title(profile));
    this.on('[data-buy]', (e, el) => {
      const scroll = this.screen.querySelector('.shop').scrollTop;
      this.app.buyMeta(el.dataset.buy);
      this.shop(profile);
      this.screen.querySelector('.shop').scrollTop = scroll;
    });
  }

  settings(profile, back) {
    const s = profile.settings;
    const langs = Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${getLang() === k ? 'selected' : ''}>${v}</option>`).join('');
    this.mount(`<div class="panel">
      <h2>${esc(t('settings'))}</h2>
      <label class="setting"><span>${esc(t('sfx'))}</span><input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-set="sfx"></label>
      <label class="setting"><span>${esc(t('music'))}</span><input type="range" min="0" max="1" step="0.05" value="${s.music}" data-set="music"></label>
      <label class="setting"><span>${esc(t('shake'))}</span><input type="checkbox" ${s.shake ? 'checked' : ''} data-set="shake"></label>
      <label class="setting"><span>${esc(t('language'))}</span><select data-set="lang">${langs}</select></label>
      <label class="setting"><span>${esc(t('gfx'))}</span><select data-set="gfx">${['auto', 'high', 'low'].map((g) => `<option value="${g}" ${s.gfx === g ? 'selected' : ''}>${esc(t(`gfx${g[0].toUpperCase()}${g.slice(1)}`))}</option>`).join('')}</select></label>
      <button class="btn" data-act="back" data-autofocus>${esc(t('back'))}</button>
    </div>`, { keys: (e) => { if (e.key === 'Escape') back(); } });
    this.screen.querySelectorAll('[data-set]').forEach((el) => el.addEventListener('input', () => {
      const k = el.dataset.set;
      const v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
      this.app.setSetting(k, v);
      if (k === 'lang') this.settings(profile, back);
    }));
    this.on('[data-act="back"]', () => back());
  }

  /* ───────── 플레이 중 ───────── */

  showHud() { this.hud.hidden = false; this.last = {}; }
  hideHud() { this.hud.hidden = true; }

  updateHud(game) {
    const L = this.last;
    const xp = Math.min(100, (game.xp / game.xpNext) * 100);
    if (L.xp !== Math.round(xp)) { L.xp = Math.round(xp); $('#xp').style.width = `${xp}%`; }
    if (L.level !== game.level) { L.level = game.level; $('#lvl').textContent = `Lv ${game.level}`; }
    const time = formatTime(game.t);
    if (L.time !== time) { L.time = time; $('#timer').textContent = time; }
    if (L.kills !== game.kills) { L.kills = game.kills; $('#kills').textContent = short(game.kills); }
    if (L.gold !== game.gold) { L.gold = game.gold; $('#gold').textContent = short(game.gold); }
    const boss = game.boss && !game.boss.dead ? game.boss : null;
    const bossKey = boss ? `${boss.type}:${Math.round((boss.hp / boss.maxHp) * 200)}` : '';
    if (L.boss !== bossKey) {
      L.boss = bossKey;
      $('#bossbar').hidden = !boss;
      if (boss) {
        $('#bossname').textContent = boss.final ? t('finalBoss') : t('bossWarden');
        $('#bosshp').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      }
    }
    const load = [...game.build.weapons.map((w) => `w${w.id}${w.level}${w.evolved || ''}`), ...Object.entries(game.build.passives).map(([k, v]) => `p${k}${v}`)].join(',');
    if (L.load !== load) {
      L.load = load;
      $('#loadout').innerHTML = [
        ...game.build.weapons.map((w) => `<span class="slot${w.evolved ? ' evo' : ''}">${weaponIcon(w.id, w.evolved)}<b>${w.evolved ? '★' : w.level}</b></span>`),
        ...Object.entries(game.build.passives).map(([k, v]) => `<span class="slot">${passiveIcon(k)}<b>${v}</b></span>`),
      ].join('');
    }
  }

  levelUp(game, { canAdReroll }) {
    const cards = game.choices.map((c, i) => {
      const tx = choiceText(c);
      return `<button class="card${tx.evo ? ' evo' : ''}" data-i="${i}" ${i === 0 ? 'data-autofocus' : ''}>
        <span class="icon">${choiceIcon(c)}</span>
        <span><span class="name">${esc(tx.name)} ${tx.tag ? `<span class="tag${tx.evo ? ' evo' : ''}">${esc(tx.tag)}</span>` : ''} <span class="key">${i + 1}</span></span>
        <span class="desc">${esc(tx.desc)}</span></span>
      </button>`;
    }).join('');
    const reroll = game.rerolls > 0
      ? `<button class="btn" data-act="reroll">${esc(t('rerollFree', { n: game.rerolls }))}</button>`
      : canAdReroll ? `<button class="btn ad" data-act="adreroll">${esc(t('rerollAd'))}</button>` : '';
    this.mount(`<div class="panel">
      <h2>${esc(t('levelUp'))}</h2>
      <p class="sub">${esc(t('chooseOne'))}</p>
      <div class="cards">${cards}</div>
      ${reroll}
    </div>`, {
      keys: (e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= game.choices.length) this.app.choose(game.choices[n - 1]);
        if ((e.key === 'r' || e.key === 'R') && (game.rerolls > 0 || canAdReroll)) this.app.reroll(game.rerolls > 0);
      },
    });
    this.on('.card', (e, el) => this.app.choose(game.choices[Number(el.dataset.i)]));
    this.on('[data-act="reroll"]', () => this.app.reroll(true));
    this.on('[data-act="adreroll"]', () => this.app.reroll(false));
  }

  chest(game) {
    const c = game.chest;
    const tx = choiceText(c);
    this.mount(`<div class="panel">
      <h2 style="color:var(--gold)">${esc(t('chest'))}</h2>
      <div class="card${tx.evo ? ' evo' : ''}" style="cursor:default">
        <span class="icon">${choiceIcon(c)}</span>
        <span><span class="name">${esc(tx.name)} ${tx.tag ? `<span class="tag${tx.evo ? ' evo' : ''}">${esc(tx.tag)}</span>` : ''}</span><span class="desc">${esc(tx.desc)}</span></span>
      </div>
      <button class="btn primary" data-act="take" data-autofocus>${esc(t('take'))}</button>
    </div>`, { keys: (e) => { if (e.key === 'Enter' || e.key === ' ') this.app.choose(c); } });
    this.on('[data-act="take"]', () => this.app.choose(c));
  }

  pause() {
    this.mount(`<div class="panel">
      <h2>${esc(t('paused'))}</h2>
      <button class="btn primary" data-act="resume" data-autofocus>${esc(t('resume'))}</button>
      <button class="btn" data-act="settings">${esc(t('settings'))}</button>
      <button class="btn ghost" data-act="quit">${esc(t('quit'))}</button>
    </div>`, { keys: (e) => { if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') this.app.resume(); } });
    this.on('[data-act="resume"]', () => this.app.resume());
    this.on('[data-act="settings"]', () => this.settings(this.app.profile, () => this.pause()));
    this.on('[data-act="quit"]', () => this.app.endRun());
  }

  death(game, { canAdRevive }) {
    this.mount(`<div class="panel">
      <h2 style="color:var(--danger)">${esc(t('youDied'))}</h2>
      <p class="sub">${esc(t('reviveQ'))} · ${formatTime(game.t)} · ${fmt(game.kills)} ${esc(t('kills'))}</p>
      ${game.revives > 0 ? `<button class="btn primary" data-act="free" data-autofocus>${esc(t('reviveFree', { n: game.revives }))}</button>` : ''}
      ${canAdRevive ? `<button class="btn ad" data-act="ad" ${game.revives > 0 ? '' : 'data-autofocus'}>${esc(t('reviveAd'))}</button>` : ''}
      <button class="btn ghost" data-act="give">${esc(t('giveUp'))}</button>
    </div>`);
    this.on('[data-act="free"]', () => this.app.revive('free'));
    this.on('[data-act="ad"]', () => this.app.revive('ad'));
    this.on('[data-act="give"]', () => this.app.endRun());
  }

  results(r, { canDouble, newBest }) {
    this.hideHud();
    this.mount(`<div class="panel">
      <h2 style="color:${r.won ? 'var(--gold)' : 'var(--cyan)'}">${esc(r.won ? t('victory') : t('gameOver'))}</h2>
      ${newBest ? `<span class="badge">${esc(t('newBest'))}</span>` : ''}
      <dl class="results">
        <div><dt>${esc(t('survived'))}</dt><dd>${formatTime(r.time)}</dd></div>
        <div><dt>${esc(t('kills'))}</dt><dd>${fmt(r.kills)}</dd></div>
        <div><dt>${esc(t('level'))}</dt><dd>${r.level}</dd></div>
        <div><dt>${esc(t('goldEarned'))}</dt><dd style="color:var(--gold)" id="gold-earned">${fmt(r.totalGold)}</dd></div>
      </dl>
      ${canDouble ? `<button class="btn ad" data-act="double">${esc(t('doubleGold'))}</button>` : ''}
      <div class="row">
        <button class="btn primary" data-act="retry" data-autofocus>${esc(t('retry'))}</button>
        <button class="btn" data-act="menu">${esc(t('menu'))}</button>
      </div>
      <button class="btn ghost" data-act="share">${esc(t('share'))}</button>
    </div>`, { keys: (e) => { if (e.key === 'Enter') this.app.startRun(); } });
    this.on('[data-act="double"]', (e, el) => this.app.doubleGold(el));
    this.on('[data-act="retry"]', () => this.app.startRun());
    this.on('[data-act="menu"]', () => this.app.toMenu());
    this.on('[data-act="share"]', () => this.app.share(r));
  }
}
