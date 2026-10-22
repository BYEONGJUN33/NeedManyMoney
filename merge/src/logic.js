// NOVA MERGE 규칙과 물리: 통 안에 구슬을 떨어뜨리고, 같은 크기 두 개가 닿으면 한 단계 큰 구슬이 된다. DOM 없음.
import { makeRng } from './math.js';

export const W = 360; // 통 안쪽 너비 (월드 단위)
export const H = 540; // 통 안쪽 높이
export const DEAD_Y = 74; // 이 선 위로 구슬이 오래 머물면 끝
export const DROP_Y = 34; // 들고 있는 구슬의 높이
export const RADII = [13, 18, 24, 31, 38, 46, 55, 65, 76, 88, 101];
export const MAX_TIER = RADII.length - 1;
export const MERGE_SCORE = [0, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66]; // 이 단계가 만들어질 때 점수
export const NOVA_BONUS = 200; // 가장 큰 구슬 두 개가 합쳐져 사라질 때
export const DROP_WEIGHTS = [30, 26, 20, 14, 10]; // 떨어뜨릴 구슬 단계 비중
export const COOLDOWN = 0.45; // 떨어뜨린 뒤 다음 구슬이 나올 때까지
export const OVER_TIME = 2.4; // 선 위에 머물러도 되는 시간

const G = 1500; // 중력
const SUB = 4; // 프레임당 하위 단계
const VEL_ITER = 4; // 접촉 속도 반복
const POS_ITER = 2; // 겹침 해소 반복
const BOUNCE = 0.12;
const FRICTION = 0.25;
const SLOP = 0.4; // 이만큼의 겹침은 그대로 둔다 (떨림 방지)
const MAX_SPEED = 1400;
const GROW = 0.14; // 합쳐진 구슬이 커지는 시간

export class MergeGame {
  /** @param {{seed?: number, daily?: boolean}} o */
  constructor({ seed = 1, daily = false } = {}) {
    this.rng = makeRng(seed);
    this.daily = daily;
    this.orbs = [];
    this.nextId = 1;
    this.score = 0;
    this.best = 0; // 이번 판 최고 단계
    this.merges = 0;
    this.drops = 0;
    this.t = 0;
    this.over = false;
    this.continues = 0;
    this.danger = 0; // 선 위에 머문 시간
    this.cooldown = 0;
    this.aimX = W / 2;
    this.events = [];
    this.current = this.pickTier();
    this.next = this.pickTier();
  }

  pickTier() {
    // 처음 몇 개는 작은 구슬만 (첫 판 적응)
    const n = this.drops < 4 ? 3 : DROP_WEIGHTS.length;
    const total = DROP_WEIGHTS.slice(0, n).reduce((s, w) => s + w, 0);
    let r = this.rng() * total;
    for (let i = 0; i < n; i += 1) {
      r -= DROP_WEIGHTS[i];
      if (r <= 0) return i;
    }
    return 0;
  }

  get ready() { return !this.over && this.cooldown <= 0; }

  /** 조준 위치를 통 안으로 제한 */
  clampAim(x, tier = this.current) {
    const r = RADII[tier];
    return Math.min(W - r, Math.max(r, x));
  }

  aim(x) { this.aimX = this.clampAim(x); }

  /** 들고 있는 구슬을 떨어뜨린다. 성공하면 true */
  drop() {
    if (!this.ready) return false;
    const tier = this.current;
    const x = this.clampAim(this.aimX, tier);
    this.spawn(tier, x, DROP_Y, 0, 60);
    this.drops += 1;
    this.current = this.next;
    this.next = this.pickTier();
    this.cooldown = COOLDOWN;
    this.events.push({ type: 'drop', tier, x });
    return true;
  }

  spawn(tier, x, y, vx = 0, vy = 0, grow = false) {
    const r = RADII[tier];
    const o = { id: this.nextId++, tier, x, y, vx, vy, r: grow ? r * 0.6 : r, age: 0, dead: false };
    this.orbs.push(o);
    return o;
  }

  update(dt) {
    if (this.over) return;
    dt = Math.min(dt, 1 / 30);
    this.t += dt;
    this.cooldown -= dt;
    const h = dt / SUB;
    for (let s = 0; s < SUB; s += 1) this.step(h);
    this.checkDanger(dt);
  }

