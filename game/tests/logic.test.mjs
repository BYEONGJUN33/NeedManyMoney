import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { levelUpChoices, allOptions, applyChoice, readyEvolutions, weaponStats, computeStats, chestReward } from '../src/upgrades.js';
import { defaultProfile, normalize, buyMeta, unlockCharacter, recordRun, nextMetaCost } from '../src/profile.js';
import { WEAPONS, PASSIVES, EVOLUTIONS, EVOLVED, META, xpToNext, MAX_WEAPONS } from '../src/data.js';
import { makeRng } from '../src/math.js';
import { simulate } from '../src/bot.js';
import { STR } from '../src/i18n.js';

test('무기 스탯: 레벨이 오를수록 누적, 진화는 덮어쓰기', () => {
  assert.equal(weaponStats('blaster', 1).count, 1);
  assert.equal(weaponStats('blaster', 4).count, 3);
  assert.equal(weaponStats('blaster', 8).cooldown, 0.6);
  assert.equal(weaponStats('blaster', 8, 'hyperBlaster').count, 5);
  for (const [id, w] of Object.entries(WEAPONS)) assert.equal(w.levels.length, w.maxLevel, id);
  for (const [id, e] of Object.entries(EVOLUTIONS)) {
    assert.ok(PASSIVES[e.passive], id);
    assert.equal(EVOLVED[e.into].base, id);
  }
});

test('레벨업 선택지: 항상 3개, 중복 없음, 최대치 넘지 않음', () => {
  const rng = makeRng(7);
  const build = { weapons: [{ id: 'blaster', level: 1, evolved: null }], passives: {} };
  for (let i = 0; i < 300; i += 1) {
    const ch = levelUpChoices(build, rng, 3);
    const exhausted = allOptions(build).length === 0;
    assert.equal(ch.length, exhausted ? 2 : 3);
    const keys = ch.map((c) => `${c.type}:${c.id}`);
    assert.equal(new Set(keys).size, ch.length, keys.join());
    applyChoice(build, ch[0]);
    assert.ok(build.weapons.length <= MAX_WEAPONS);
    for (const w of build.weapons) assert.ok(w.level <= WEAPONS[w.id].maxLevel);
    for (const [k, v] of Object.entries(build.passives)) assert.ok(v <= PASSIVES[k].maxLevel);
  }
  // 모두 최대가 되면 골드·회복만 남는다
  assert.deepEqual(levelUpChoices(build, rng, 3).map((c) => c.type), ['gold', 'heal']);
});

test('진화: 최대 레벨 + 짝 패시브일 때만', () => {
  const build = { weapons: [{ id: 'blaster', level: 8, evolved: null }], passives: {} };
  assert.equal(readyEvolutions(build).length, 0);
  build.passives.haste = 1;
  const evo = readyEvolutions(build);
  assert.deepEqual(evo[0], { type: 'evolve', id: 'blaster', into: 'hyperBlaster' });
  assert.equal(chestReward(build, makeRng(1)).type, 'evolve');
  applyChoice(build, evo[0]);
  assert.equal(build.weapons[0].evolved, 'hyperBlaster');
  assert.equal(readyEvolutions(build).length, 0);
});

test('능력치: 영구 강화·캐릭터·패시브 반영', () => {
  const base = computeStats();
  assert.equal(base.maxHp, 100);
  const s = computeStats({ character: 'rook', passives: { vitality: 2, might: 1 }, meta: { vitality: 3, power: 2 } });
  assert.equal(s.maxHp, 100 + 20 + 40 + 30);
  assert.ok(Math.abs(s.might - (1 + 0.1 + 0.1)) < 1e-9);
  assert.ok(computeStats({ character: 'vex' }).maxHp === 85);
});

test('경험치 곡선은 늘어난다', () => {
  for (let L = 1; L < 80; L += 1) assert.ok(xpToNext(L + 1) > xpToNext(L));
  assert.equal(xpToNext(1), 4);
});

