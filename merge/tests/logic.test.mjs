import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MergeGame, W, H, RADII, MAX_TIER, MERGE_SCORE, NOVA_BONUS, DEAD_Y, COOLDOWN, dailySeed } from '../src/logic.js';
import { normalize, recordGame, defaultProfile } from '../src/profile.js';
import { STR } from '../src/i18n.js';

const run = (g, sec) => { for (let i = 0; i < sec * 60; i += 1) g.update(1 / 60); };

test('같은 단계 두 개가 닿으면 한 단계 큰 구슬이 되고 점수를 준다', () => {
  const g = new MergeGame({ seed: 1 });
  g.spawn(2, W / 2 - RADII[2], H - RADII[2]);
  g.spawn(2, W / 2 + RADII[2] - 1, H - RADII[2]);
  run(g, 0.5);
  assert.equal(g.orbs.length, 1);
  assert.equal(g.orbs[0].tier, 3);
  assert.equal(g.score, MERGE_SCORE[3]);
  assert.equal(g.best, 3);
  assert.ok(g.events.some((e) => e.type === 'merge' && e.tier === 3));
});

test('가장 큰 구슬 두 개는 합쳐져 사라지고 큰 보너스', () => {
  const g = new MergeGame({ seed: 1 });
  const r = RADII[MAX_TIER];
  g.spawn(MAX_TIER, r, H - r);
  g.spawn(MAX_TIER, r * 3 - 2, H - r);
  run(g, 0.3);
  assert.equal(g.orbs.length, 0);
  assert.equal(g.score, NOVA_BONUS);
  assert.ok(g.events.some((e) => e.type === 'nova'));
});

test('다른 단계는 합쳐지지 않고 쌓인다', () => {
  const g = new MergeGame({ seed: 1 });
  g.spawn(1, W / 2, H - RADII[1]);
  g.spawn(3, W / 2, H - RADII[1] * 2 - RADII[3] - 20);
  run(g, 2);
  assert.equal(g.orbs.length, 2);
  const [a, b] = g.orbs;
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r - 1.5, 'no deep overlap');
});

test('떨어뜨린 뒤 잠깐은 다시 떨어뜨릴 수 없고, 처음 몇 개는 작은 구슬', () => {
  const g = new MergeGame({ seed: 3 });
  assert.equal(g.drop(), true);
  assert.equal(g.drop(), false);
  run(g, COOLDOWN + 0.05);
  assert.equal(g.drop(), true);
  const g2 = new MergeGame({ seed: 9 });
  for (let i = 0; i < 4; i += 1) { assert.ok(g2.current <= 2); g2.drop(); run(g2, COOLDOWN + 0.05); }
  for (let i = 0; i < 60; i += 1) { assert.ok(g2.current <= 4 && g2.next <= 4); g2.drop(); run(g2, COOLDOWN + 0.05); }
});

test('물리: 많이 쌓아도 통 밖으로 나가지 않고 멈추면 잠잠해진다', () => {
  const g = new MergeGame({ seed: 5 });
  for (let i = 0; i < 26 && !g.over; i += 1) {
    g.aim(((i * 131) % 320) + 20);
    g.drop();
    run(g, 0.55);
  }
  run(g, 4);
  let maxSpeed = 0;
  for (const o of g.orbs) {
    assert.ok(o.x >= o.r - 0.5 && o.x <= W - o.r + 0.5 && o.y <= H - o.r + 0.5, 'inside jar');
    maxSpeed = Math.max(maxSpeed, Math.hypot(o.vx, o.vy));
  }
  assert.ok(maxSpeed < 25, `settled (max speed ${maxSpeed.toFixed(1)})`);
  for (let i = 0; i < g.orbs.length; i += 1) {
    for (let j = i + 1; j < g.orbs.length; j += 1) {
      const a = g.orbs[i];
      const b = g.orbs[j];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r - 3, 'no deep overlap');
    }
  }
});

