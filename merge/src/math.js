// 수학·난수 유틸. 게임 로직은 DOM 없이 Node에서도 돌아가야 하므로 순수 함수만 둔다.
export const TAU = Math.PI * 2;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
export const len = (x, y) => Math.sqrt(x * x + y * y);

/** 시드 고정 난수 (mulberry32). 시뮬레이션 재현을 위해 Math.random 대신 쓴다. */
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.chance = (p) => next() < p;
  return next;
}

/** 가중치 표본 추출 (중복 없이 n개) */
export function weightedSample(items, weightOf, n, rng) {
  const pool = items.map((it) => ({ it, w: Math.max(0, weightOf(it)) })).filter((x) => x.w > 0);
  const out = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = rng() * total;
    let i = 0;
    for (; i < pool.length - 1; i += 1) {
      r -= pool[i].w;
      if (r <= 0) break;
    }
    out.push(pool[i].it);
    pool.splice(i, 1);
  }
  return out;
}

export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
