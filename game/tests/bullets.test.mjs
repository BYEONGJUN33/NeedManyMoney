import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { fire, moveBullet, MAX_BULLETS } from '../src/patterns.js';
import { BURST, BOSS_PHASES, HITBOX } from '../src/data.js';

const quiet = () => {
  const g = new Game({ seed: 3, fx: false });
  g.spawn = () => {}; // 출현 없이 규칙만 본다
  return g;
};

test('패턴: 링·부채꼴·나선·벽의 탄 수와 빈틈', () => {
  const g = quiet();
  const src = { x: 300, y: 0, color: '#fff' };
  fire(g, src, { pattern: 'ring', n: 12, speed: 100 });
  assert.equal(g.bullets.length, 12);
  g.bullets.length = 0;
  fire(g, src, { pattern: 'fan', n: 5, spread: 0.8, speed: 100 });
  // 가운데 탄은 플레이어(원점)를 향한다
  const mid = g.bullets[2];
  assert.ok(mid.vx < -99 && Math.abs(mid.vy) < 1e-6);
  g.bullets.length = 0;
  const st = {};
  fire(g, src, { pattern: 'spiral', arms: 3, step: 0.3, speed: 100 }, st);
  const a0 = st.angle;
  fire(g, src, { pattern: 'spiral', arms: 3, step: 0.3, speed: 100 }, st);
  assert.ok(Math.abs(st.angle - a0 - 0.3) < 1e-9);
  assert.equal(g.bullets.length, 6);
  g.bullets.length = 0;
  fire(g, src, { pattern: 'wall', n: 20, speed: 100 });
  assert.equal(g.bullets.length, 17, '벽에는 3칸짜리 빈틈이 있다');
  assert.ok(g.bullets.every((b) => b.delay > 0));
  g.bullets.length = 0;
  for (let i = 0; i < 60; i += 1) fire(g, src, { pattern: 'ring', n: 12, speed: 100 });
  assert.equal(g.bullets.length, MAX_BULLETS);
});

test('탄 이동: 회전 탄은 휘고, 가속 탄은 최대 속도에서 멈춘다', () => {
  const b = { x: 0, y: 0, vx: 100, vy: 0, turn: Math.PI / 2, accel: 0, delay: 0, life: 5 };
  for (let i = 0; i < 30; i += 1) moveBullet(b, 1 / 30);
  assert.ok(Math.abs(b.vx) < 1 && b.vy > 99, '1초에 90° 돈다');
  const c = { x: 0, y: 0, vx: 30, vy: 0, turn: 0, accel: 200, maxSpeed: 250, delay: 0, life: 5 };
  for (let i = 0; i < 90; i += 1) moveBullet(c, 1 / 30);
  assert.ok(Math.abs(Math.hypot(c.vx, c.vy) - 250) < 1e-6);
});

test('예고 중인 탄은 맞지 않고, 스친 탄은 한 번만 센다', () => {
  const g = quiet();
  const hp = g.player.hp;
  g.bullets.push({ x: 0, y: 0, vx: 0, vy: 0, r: 7, dmg: 10, life: 3, delay: 0.5, kind: 'orb', turn: 0, accel: 0, grazed: false });
  g.update(1 / 30);
  assert.equal(g.player.hp, hp, '예고 중');
  g.bullets.length = 0;
  // 판정(7×0.8 + 12×HITBOX ≈ 10.6)보다 바깥, 스침 범위 안을 지나간다
  const off = 7 * 0.8 + g.player.r * HITBOX + 8;
  g.bullets.push({ x: -200, y: off, vx: 600, vy: 0, r: 7, dmg: 10, life: 3, delay: 0, kind: 'orb', turn: 0, accel: 0, grazed: false });
  g.burst = 0;
  for (let i = 0; i < 30; i += 1) g.update(1 / 60);
  assert.equal(g.player.hp, hp);
  assert.equal(g.graze, 1);
  assert.equal(g.burst, BURST.graze);
});

test('노바 버스트: 가득 찼을 때만, 탄을 보석으로 바꾸고 주변 일반 적을 지운다', () => {
  const g = quiet();
  g.burst = 50;
  assert.equal(g.useBurst(), false);
  g.burst = BURST.max;
  const near = g.makeEnemy('drone', 100, 0);
  const far = g.makeEnemy('drone', 900, 0);
  const boss = g.makeEnemy(null, 150, 0, { boss: 'warden' });
  for (let i = 0; i < 10; i += 1) g.bullets.push({ x: 50 + i * 10, y: 40, vx: 0, vy: 0, r: 7, dmg: 10, life: 3, delay: 0, kind: 'orb', turn: 0, accel: 0 });
  const gems = g.gems.length;
  assert.equal(g.useBurst(), true);
  assert.equal(g.bullets.length, 0);
  assert.ok(g.gems.length >= gems + 10);
  assert.ok(near.dead && !far.dead && !boss.dead);
  assert.ok(boss.hp < boss.maxHp);
  assert.equal(g.burst, 0);
  assert.ok(g.player.iframes >= BURST.iframes - 1e-9);
  assert.equal(g.bursts, 1);
});

test('보스 단계: 체력 문턱마다 다음 단계, 전환 중에는 무적이고 탄이 지워진다', () => {
  const g = quiet();
  const boss = g.makeEnemy(null, 400, 0, { boss: 'warden' });
  g.boss = boss;
  assert.equal(boss.phase, 0);
  for (let i = 0; i < 120; i += 1) g.update(1 / 30); // 1단계 공격
  assert.ok(g.bullets.length > 0);
  boss.hp = boss.maxHp * (BOSS_PHASES.warden[1].hp - 0.01);
  g.update(1 / 30);
  assert.equal(boss.phase, 1);
  assert.equal(g.bullets.length, 0);
  assert.equal(g.damage(boss, 100), 0, '보호막');
  for (let i = 0; i < 60; i += 1) g.update(1 / 30);
  assert.ok(g.damage(boss, 100) > 0, '보호막이 풀린다');
  boss.hp = 1;
  g.update(1 / 30);
  assert.equal(boss.phase, BOSS_PHASES.warden.length - 1);
});

test('피격·처치·스침이 게이지를 채우고, 최대치를 넘지 않는다', () => {
  const g = quiet();
  g.burst = 0;
  g.hurtPlayer(5);
  assert.equal(g.burst, BURST.hurt);
  g.chargeBurst(500);
  assert.equal(g.burst, BURST.max);
  assert.equal(g.summary().graze, 0);
});