test('프로필: 구매·해금·기록·손상된 저장본 복구', () => {
  const p = defaultProfile();
  assert.equal(buyMeta(p, 'power'), false);
  p.gold = 10000;
  const cost = nextMetaCost(p, 'power');
  assert.equal(buyMeta(p, 'power'), true);
  assert.equal(p.gold, 10000 - cost);
  assert.equal(p.meta.power, 1);
  while (buyMeta(p, 'revival')); // 최대 1
  assert.equal(p.meta.revival, 1);
  assert.equal(nextMetaCost(p, 'revival'), null);
  assert.equal(unlockCharacter(p, 'rook'), true);
  assert.equal(unlockCharacter(p, 'rook'), false);
  const best = recordRun(p, { time: 200, kills: 500, level: 12, gold: 150, won: false });
  assert.equal(best, true);
  assert.equal(p.stats.runs, 1);
  const fixed = normalize({ gold: -5, meta: { power: 99, bogus: 3 }, characters: ['ghost', 'vex'], character: 'ghost' });
  assert.equal(fixed.gold, 0);
  assert.equal(fixed.meta.power, META.power.max);
  assert.deepEqual(fixed.characters, ['nova', 'vex']);
  assert.equal(fixed.character, 'nova');
});

test('게임: 레벨업·상자·사망·부활 흐름', () => {
  const g = new Game({ seed: 3, fx: false });
  let levelups = 0;
  while (g.t < 120 && g.state !== 'dead') {
    if (g.state === 'levelup') { levelups += 1; assert.equal(g.choices.length, 3); g.choose(g.choices[0]); continue; }
    if (g.state === 'chest') { g.choose(g.chest); continue; }
    g.update(1 / 30, { x: Math.cos(g.t), y: Math.sin(g.t) });
  }
  assert.ok(levelups > 0);
  assert.ok(g.kills > 0);
  g.player.hp = 1;
  g.player.iframes = 0;
  g.state = 'play';
  g.hurtPlayer(500);
  assert.equal(g.state, 'dead');
  g.revive();
  assert.equal(g.state, 'play');
  assert.equal(g.player.hp, g.stats.maxHp);
});

test('시뮬레이션: 영구 강화 없이 2분은 버티고, 최대 강화는 승리 가능', () => {
  const none = simulate({ seed: 1001 });
  assert.ok(none.time >= 120, `none ${none.time}`);
  const maxMeta = Object.fromEntries(Object.entries(META).map(([k, m]) => [k, m.max]));
  const wins = [1, 2, 3, 4].map((s) => simulate({ seed: 2000 + s, meta: maxMeta })).filter((r) => r.won).length;
  assert.ok(wins >= 1, `wins ${wins}`);
});

test('번역: 영어 키가 한국어에도 모두 있다', () => {
  const walk = (a, b, path = '') => {
    for (const k of Object.keys(a)) {
      assert.ok(k in b, `ko missing ${path}${k}`);
      if (typeof a[k] === 'object' && !Array.isArray(a[k])) walk(a[k], b[k], `${path}${k}.`);
    }
  };
  walk(STR.en, STR.ko);
  for (const id of [...Object.keys(WEAPONS), ...Object.keys(EVOLVED)]) assert.ok(STR.en.weapons[id], id);
  for (const id of Object.keys(PASSIVES)) assert.ok(STR.en.passives[id], id);
  for (const id of Object.keys(META)) assert.ok(STR.en.meta[id], id);
});

test('회귀: 보석이 많아도 새 경험치는 플레이어 근처에 남는다', () => {
  const g = new Game({ seed: 5, fx: false });
  for (let i = 0; i < 260; i += 1) g.gems.push({ x: 3000 + i, y: 3000, value: 1, pull: false });
  g.dropGem(10, 0, 5);
  const near = g.gems.filter((x) => Math.hypot(x.x - 10, x.y) < 1);
  assert.equal(near.length, 1);
  assert.equal(near[0].value, 6); // 가장 먼 보석의 경험치 1 + 새 경험치 5
  assert.equal(g.gems.reduce((s, x) => s + x.value, 0), 260 + 5);
});