test('선 위로 오래 쌓이면 끝, 이어하기는 위쪽 절반을 비운다', () => {
  const g = new MergeGame({ seed: 2 });
  // 서로 다른 단계로 기둥을 쌓아 선을 넘긴다
  let y = H;
  let tier = 0;
  while (y > DEAD_Y - 40) {
    const r = RADII[tier % 6];
    g.spawn(tier % 6, W / 2 + ((tier % 2) ? 1 : -1), y - r).age = 5;
    y -= r * 2;
    tier += 1;
  }
  // 기둥이 무너지지 않게 벽처럼 고정
  for (let i = 0; i < 300 && !g.over; i += 1) {
    for (const o of g.orbs) { o.vx = 0; o.vy = 0; o.x = W / 2; }
    g.checkDanger(1 / 60);
  }
  assert.equal(g.over, true);
  assert.ok(g.events.some((e) => e.type === 'over'));
  const before = g.orbs.length;
  g.revive();
  assert.equal(g.over, false);
  assert.equal(g.continues, 1);
  assert.ok(g.orbs.length < before);
  assert.ok(g.orbs.every((o) => o.y >= H * 0.5));
});

test('작은 구슬 정리는 1~3단계만 없앤다', () => {
  const g = new MergeGame({ seed: 4 });
  [0, 1, 2, 3, 5].forEach((tier, i) => g.spawn(tier, 30 + i * 70, H - 120));
  assert.equal(g.popSmall(), 3);
  assert.deepEqual(g.orbs.map((o) => o.tier), [3, 5]);
});

test('일일 도전은 같은 날 같은 구슬 순서', () => {
  const seq = (seed) => {
    const g = new MergeGame({ seed });
    const out = [];
    for (let i = 0; i < 20; i += 1) { out.push(g.current); g.drop(); g.cooldown = 0; }
    return out.join();
  };
  assert.equal(seq(dailySeed('2026-10-22')), seq(dailySeed('2026-10-22')));
  assert.notEqual(seq(dailySeed('2026-10-22')), seq(dailySeed('2026-10-23')));
});

test('저장·복원과 기록', () => {
  const g = new MergeGame({ seed: 8 });
  for (let i = 0; i < 10; i += 1) { g.aim(40 + i * 30); g.drop(); run(g, 0.5); }
  const snap = JSON.parse(JSON.stringify(g.snapshot()));
  const r = MergeGame.restore(snap, 1);
  assert.equal(r.orbs.length, g.orbs.length);
  assert.equal(r.score, g.score);
  assert.equal(r.current, g.current);
  assert.equal(r.next, g.next);
  // 망가진 저장 데이터도 안전하게 읽는다
  const bad = MergeGame.restore({ orbs: [{ tier: 99, x: 'x', y: -5 }], current: 7 }, 1);
  assert.equal(bad.orbs[0].tier, MAX_TIER);
  assert.ok(bad.current <= 4);
  const p = normalize({ best: '120', bestTier: 40, saved: snap, settings: { sfx: 3 } });
  assert.equal(p.best, 120);
  assert.equal(p.bestTier, MAX_TIER);
  assert.equal(p.settings.sfx, 1);
  assert.equal(p.saved.score, g.score);
  const q = defaultProfile();
  assert.equal(recordGame(q, { score: 50, tier: 4, daily: false, day: '2026-10-22' }), true);
  assert.equal(recordGame(q, { score: 70, tier: 5, daily: false, day: '2026-10-22', count: false }), true);
  assert.equal(q.games, 1);
  assert.equal(q.bestTier, 5);
  assert.equal(recordGame(q, { score: 30, tier: 2, daily: true, day: '2026-10-22' }), true);
  assert.equal(q.daily.best, 30);
});

test('번역 키가 두 언어에 모두 있다', () => {
  assert.deepEqual(Object.keys(STR.ko).sort(), Object.keys(STR.en).sort());
});
