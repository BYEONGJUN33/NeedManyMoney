// 게임 한 판의 모든 규칙. DOM·Canvas를 쓰지 않는다 (렌더러가 상태를 읽어 그린다).
// 화면 효과는 this.fx 큐에 이벤트로 넣고, 소리는 this.sfx 큐에 넣는다.
import {
  RUN_LENGTH, MAX_ENEMIES, WEAPONS, EVOLVED, ENEMIES, BOSSES, hpScale, dmgScale, targetAlive, trickleRate, spawnTable,
  SWARMS, ELITE_EVERY, DROPS, HEART_HEAL, xpToNext, CHARACTERS,
} from './data.js';
import { computeStats, weaponStats, levelUpChoices, applyChoice, chestReward } from './upgrades.js';
import { SpatialGrid } from './grid.js';
import { TAU, clamp, dist2, len, makeRng } from './math.js';

const GEM_MERGE_AT = 260;

export class Game {
  /**
   * @param {object} o
   * @param {string} [o.character]
   * @param {object} [o.meta] 영구 강화 레벨
   * @param {number} [o.seed]
   * @param {boolean} [o.fx] 화면 효과 이벤트 기록 여부 (시뮬레이션에서는 끈다)
   */
  constructor({ character = 'nova', meta = {}, seed = 1, fx = true } = {}) {
    this.rng = makeRng(seed);
    this.character = character;
    this.meta = { ...meta };
    this.fxOn = fx;
    this.fx = [];
    this.sfx = [];
    this.t = 0;
    this.state = 'play'; // play | levelup | chest | dead | won
    this.viewR = 560; // 화면 대각선 절반 (렌더러가 갱신)
    this.nextId = 1;

    this.build = { weapons: [{ id: CHARACTERS[character].weapon, level: 1, evolved: null }], passives: {} };
    this.stats = computeStats({ character, passives: {}, meta });
    this.player = { x: 0, y: 0, vx: 0, vy: 0, hp: this.stats.maxHp, iframes: 0, fx: 1, fy: 0, r: this.stats.radius };

    this.level = 1;
    this.xp = 0;
    this.xpNext = xpToNext(1);
    this.pendingLevels = 0;
    this.choices = null;
    this.chest = null;
    this.rerolls = meta.reroll || 0;
    this.revives = meta.revival || 0;
    this.adRevivesUsed = 0;

    this.kills = 0;
    this.gold = 0;
    this.bossKills = 0;
    this.damageDealt = 0;

    this.enemies = [];
    this.shots = [];
    this.bullets = [];
    this.gems = [];
    this.items = [];
    this.rings = [];
    this.beams = [];
    this.grid = new SpatialGrid(72);
    this.near = [];

    this.spawnAcc = 0;
    this.nextElite = ELITE_EVERY;
    this.swarmIdx = 0;
    this.bossesSpawned = new Set();
    this.boss = null;
    this.weaponState = new Map();
  }

  /* ───────────── 외부 API ───────────── */

