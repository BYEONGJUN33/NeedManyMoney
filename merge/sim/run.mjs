// 자동 플레이로 물리 안정성과 판 길이 확인: node sim/run.mjs [판 수] [봇: random|smart]
import { MergeGame, W, H, RADII } from '../src/logic.js';

const N = Number(process.argv[2] || 40);
const BOT = process.argv[3] || 'smart';
const DT = 1 / 60;

/** smart: 같은 단계 구슬 바로 위, 없으면 가장 낮은 곳에 떨어뜨린다 */
function chooseX(g, rnd) {
  if (BOT === 'random') return rnd() * W;
  const r = RADII[g.current];
  let best = null;
  for (let x = r; x <= W - r; x += 6) {
    // 이 x에서 처음 닿을 구슬
    let hitY = H;
    let hit = null;
    for (const o of g.orbs) {
      const dx = Math.abs(o.x - x);
      if (dx >= o.r + r) continue;
      const y = o.y - Math.sqrt((o.r + r) ** 2 - dx * dx);
      if (y < hitY) { hitY = y; hit = o; }
    }
    const s = hitY + (hit && hit.tier === g.current ? 400 : 0) - (hit && hit.tier < g.current ? 30 : 0);
    if (!best || s > best.s) best = { s, x };
  }
  return best.x + (rnd() - 0.5) * 4;
}

let seedRnd = 7;
const rnd = () => { seedRnd = (seedRnd * 16807) % 2147483647; return seedRnd / 2147483647; };
const res = [];
let maxSpeed = 0;
let escaped = 0;
let fast = 0;
let total = 0;
for (let n = 0; n < N; n += 1) {
  const g = new MergeGame({ seed: 500 + n });
  let frames = 0;
  while (!g.over && frames < 60 * 60 * 30) {
    if (g.ready) { g.aim(chooseX(g, rnd)); g.drop(); }
    g.update(DT);
    g.events.length = 0;
    frames += 1;
    for (const o of g.orbs) {
      if (o.x < o.r - 1 || o.x > W - o.r + 1 || o.y > H - o.r + 1 || o.y < -200) escaped += 1;
      if (o.age > 3) { const sp = Math.hypot(o.vx, o.vy); maxSpeed = Math.max(maxSpeed, sp); if (sp > 300) fast += 1; total += 1; }
    }
  }
  res.push({ drops: g.drops, score: g.score, best: g.best, minutes: frames / 3600, orbs: g.orbs.length });
}
const q = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) * p)];
for (const k of ['drops', 'score', 'best', 'minutes', 'orbs']) {
  const a = res.map((x) => x[k]);
  const f = (v) => (k === 'minutes' ? v.toFixed(1) : Math.round(v));
  console.log(`${k.padEnd(7)} 평균 ${f(a.reduce((s, x) => s + x, 0) / a.length)}  중앙 ${f(q(a, 0.5))}  하위10% ${f(q(a, 0.1))}  상위10% ${f(q(a, 0.9))}`);
}
console.log(`${BOT} 봇 ${N}판 · 통 밖으로 나간 프레임 ${escaped} · 3초 넘은 구슬 최대 속도 ${Math.round(maxSpeed)}, 300 넘는 비율 ${(fast / Math.max(1, total) * 100).toFixed(2)}%`);