  step(h) {
    const orbs = this.orbs;
    for (const o of orbs) {
      o.age += h;
      const target = RADII[o.tier];
      if (o.r < target) o.r = Math.min(target, o.r + (target * 0.4 * h) / GROW);
      o.vy += G * h;
    }
    // 접촉 찾기 (같은 단계면 합치기 예약)
    const contacts = [];
    const merges = [];
    for (let i = 0; i < orbs.length; i += 1) {
      const a = orbs[i];
      for (let j = i + 1; j < orbs.length; j += 1) {
        const b = orbs[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= (min + 0.5) * (min + 0.5)) continue;
        const d = Math.sqrt(d2) || 0.001;
        if (a.tier === b.tier && d < min && !a.merging && !b.merging) {
          a.merging = true;
          b.merging = true;
          merges.push([a, b]);
          continue;
        }
        contacts.push({ a, b, nx: dx / d, ny: dy / d, ia: 1 / (a.r * a.r), ib: 1 / (b.r * b.r) });
      }
    }
    // 속도: 서로 파고드는 속도를 없애고 약간 튕기며, 마찰로 미끄러짐을 줄인다
    for (let it = 0; it < VEL_ITER; it += 1) {
      for (const c of contacts) {
        const { a, b, nx, ny, ia, ib } = c;
        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const vn = rvx * nx + rvy * ny;
        if (vn >= 0) continue;
        const j = (-(1 + BOUNCE) * vn) / (ia + ib);
        a.vx -= j * ia * nx; a.vy -= j * ia * ny;
        b.vx += j * ib * nx; b.vy += j * ib * ny;
        const vt = rvx * -ny + rvy * nx;
        const jt = Math.max(-FRICTION * j, Math.min(FRICTION * j, -vt / (ia + ib)));
        a.vx -= jt * ia * -ny; a.vy -= jt * ia * nx;
        b.vx += jt * ib * -ny; b.vy += jt * ib * nx;
      }
      for (const o of orbs) this.wallVelocity(o);
    }
    for (const o of orbs) {
      o.vx *= 0.9985;
      o.vy *= 0.9985;
      const sp = Math.hypot(o.vx, o.vy);
      if (sp > MAX_SPEED) { o.vx *= MAX_SPEED / sp; o.vy *= MAX_SPEED / sp; }
      o.x += o.vx * h;
      o.y += o.vy * h;
    }
    // 위치: 남은 겹침을 조금씩 밀어낸다 (속도에는 반영하지 않아 떨리지 않는다)
    for (let it = 0; it < POS_ITER; it += 1) {
      for (let i = 0; i < orbs.length; i += 1) {
        const a = orbs[i];
        for (let j = i + 1; j < orbs.length; j += 1) {
          const b = orbs[j];
          if (a.merging && b.merging && a.tier === b.tier) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const min = a.r + b.r;
          const d2 = dx * dx + dy * dy;
          if (d2 >= min * min) continue;
          const d = Math.sqrt(d2) || 0.001;
          const corr = Math.max(0, min - d - SLOP) * 0.6;
          if (!corr) continue;
          const ma = a.r * a.r;
          const mb = b.r * b.r;
          const nx = dx / d;
          const ny = dy / d;
          a.x -= nx * corr * (mb / (ma + mb)); a.y -= ny * corr * (mb / (ma + mb));
          b.x += nx * corr * (ma / (ma + mb)); b.y += ny * corr * (ma / (ma + mb));
        }
      }
      for (const o of orbs) this.wallPosition(o);
    }
    for (const [a, b] of merges) this.merge(a, b);
    if (merges.length) this.orbs = this.orbs.filter((o) => !o.dead);
    for (const o of this.orbs) o.merging = false;
  }

  wallVelocity(o) {
    if (o.x - o.r <= 0.5 && o.vx < 0) o.vx = -o.vx * BOUNCE;
    if (o.x + o.r >= W - 0.5 && o.vx > 0) o.vx = -o.vx * BOUNCE;
    if (o.y + o.r >= H - 0.5 && o.vy > 0) {
      o.vy = -o.vy * BOUNCE;
      o.vx *= 0.985; // 바닥 마찰
    }
  }