test('회귀: 같은 프레임에 사망하면 상자를 줍지 않고, 상자는 한 번에 하나만 연다', () => {
  const g = new Game({ seed: 6, fx: false });
  g.items.push({ kind: 'chest', x: 0, y: 0 }, { kind: 'chest', x: 1, y: 0 });
  g.player.hp = 1;
  g.bullets.push({ x: 0, y: 0, vx: 0, vy: 0, r: 6, dmg: 999, life: 1, color: '#fff' });
  g.update(1 / 60);
  assert.equal(g.state, 'dead');
  assert.equal(g.items.filter((i) => i.kind === 'chest').length, 2);
  g.revive();
  g.bullets.length = 0;
  g.update(1 / 60);
  assert.equal(g.state, 'chest');
  assert.equal(g.items.filter((i) => i.kind === 'chest').length, 1);
  g.choose(g.chest);
  g.update(1 / 60);
  assert.equal(g.state, 'chest');
});

test('회귀: 보여 준 선택지가 아니면 무시한다 (중복 입력)', () => {
  const g = new Game({ seed: 8, fx: false });
  g.pendingLevels = 1;
  g.openLevelUp();
  const stale = g.choices[0];
  g.reroll(false);
  g.choose(stale === g.choices[0] ? { ...stale } : stale);
  assert.equal(g.state, 'levelup');
  g.choose(g.choices[1]);
  assert.equal(g.state, 'play');
  const before = JSON.stringify(g.build);
  g.choose(g.choices?.[0] ?? stale);
  assert.equal(JSON.stringify(g.build), before);
});

test('회귀: 공간 격자는 이동해도 커지지 않는다', async () => {
  const { SpatialGrid } = await import('../src/grid.js');
  const grid = new SpatialGrid(64);
  for (let f = 0; f < 500; f += 1) {
    grid.clear();
    for (let i = 0; i < 50; i += 1) grid.insert({ x: f * 100 + i * 10, y: 0 });
  }
  grid.clear();
  grid.clear();
  assert.ok(grid.map.size < 20, `size ${grid.map.size}`);
});

test('회귀: 손상된 저장본 타입 정리', () => {
  const p = normalize({ gold: 'abc', meta: { power: 'x', haste: 2.7 }, stats: { kills: '12' }, best: { time: null }, characters: ['__proto__', 'toString', 'rook'], character: 'constructor', settings: { sfx: 'loud', shake: 'yes', lang: 'xx' } });
  assert.equal(p.gold, 0);
  assert.equal(p.meta.power, 0);
  assert.equal(p.meta.haste, 2);
  assert.equal(p.stats.kills, 12);
  assert.equal(p.best.time, 0);
  assert.deepEqual(p.characters, ['nova', 'rook']);
  assert.equal(p.character, 'nova');
  assert.equal(p.settings.sfx, 0.8);
  assert.equal(p.settings.shake, true);
  assert.equal(p.settings.lang, '');
  assert.equal(unlockCharacter({ ...defaultProfile(), gold: 1e9 }, '__proto__'), false);
});

test('회귀: 저프레임에서도 빠른 탄이 작은 적을 지나치지 않는다', () => {
  const g = new Game({ seed: 9, fx: false });
  g.build.weapons = [];
  const e = g.makeEnemy('dart', 100, 0);
  e.speed = 0;
  g.shots.push({ kind: 'bolt', x: 0, y: 0, vx: 4000, vy: 0, dmg: 1, pierce: 0, life: 1, r: 3, color: '#fff', hits: [] });
  g.update(0.05); // 한 프레임에 200px 이동
  assert.ok(e.hp < e.maxHp);
});

test('출석 보상: 하루 한 번, 연속일수에 따라 증가, 끊기면 1일째', async () => {
  const { dailyStatus, claimDaily } = await import('../src/profile.js');
  const p = defaultProfile();
  assert.equal(dailyStatus(p, '2026-10-22').amount, 50);
  assert.equal(claimDaily(p, '2026-10-22'), 50);
  assert.equal(claimDaily(p, '2026-10-22'), 0);
  assert.equal(claimDaily(p, '2026-10-23', 2), 150);
  assert.equal(p.daily.streak, 2);
  assert.equal(claimDaily(p, '2026-10-25'), 50); // 하루 건너뜀
  for (let d = 26; d <= 31; d += 1) claimDaily(p, `2026-10-${d}`);
  assert.equal(dailyStatus(p, '2026-11-01').amount, 200); // 최대 7일째부터 200
  assert.equal(normalize({ daily: { last: 'bad', streak: 'x' } }).daily.last, '');
});