  /** @param {number} dt 초 @param {{x:number,y:number}} move 이동 입력 (-1~1) */
  update(dt, move = { x: 0, y: 0 }) {
    if (this.state !== 'play') return;
    dt = Math.min(dt, 0.05);
    this.t += dt;
    this.updatePlayer(dt, move);
    this.spawn(dt);
    this.grid.clear();
    for (const e of this.enemies) this.grid.insert(e);
    this.updateWeapons(dt);
    this.updateShots(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updatePickups(dt);
    this.cleanup();
    if (this.pendingLevels > 0 && this.state === 'play') this.openLevelUp();
  }

  openLevelUp() {
    this.state = 'levelup';
    this.choices = levelUpChoices(this.build, this.rng, 3);
    this.emitSfx('levelup');
  }

  reroll(free = true) {
    if (this.state !== 'levelup') return false;
    if (free) {
      if (this.rerolls <= 0) return false;
      this.rerolls -= 1;
    }
    this.choices = levelUpChoices(this.build, this.rng, 3);
    return true;
  }

  choose(choice) {
    if (this.state !== 'levelup' && this.state !== 'chest') return;
    this.applyReward(choice);
    if (this.state === 'levelup') this.pendingLevels -= 1;
    this.choices = null;
    this.chest = null;
    this.state = 'play';
    if (this.pendingLevels > 0) this.openLevelUp();
  }

  applyReward(choice) {
    if (choice.type === 'gold') this.gold += choice.amount;
    else if (choice.type === 'heal') this.heal(choice.amount);
    else {
      applyChoice(this.build, choice);
      this.refreshStats();
      if (choice.type === 'evolve') this.emitFx({ type: 'evolve', x: this.player.x, y: this.player.y });
    }
  }

  refreshStats() {
    const before = this.stats.maxHp;
    this.stats = computeStats({ character: this.character, passives: this.build.passives, meta: this.meta });
    if (this.stats.maxHp > before) this.player.hp += this.stats.maxHp - before;
    this.player.hp = Math.min(this.player.hp, this.stats.maxHp);
  }

  /** 부활: 체력 회복, 주변 적 밀어내기, 적 탄 제거 */
  revive() {
    if (this.state !== 'dead') return;
    const p = this.player;
    p.hp = this.stats.maxHp;
    p.iframes = 2.5;
    this.bullets.length = 0;
    for (const e of this.enemies) {
      const d = Math.sqrt(dist2(e.x, e.y, p.x, p.y)) || 1;
      if (d < 260 && !e.boss) {
        this.damage(e, 9999, { silent: true });
      } else if (d < 420) {
        e.kx += ((e.x - p.x) / d) * 500;
        e.ky += ((e.y - p.y) / d) * 500;
      }
    }
    this.emitFx({ type: 'nova', x: p.x, y: p.y, r: 260, color: '#ffffff' });
    this.state = 'play';
  }

  get canFreeRevive() { return this.revives > 0; }

  useFreeRevive() {
    if (this.revives <= 0) return false;
    this.revives -= 1;
    this.revive();
    return true;
  }

  summary() {
    return {
      time: Math.floor(this.t), kills: this.kills, level: this.level, gold: this.gold,
      won: this.state === 'won', bossKills: this.bossKills, character: this.character,
      weapons: this.build.weapons.map((w) => ({ ...w })), damage: Math.round(this.damageDealt),
    };
  }

  /* ───────────── 플레이어 ───────────── */

  updatePlayer(dt, move) {
    const p = this.player;
    const m = len(move.x, move.y);
    const mx = m > 1 ? move.x / m : move.x;
    const my = m > 1 ? move.y / m : move.y;
    p.vx = mx * this.stats.speed;
    p.vy = my * this.stats.speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (m > 0.1) {
      p.fx = mx / (m > 1 ? 1 : m);
      p.fy = my / (m > 1 ? 1 : m);
      const fl = len(p.fx, p.fy) || 1;
      p.fx /= fl;
      p.fy /= fl;
    }
    if (p.iframes > 0) p.iframes -= dt;
    if (this.stats.regen > 0) this.heal(this.stats.regen * dt, true);
  }

  heal(n, quiet = false) {
    const p = this.player;
    const before = p.hp;
    p.hp = Math.min(this.stats.maxHp, p.hp + n);
    if (!quiet && p.hp > before) this.emitFx({ type: 'heal', x: p.x, y: p.y, n: Math.round(p.hp - before) });
  }

  hurtPlayer(raw) {
    const p = this.player;
    if (p.iframes > 0 || this.state !== 'play') return;
    const dmg = Math.max(1, Math.round(raw * dmgScale(this.t) - this.stats.armor));
    p.hp -= dmg;
    p.iframes = 0.45;
    this.emitFx({ type: 'hurt', x: p.x, y: p.y, n: dmg });
    this.emitSfx('hurt');
    if (p.hp <= 0) {
      p.hp = 0;
      this.state = 'dead';
      this.emitSfx('death');
    }
  }

  /* ───────────── 출현 ───────────── */

  spawnPoint(spread = 0) {
    const a = this.rng() * TAU;
    const d = this.viewR + 40 + this.rng() * (60 + spread);
    return { x: this.player.x + Math.cos(a) * d, y: this.player.y + Math.sin(a) * d };
  }

  makeEnemy(type, x, y, { elite = false, boss = null } = {}) {
    const def = boss ? BOSSES[boss] : ENEMIES[type];
    const hpMul = boss ? 1 : hpScale(this.t) * (elite ? 10 : 1);
    const e = {
      id: this.nextId++, type: boss || type, boss: !!boss, elite, x, y, kx: 0, ky: 0,
      hp: def.hp * hpMul, maxHp: def.hp * hpMul, speed: def.speed * (elite ? 0.9 : 1),
      dmg: def.dmg * (elite ? 1.5 : 1), xp: def.xp * (elite ? 8 : 1), r: def.radius * (elite ? 1.6 : 1),
      mass: (def.mass || 1) * (elite ? 4 : 1) * (boss ? 30 : 1), color: def.color, shape: def.shape || 'boss',
      flash: 0, slowUntil: 0, slowAmt: 0, hitAt: {}, timer: 0, timer2: 0, state: 0, dead: false,
    };
    if (boss) e.final = !!def.final;
    this.enemies.push(e);
    return e;
  }

  spawn(dt) {
    // 보스
    for (const [id, b] of Object.entries(BOSSES)) {
      if (this.t >= b.at && !this.bossesSpawned.has(id)) {
        this.bossesSpawned.add(id);
        const pt = this.spawnPoint();
        this.boss = this.makeEnemy(null, pt.x, pt.y, { boss: id });
        this.emitFx({ type: 'boss', name: id });
        this.emitSfx('boss');
      }
    }
    if (this.enemies.length >= MAX_ENEMIES) return;
    // 큰 무리
    while (this.swarmIdx < SWARMS.length && this.t >= SWARMS[this.swarmIdx].at) {
      const s = SWARMS[this.swarmIdx++];
      const p = this.player;
      const gap = this.rng() * TAU;
      for (let i = 0; i < s.count && this.enemies.length < MAX_ENEMIES; i += 1) {
        if (s.form === 'ring') {
          // 원형이지만 90° 빈틈을 남겨 빠져나갈 길을 준다
          const a = gap + (i / s.count) * TAU * 0.75;
          const d = this.viewR + 30;
          this.makeEnemy(s.enemy, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
        } else {
          const a = this.rng() * TAU;
          const side = { x: Math.cos(a), y: Math.sin(a) };
          const off = (i - s.count / 2) * 26;
          this.makeEnemy(s.enemy, p.x + side.x * (this.viewR + 30) - side.y * off, p.y + side.y * (this.viewR + 30) + side.x * off);
        }
      }
      this.emitFx({ type: 'swarm' });
    }
    // 엘리트
    if (this.t >= this.nextElite) {
      this.nextElite += ELITE_EVERY;
      const table = spawnTable(this.t);
      const type = table[Math.floor(this.rng() * table.length)][0];
      const pt = this.spawnPoint();
      this.makeEnemy(type, pt.x, pt.y, { elite: true });
    }
    // 일반 출현: 꾸준한 출현 + 목표 수에 모자란 만큼 빠르게 보충
    const deficit = Math.max(0, targetAlive(this.t) - this.enemies.length);
    this.spawnAcc += (trickleRate(this.t) + deficit * 1.5) * dt;
    if (this.spawnAcc < 1) return;
    const alive = {};
    for (const e of this.enemies) alive[e.type] = (alive[e.type] || 0) + 1;
    const table = spawnTable(this.t).filter(([id]) => !ENEMIES[id].max || (alive[id] || 0) < ENEMIES[id].max);
    const total = table.reduce((s, [, w]) => s + w, 0);
    while (this.spawnAcc >= 1 && this.enemies.length < MAX_ENEMIES) {
      this.spawnAcc -= 1;
      let r = this.rng() * total;
      let type = table[0][0];
      for (const [id, w] of table) {
        r -= w;
        if (r <= 0) { type = id; break; }
      }
      const pt = this.spawnPoint(80);
      this.makeEnemy(type, pt.x, pt.y);
    }
    this.spawnAcc = Math.min(this.spawnAcc, 3);
  }

  /* ───────────── 피해 ───────────── */

  damage(e, amount, { knock = 0, fromX, fromY, color, silent = false, crit: forceCrit } = {}) {
    if (e.dead) return 0;
    let dmg = amount * this.stats.might;
    const crit = forceCrit ?? this.rng() < this.stats.crit;
    if (crit) dmg *= 2;
    e.hp -= dmg;
    e.flash = 0.08;
    this.damageDealt += Math.min(dmg, e.hp + dmg);
    if (knock && fromX !== undefined) {
      const dx = e.x - fromX;
      const dy = e.y - fromY;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      e.kx += (dx / d) * (knock / e.mass);
      e.ky += (dy / d) * (knock / e.mass);
    }
    if (!silent) this.emitFx({ type: 'dmg', x: e.x, y: e.y - e.r, n: Math.round(dmg), crit, color });
    if (e.hp <= 0) this.kill(e);
    return dmg;
  }

  kill(e) {
    if (e.dead) return;
    e.dead = true;
    this.kills += 1;
    this.emitFx({ type: 'die', x: e.x, y: e.y, color: e.color, r: e.r, boss: e.boss });
    this.emitSfx(e.boss ? 'bossdie' : 'die');
    if (e.xp > 0) this.dropGem(e.x, e.y, e.xp);
    const rng = this.rng;
    if (e.boss) {
      this.bossKills += 1;
      this.gold += BOSSES[e.type].gold;
      this.items.push({ kind: 'chest', x: e.x, y: e.y });
      if (e === this.boss) this.boss = null;
      if (e.final) {
        this.state = 'won';
        this.emitSfx('win');
      }
      return;
    }
    if (e.elite) {
      this.items.push({ kind: 'chest', x: e.x, y: e.y });
      this.items.push({ kind: 'coin', x: e.x + 14, y: e.y, value: 10 });
    } else {
      const roll = rng();
      if (roll < DROPS.bomb) this.items.push({ kind: 'bomb', x: e.x, y: e.y });
      else if (roll < DROPS.bomb + DROPS.magnet) this.items.push({ kind: 'magnet', x: e.x, y: e.y });
      else if (roll < DROPS.bomb + DROPS.magnet + DROPS.heart) this.items.push({ kind: 'heart', x: e.x, y: e.y });
      else if (rng() < DROPS.coin) this.items.push({ kind: 'coin', x: e.x, y: e.y, value: 1 });
    }
    const split = ENEMIES[e.type]?.splits;
    if (split) {
      for (let i = 0; i < split.count; i += 1) {
        const a = (i / split.count) * TAU;
        const c = this.makeEnemy(split.into, e.x + Math.cos(a) * 12, e.y + Math.sin(a) * 12);
        c.kx = Math.cos(a) * 160;
        c.ky = Math.sin(a) * 160;
        c.xp = 0.5;
      }
    }
  }

  dropGem(x, y, value) {
    if (this.gems.length >= GEM_MERGE_AT) {
      // 보석이 너무 많으면 가까운 보석에 합친다
      let best = null;
      let bd = Infinity;
      for (let i = 0; i < this.gems.length; i += 8) {
        const g = this.gems[i];
        const d = dist2(g.x, g.y, x, y);
        if (d < bd) { bd = d; best = g; }
      }
      if (best) { best.value += value; return; }
    }
    this.gems.push({ x, y, value, pull: false });
  }

  /* ───────────── 무기 ───────────── */

  nearestEnemy(x, y, maxD = 700, exclude) {
    let best = null;
    let bd = maxD * maxD;
    for (const e of this.enemies) {
      if (e.dead || (exclude && exclude.has(e.id))) continue;
      const d = dist2(e.x, e.y, x, y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  wstate(w) {
    let s = this.weaponState.get(w.id);
    if (!s) {
      s = { timer: 0.3, angle: 0, drones: [] };
      this.weaponState.set(w.id, s);
    }
    return s;
  }

  updateWeapons(dt) {
    const haste = this.stats.haste;
    const area = this.stats.area;
    const p = this.player;
    for (const w of this.build.weapons) {
      const st = weaponStats(w.id, w.level, w.evolved);
      const s = this.wstate(w);
      const color = w.evolved ? EVOLVED[w.evolved].color : WEAPONS[w.id].color;
      switch (w.id) {
        case 'blaster': {
          s.timer -= dt;
          if (s.timer <= 0) {
            const target = this.nearestEnemy(p.x, p.y, 640);
            if (!target) { s.timer = 0.1; break; }
            s.timer = st.cooldown * haste;
            const base = Math.atan2(target.y - p.y, target.x - p.x);
            for (let i = 0; i < st.count; i += 1) {
              const a = base + (i - (st.count - 1) / 2) * 0.13;
              this.shots.push({
                kind: 'bolt', x: p.x, y: p.y, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed,
                dmg: st.damage, pierce: st.pierce, life: 1.2, r: st.size * area, color, hits: [],
              });
            }
            this.emitSfx('shoot');
          }
          break;
        }
        case 'orbit': {
          s.angle += st.spin * dt;
          const radius = st.radius * area;
          const size = st.size * area;
          s.blades = [];
          for (let i = 0; i < st.count; i += 1) {
            const a = s.angle + (i / st.count) * TAU;
            const bx = p.x + Math.cos(a) * radius;
            const by = p.y + Math.sin(a) * radius;
            s.blades.push({ x: bx, y: by, a });
            for (const e of this.grid.query(bx, by, size + 30, this.near)) {
              if (e.dead) continue;
              const rr = size + e.r;
              if (dist2(e.x, e.y, bx, by) > rr * rr) continue;
              if ((e.hitAt.orbit || 0) > this.t) continue;
              e.hitAt.orbit = this.t + st.hitEvery;
              this.damage(e, st.damage, { knock: 120, fromX: p.x, fromY: p.y, color });
            }
          }
          break;
        }
        case 'aura': {
          s.timer -= dt;
          const radius = st.radius * area;
          s.radius = radius;
          if (st.pull) {
            for (const e of this.grid.query(p.x, p.y, radius * 1.8, this.near)) {
              if (e.boss) continue;
              const d = Math.sqrt(dist2(e.x, e.y, p.x, p.y)) || 1;
              if (d < radius * 1.8 && d > 20) {
                e.x -= ((e.x - p.x) / d) * st.pull * dt;
                e.y -= ((e.y - p.y) / d) * st.pull * dt;
              }
            }
          }
          if (s.timer <= 0) {
            s.timer = st.tick;
            for (const e of this.grid.query(p.x, p.y, radius + 30, this.near)) {
              const rr = radius + e.r;
              if (e.dead || dist2(e.x, e.y, p.x, p.y) > rr * rr) continue;
              e.slowUntil = this.t + st.tick + 0.1;
              e.slowAmt = st.slow;
              this.damage(e, st.damage, { color, knock: 30, fromX: p.x, fromY: p.y });
            }
          }
          break;
        }
        case 'arc': {
          s.timer -= dt;
          if (s.timer > 0) break;
          const first = this.nearestEnemy(p.x, p.y, st.range * area);
          if (!first) { s.timer = 0.15; break; }
          s.timer = st.cooldown * haste;
          const hit = new Set();
          const pts = [{ x: p.x, y: p.y }];
          let cur = first;
          for (let i = 0; i <= st.chains && cur; i += 1) {
            hit.add(cur.id);
            pts.push({ x: cur.x, y: cur.y });
            this.damage(cur, st.damage, { color });
            const from = cur;
            cur = null;
            let bd = (170 * area) ** 2;
            for (const e of this.grid.query(from.x, from.y, 170 * area, this.near)) {
              if (e.dead || hit.has(e.id)) continue;
              const d = dist2(e.x, e.y, from.x, from.y);
              if (d < bd) { bd = d; cur = e; }
            }
          }
          this.emitFx({ type: 'arc', pts, color });
          this.emitSfx('zap');
          break;
        }
        case 'missile': {
          s.timer -= dt;
          if (s.timer > 0) break;
          if (!this.enemies.length) { s.timer = 0.2; break; }
          s.timer = st.cooldown * haste;
          for (let i = 0; i < st.count; i += 1) {
            const a = (i / st.count) * TAU + this.rng() * 0.6;
            this.shots.push({
              kind: 'missile', x: p.x, y: p.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, speed: st.speed,
              dmg: st.damage, blast: st.blast * area, life: 3, r: 7, color, target: null, pierce: 0, hits: [],
            });
          }
          this.emitSfx('missile');
          break;
        }
        case 'beam': {
          s.timer -= dt;
          if (s.timer > 0) break;
          s.timer = st.cooldown * haste;
          const target = this.nearestEnemy(p.x, p.y, st.length * area);
          const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.fy, p.fx);
          for (let i = 0; i < st.beams; i += 1) {
            const a = base + (i / st.beams) * TAU;
            const length = st.length * area;
            const width = st.width * area;
            const ex = p.x + Math.cos(a) * length;
            const ey = p.y + Math.sin(a) * length;
            for (const e of this.enemies) {
              if (e.dead) continue;
              if (segDist2(e.x, e.y, p.x, p.y, ex, ey) <= (width / 2 + e.r) ** 2) this.damage(e, st.damage, { color, knock: 60, fromX: p.x, fromY: p.y });
            }
            this.beams.push({ x: p.x, y: p.y, ex, ey, width, life: st.duration, max: st.duration, color });
          }
          this.emitSfx('beam');
          break;
        }
        case 'wave': {
          s.timer -= dt;
          if (s.timer > 0) break;
          s.timer = st.cooldown * haste;
          this.rings.push({ x: p.x, y: p.y, r: 10, max: st.maxRadius * area, speed: st.speed, dmg: st.damage, push: st.push, hits: new Set(), color });
          this.emitSfx('wave');
          break;
        }
        case 'drone': {
          while (s.drones.length < st.drones) s.drones.push({ timer: s.drones.length * 0.2 });
          s.angle += 1.6 * dt;
          s.drones.forEach((d, i) => {
            const a = s.angle + (i / st.drones) * TAU;
            d.x = p.x + Math.cos(a) * 46;
            d.y = p.y + Math.sin(a) * 46;
            d.timer -= dt;
            if (d.timer > 0) return;
            const target = this.nearestEnemy(d.x, d.y, 420);
            if (!target) { d.timer = 0.15; return; }
            d.timer = st.cooldown * haste;
            const ang = Math.atan2(target.y - d.y, target.x - d.x);
            this.shots.push({
              kind: 'bolt', x: d.x, y: d.y, vx: Math.cos(ang) * st.speed, vy: Math.sin(ang) * st.speed,
              dmg: st.damage, pierce: st.pierce, life: 0.9, r: 4 * area, color, hits: [],
            });
          });
          break;
        }
        default:
      }
    }
    // 충격파 고리
    for (const ring of this.rings) {
      ring.r += ring.speed * dt;
      for (const e of this.grid.query(ring.x, ring.y, ring.r + 30, this.near)) {
        if (e.dead || ring.hits.has(e.id)) continue;
        const d = Math.sqrt(dist2(e.x, e.y, ring.x, ring.y));
        if (Math.abs(d - ring.r) <= e.r + 14) {
          ring.hits.add(e.id);
          this.damage(e, ring.dmg, { knock: ring.push, fromX: ring.x, fromY: ring.y, color: ring.color });
        }
      }
    }
    this.rings = this.rings.filter((r) => r.r < r.max);
    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter((b) => b.life > 0);
  }

  updateShots(dt) {
    for (const s of this.shots) {
      s.life -= dt;
      if (s.kind === 'missile') {
        if (!s.target || s.target.dead) s.target = this.nearestEnemy(s.x, s.y, 520);
        if (s.target) {
          const dx = s.target.x - s.x;
          const dy = s.target.y - s.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          s.vx += ((dx / d) * s.speed - s.vx) * Math.min(1, 4 * dt);
          s.vy += ((dy / d) * s.speed - s.vy) * Math.min(1, 4 * dt);
        }
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      for (const e of this.grid.query(s.x, s.y, s.r + 40, this.near)) {
        if (e.dead || s.hits.includes(e.id)) continue;
        const rr = s.r + e.r;
        if (dist2(e.x, e.y, s.x, s.y) > rr * rr) continue;
        if (s.kind === 'missile') {
          this.explode(s);
          s.life = 0;
          break;
        }
        s.hits.push(e.id);
        this.damage(e, s.dmg, { knock: 90, fromX: s.x - s.vx, fromY: s.y - s.vy, color: s.color });
        if (s.pierce-- <= 0) { s.life = 0; break; }
      }
      if (s.kind === 'missile' && s.life <= 0 && !s.exploded) this.explode(s);
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  explode(s) {
    if (s.exploded) return;
    s.exploded = true;
    for (const e of this.grid.query(s.x, s.y, s.blast + 30, this.near)) {
      const rr = s.blast + e.r;
      if (!e.dead && dist2(e.x, e.y, s.x, s.y) <= rr * rr) this.damage(e, s.dmg, { knock: 160, fromX: s.x, fromY: s.y, color: s.color });
    }
    this.emitFx({ type: 'boom', x: s.x, y: s.y, r: s.blast, color: s.color });
    this.emitSfx('boom');
  }

  /* ───────────── 적 ───────────── */

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.flash > 0) e.flash -= dt;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      let speed = e.speed * (e.slowUntil > this.t ? 1 - e.slowAmt : 1);
      let vx = (dx / d) * speed;
      let vy = (dy / d) * speed;

      if (e.boss) this.bossAct(e, dt, dx / d, dy / d, d);
      else {
        const def = ENEMIES[e.type];
        if (def.ranged) {
          if (d < def.ranged.range) { vx = 0; vy = 0; }
          e.timer += dt;
          if (e.timer >= def.ranged.every && d < def.ranged.range + 80) {
            e.timer = 0;
            const sp = def.ranged.speed;
            this.bullets.push({ x: e.x, y: e.y, vx: (dx / d) * sp, vy: (dy / d) * sp, r: 6, dmg: def.ranged.bullet * (e.elite ? 1.5 : 1), life: 4, color: e.color });
          }
        }
        if (def.charge) {
          if (e.state === 0 && d < def.charge.trigger) { e.state = 1; e.timer = 0.45; e.cx = dx / d; e.cy = dy / d; }
          if (e.state === 1) { // 예고
            vx = 0; vy = 0;
            e.timer -= dt;
            if (e.timer <= 0) { e.state = 2; e.timer = 0.7; }
          } else if (e.state === 2) { // 돌진
            vx = e.cx * def.charge.speed;
            vy = e.cy * def.charge.speed;
            e.timer -= dt;
            if (e.timer <= 0 || d < e.r + p.r + 6) {
              if (d < def.charge.blast + p.r) this.hurtPlayer(e.dmg);
              this.emitFx({ type: 'boom', x: e.x, y: e.y, r: def.charge.blast, color: e.color });
              this.emitSfx('boom');
              e.xp = Math.max(1, Math.floor(e.xp / 2));
              this.kill(e);
              continue;
            }
          }
        }
      }

      // 넉백
      e.x += (vx + e.kx) * dt;
      e.y += (vy + e.ky) * dt;
      const decay = Math.exp(-8 * dt);
      e.kx *= decay;
      e.ky *= decay;

      // 겹침 풀기
      if (!e.boss) {
        for (const o of this.grid.query(e.x, e.y, e.r * 2, this.near)) {
          if (o === e || o.dead) continue;
          const ox = e.x - o.x;
          const oy = e.y - o.y;
          const rr = e.r + o.r;
          const dd = ox * ox + oy * oy;
          if (dd > 0 && dd < rr * rr) {
            const dist = Math.sqrt(dd);
            const push = ((rr - dist) / dist) * 0.5 * (o.mass / (o.mass + e.mass));
            e.x += ox * push;
            e.y += oy * push;
          }
        }
      }

      // 접촉 피해
      const rr = e.r + p.r;
      if (dist2(e.x, e.y, p.x, p.y) < rr * rr) this.hurtPlayer(e.dmg);

      // 너무 멀어진 일반 적은 반대편으로 다시 데려온다
      if (!e.boss && d > this.viewR * 2.2) {
        const pt = this.spawnPoint();
        e.x = pt.x;
        e.y = pt.y;
      }
    }
  }

  bossAct(e, dt, nx, ny, d) {
    e.timer += dt;
    e.timer2 += dt;
    const ring = (n, speed, offset = 0, dmg = 12) => {
      for (let i = 0; i < n; i += 1) {
        const a = offset + (i / n) * TAU;
        this.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 8, dmg, life: 5, color: e.color });
      }
      this.emitSfx('bossfire');
    };
    const summon = (type, n) => {
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * TAU;
        this.makeEnemy(type, e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80);
      }
    };
    if (e.type === 'warden') {
      if (e.timer >= 3) { e.timer = 0; ring(16, 170, this.t); }
      if (e.timer2 >= 7) { e.timer2 = 0; summon('drone', 8); }
    } else {
      const enraged = e.hp < e.maxHp * 0.5;
      if (e.timer >= (enraged ? 1.8 : 2.4)) { e.timer = 0; ring(enraged ? 28 : 20, 190, this.t * 0.7, 14); }
      if (e.timer2 >= 6) {
        e.timer2 = 0;
        summon(enraged ? 'bomber' : 'dart', enraged ? 6 : 10);
        e.kx += nx * 900; // 돌진
        e.ky += ny * 900;
        this.emitFx({ type: 'warn', x: e.x, y: e.y });
      }
      if (enraged && Math.floor(this.t * 8) % 3 === 0 && e.state !== Math.floor(this.t * 8)) {
        e.state = Math.floor(this.t * 8);
        const a = this.t * 2.2;
        this.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, r: 7, dmg: 12, life: 5, color: '#ff8adf' });
      }
    }
  }

  updateBullets(dt) {
    const p = this.player;
    for (const b of this.bullets) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const rr = b.r + p.r * 0.8;
      if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
        this.hurtPlayer(b.dmg);
        b.life = 0;
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
  }

  /* ───────────── 줍기 ───────────── */

  updatePickups(dt) {
    const p = this.player;
    const mag = this.stats.magnet;
    const mag2 = mag * mag;
    for (const g of this.gems) {
      const d2 = dist2(g.x, g.y, p.x, p.y);
      if (!g.pull && d2 < mag2) g.pull = true;
      if (g.pull) {
        const d = Math.sqrt(d2) || 1;
        const sp = 380 + (g.speedUp = (g.speedUp || 0) + dt * 500);
        g.x += ((p.x - g.x) / d) * sp * dt;
        g.y += ((p.y - g.y) / d) * sp * dt;
        if (d < p.r + 8) {
          g.taken = true;
          this.gainXp(g.value);
        }
      }
    }
    this.gems = this.gems.filter((g) => !g.taken);

    for (const it of this.items) {
      const d2 = dist2(it.x, it.y, p.x, p.y);
      const reach = it.kind === 'chest' ? p.r + 18 : p.r + 12;
      if (it.kind !== 'chest' && d2 < mag2 * 0.6) {
        const d = Math.sqrt(d2) || 1;
        it.x += ((p.x - it.x) / d) * 420 * dt;
        it.y += ((p.y - it.y) / d) * 420 * dt;
      }
      if (d2 > reach * reach) continue;
      it.taken = true;
      if (it.kind === 'coin') { this.gold += Math.round(it.value * this.stats.greed); this.emitSfx('coin'); }
      else if (it.kind === 'heart') { this.heal(HEART_HEAL); this.emitSfx('heal'); }
      else if (it.kind === 'magnet') { for (const g of this.gems) g.pull = true; this.emitSfx('magnet'); }
      else if (it.kind === 'bomb') {
        for (const e of this.enemies) {
          if (!e.dead && !e.boss && dist2(e.x, e.y, p.x, p.y) < (this.viewR * 0.9) ** 2) this.damage(e, 9999, { silent: true });
        }
        this.emitFx({ type: 'nova', x: p.x, y: p.y, r: this.viewR, color: '#ff8a3d' });
        this.emitSfx('boom');
      } else if (it.kind === 'chest') {
        this.chest = chestReward(this.build, this.rng);
        this.state = 'chest';
        this.emitSfx('chest');
      }
    }
    this.items = this.items.filter((i) => !i.taken);
  }

  gainXp(v) {
    this.xp += v * this.stats.growth;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level += 1;
      this.xpNext = xpToNext(this.level);
      this.pendingLevels += 1;
    }
    this.emitSfx('gem');
  }

  cleanup() {
    if (this.enemies.some((e) => e.dead)) this.enemies = this.enemies.filter((e) => !e.dead);
  }

  emitFx(ev) { if (this.fxOn) this.fx.push(ev); }
  emitSfx(name) { if (this.fxOn) this.sfx.push(name); }
}

/** 점 (px,py)와 선분 (ax,ay)-(bx,by) 사이 거리의 제곱 */
export function segDist2(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const t = clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1), 0, 1);
  return dist2(px, py, ax + vx * t, ay + vy * t);
}

export { RUN_LENGTH };