  wallPosition(o) {
    if (o.x < o.r) o.x = o.r;
    if (o.x > W - o.r) o.x = W - o.r;
    if (o.y > H - o.r) o.y = H - o.r;
  }

  merge(a, b) {
    a.dead = true;
    b.dead = true;
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    this.merges += 1;
    if (a.tier === MAX_TIER) {
      this.score += NOVA_BONUS;
      this.events.push({ type: 'nova', x, y, tier: a.tier, gained: NOVA_BONUS });
      return;
    }
    const tier = a.tier + 1;
    const o = this.spawn(tier, x, y, (a.vx + b.vx) / 2, Math.min(0, (a.vy + b.vy) / 2) - 40, true);
    o.age = 0.5; // 합쳐진 구슬은 바로 위험 판정에 들어가지 않게 조금 늦춘다
    const gained = MERGE_SCORE[tier];
    this.score += gained;
    const newBest = tier > this.best;
    this.best = Math.max(this.best, tier);
    this.events.push({ type: 'merge', x, y, tier, gained, newBest });
  }

  /** 오래 머문 구슬이 선 위로 넘쳐 있으면 위험 시간이 쌓이고, 넘으면 끝 */
  checkDanger(dt) {
    const risky = this.orbs.some((o) => o.age > 1.2 && o.y - o.r < DEAD_Y);
    if (risky) {
      this.danger += dt;
      if (this.danger >= OVER_TIME) {
        this.over = true;
        this.events.push({ type: 'over' });
      }
    } else {
      this.danger = Math.max(0, this.danger - dt * 2);
    }
  }

  /** 이어하기 (광고 보상): 통 위쪽 절반의 구슬을 없앤다 */
  revive() {
    const removed = this.orbs.filter((o) => o.y < H * 0.5);
    for (const o of removed) o.dead = true;
    this.orbs = this.orbs.filter((o) => !o.dead);
    this.continues += 1;
    this.over = false;
    this.danger = 0;
    this.cooldown = 0.3;
    this.events.push({ type: 'clear', orbs: removed.map(({ x, y, tier }) => ({ x, y, tier })) });
  }

  /** 작은 구슬 정리 (광고 보상): 가장 작은 세 단계를 없앤다 */
  popSmall() {
    const removed = this.orbs.filter((o) => o.tier <= 2);
    for (const o of removed) o.dead = true;
    this.orbs = this.orbs.filter((o) => !o.dead);
    this.danger = 0;
    this.events.push({ type: 'clear', orbs: removed.map(({ x, y, tier }) => ({ x, y, tier })) });
    return removed.length;
  }

  /** 가장 높이 쌓인 구슬의 윗면 (위험도 표시용) */
  topY() {
    let top = H;
    for (const o of this.orbs) if (o.age > 0.6) top = Math.min(top, o.y - o.r);
    return top;
  }

  snapshot() {
    return {
      orbs: this.orbs.map((o) => ({ tier: o.tier, x: Math.round(o.x * 10) / 10, y: Math.round(o.y * 10) / 10 })),
      score: this.score, best: this.best, merges: this.merges, drops: this.drops,
      current: this.current, next: this.next, continues: this.continues,
    };
  }

  static restore(snap, seed = 1) {
    const g = new MergeGame({ seed });
    const tier = (v) => Math.max(0, Math.min(MAX_TIER, v | 0));
    for (const o of snap.orbs || []) {
      const t = tier(o.tier);
      const r = RADII[t];
      const s = g.spawn(t, Math.min(W - r, Math.max(r, +o.x || W / 2)), Math.min(H - r, Math.max(r, +o.y || H / 2)));
      s.age = 2;
    }
    g.score = snap.score | 0;
    g.best = tier(snap.best);
    g.merges = snap.merges | 0;
    g.drops = snap.drops | 0;
    g.current = Math.min(DROP_WEIGHTS.length - 1, tier(snap.current));
    g.next = Math.min(DROP_WEIGHTS.length - 1, tier(snap.next));
    g.continues = snap.continues | 0;
    g.events.length = 0;
    return g;
  }
}

/** 오늘 날짜로 정해지는 일일 도전 시드 (모두 같은 구슬 순서) */
export function dailySeed(day) {
  let h = 2166136261;
  for (const ch of `nova-merge-${day}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
