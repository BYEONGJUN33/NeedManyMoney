// 게임 밸런스 데이터. 숫자 조정은 이 파일에서만 한다 (tests/balance.test.mjs 시뮬레이션으로 확인).

export const RUN_LENGTH = 600; // 10분 생존 + 최종 보스 처치 = 승리
export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;
export const MAX_ENEMIES = 420;

export const PLAYER_BASE = {
  maxHp: 100,
  speed: 150,
  magnet: 90,
  armor: 0,
  regen: 0,
  might: 1,
  haste: 1, // 쿨다운 배수 (낮을수록 빠름)
  area: 1,
  crit: 0.05,
  growth: 1,
  greed: 1,
  radius: 12,
};

/** 레벨 L에서 다음 레벨까지 필요한 경험치 */
// 후반(30레벨 이후)은 3차 항으로 급해져 레벨업 창이 너무 자주 뜨지 않게 한다
export const xpToNext = (L) => Math.round(4 + (L - 1) * 4 + 0.25 * (L - 1) ** 2 + 0.004 * (L - 1) ** 3);

// ───────── 무기 ─────────
// levels[0]이 1레벨 기본값, 이후 항목은 그 레벨에서 바뀌는 값만 적는다.
export const WEAPONS = {
  blaster: {
    icon: 'blaster', color: '#3df2ff', maxLevel: 8,
    levels: [
      { damage: 12, cooldown: 0.6, count: 1, pierce: 0, speed: 560, size: 5 },
      { count: 2 }, { damage: 14 }, { count: 3 }, { pierce: 1 }, { damage: 19 }, { count: 4 }, { cooldown: 0.6 },
    ],
  },
  orbit: {
    icon: 'orbit', color: '#7dff6a', maxLevel: 8,
    levels: [
      { damage: 13, count: 2, radius: 76, spin: 3.2, size: 11, hitEvery: 0.35 },
      { count: 3 }, { damage: 18 }, { radius: 92 }, { count: 4 }, { damage: 25, spin: 3.8 }, { count: 5 }, { damage: 32, radius: 106 },
    ],
  },
  aura: {
    icon: 'aura', color: '#a66bff', maxLevel: 8,
    levels: [
      { damage: 6, radius: 66, tick: 0.45, slow: 0.15 },
      { radius: 72 }, { damage: 7 }, { radius: 84, slow: 0.2 }, { damage: 10 }, { radius: 96 }, { damage: 13, tick: 0.42 }, { radius: 110, slow: 0.3 },
    ],
  },
  arc: {
    icon: 'arc', color: '#ffe14d', maxLevel: 8,
    levels: [
      { damage: 16, cooldown: 1.5, chains: 2, range: 230 },
      { chains: 3 }, { damage: 22 }, { cooldown: 1.25 }, { chains: 5 }, { damage: 30 }, { chains: 7 }, { damage: 40, cooldown: 1.0 },
    ],
  },
  missile: {
    icon: 'missile', color: '#ff8a3d', maxLevel: 8,
    levels: [
      { damage: 22, cooldown: 2.1, count: 1, blast: 54, speed: 300 },
      { count: 2 }, { damage: 28 }, { blast: 62 }, { count: 3 }, { damage: 36, cooldown: 1.9 }, { count: 4 }, { damage: 46, blast: 74 },
    ],
  },
  beam: {
    icon: 'beam', color: '#ff4fd8', maxLevel: 8,
    levels: [
      { damage: 26, cooldown: 2.8, length: 360, width: 14, duration: 0.25, beams: 1 },
      { damage: 34 }, { width: 20 }, { beams: 2 }, { length: 460, damage: 44 }, { cooldown: 2.3 }, { beams: 3 }, { damage: 60, width: 26 },
    ],
  },
  wave: {
    icon: 'wave', color: '#5aa8ff', maxLevel: 8,
    levels: [
      { damage: 14, cooldown: 3.2, maxRadius: 150, push: 260, speed: 360 },
      { damage: 20 }, { maxRadius: 180 }, { cooldown: 2.7 }, { damage: 28, push: 320 }, { maxRadius: 215 }, { cooldown: 2.2 }, { damage: 40, maxRadius: 250 },
    ],
  },
  drone: {
    icon: 'drone', color: '#c6ff3d', maxLevel: 8,
    levels: [
      { damage: 8, cooldown: 0.75, drones: 1, speed: 600, pierce: 0 },
      { damage: 11 }, { drones: 2 }, { cooldown: 0.6 }, { damage: 15, pierce: 1 }, { drones: 3 }, { cooldown: 0.48 }, { damage: 21 },
    ],
  },
};

// 무기 최대 레벨 + 해당 패시브 보유 → 진화
export const EVOLUTIONS = {
  blaster: { passive: 'haste', into: 'hyperBlaster' },
  orbit: { passive: 'area', into: 'sawHalo' },
  aura: { passive: 'vitality', into: 'eventHorizon' },
  arc: { passive: 'crit', into: 'stormcall' },
  missile: { passive: 'might', into: 'novaBarrage' },
};

// 진화 무기는 원본 무기의 최종 스탯에 아래 값을 덮어쓴다
export const EVOLVED = {
  hyperBlaster: { base: 'blaster', color: '#9ffcff', stats: { damage: 24, cooldown: 0.32, count: 5, pierce: 3, speed: 720 } },
  sawHalo: { base: 'orbit', color: '#e3ff9e', stats: { damage: 34, count: 7, radius: 120, spin: 4.4, size: 13, hitEvery: 0.3 } },
  eventHorizon: { base: 'aura', color: '#d2b3ff', stats: { damage: 20, radius: 135, tick: 0.33, slow: 0.45, pull: 70 } },
  stormcall: { base: 'arc', color: '#fff3a3', stats: { damage: 55, cooldown: 0.7, chains: 10, range: 300 } },
  novaBarrage: { base: 'missile', color: '#ffc08a', stats: { damage: 62, cooldown: 1.35, count: 6, blast: 92, speed: 360 } },
};

// ───────── 패시브 ─────────
export const PASSIVES = {
  might: { maxLevel: 5, apply: (s, l) => { s.might += 0.1 * l; } },
  haste: { maxLevel: 5, apply: (s, l) => { s.haste *= 1 - 0.08 * l; } },
  area: { maxLevel: 5, apply: (s, l) => { s.area += 0.1 * l; } },
  vitality: { maxLevel: 5, apply: (s, l) => { s.maxHp += 20 * l; } },
  regen: { maxLevel: 5, apply: (s, l) => { s.regen += 0.3 * l; } },
  swift: { maxLevel: 5, apply: (s, l) => { s.speed *= 1 + 0.08 * l; } },
  magnet: { maxLevel: 5, apply: (s, l) => { s.magnet *= 1 + 0.3 * l; } },
  armor: { maxLevel: 5, apply: (s, l) => { s.armor += l; } },
  crit: { maxLevel: 5, apply: (s, l) => { s.crit += 0.05 * l; } },
  wisdom: { maxLevel: 5, apply: (s, l) => { s.growth += 0.08 * l; } },
};

// ───────── 적 ─────────
// speed px/s, dmg 접촉 피해, xp 보석 가치, gold 코인 확률
export const ENEMIES = {
  drone: { hp: 8, speed: 72, dmg: 8, xp: 1, radius: 11, shape: 'circle', color: '#ff3d7f', from: 0 },
  dart: { hp: 6, speed: 122, dmg: 6, xp: 1, radius: 9, shape: 'triangle', color: '#ff7a3d', from: 50 },
  brute: { hp: 50, speed: 50, dmg: 15, xp: 5, radius: 20, shape: 'square', color: '#d23dff', from: 110, mass: 3, max: 30 },
  spitter: { hp: 22, speed: 58, dmg: 8, xp: 3, radius: 13, shape: 'diamond', color: '#3dffb5', from: 210, max: 7, ranged: { range: 260, every: 3.4, bullet: 7, speed: 145 } },
  splitter: { hp: 30, speed: 64, dmg: 9, xp: 2, radius: 15, shape: 'hex', color: '#ffd23d', from: 230, splits: { into: 'dart', count: 3 } },
  bomber: { hp: 18, speed: 64, dmg: 22, xp: 3, radius: 12, shape: 'star', color: '#ff4040', from: 330, max: 14, charge: { trigger: 150, speed: 300, blast: 64 } },
};

export const BOSSES = {
  warden: { hp: 3200, speed: 58, dmg: 25, xp: 120, radius: 46, color: '#ff3d7f', at: 300, gold: 120 },
  overmind: { hp: 11000, speed: 64, dmg: 35, xp: 0, radius: 62, color: '#b04dff', at: 600, gold: 400, final: true },
};

/** 시간 t초에서 적 체력·피해 배수 */
export const hpScale = (t) => 1 + t / 180 + (t / 300) ** 2.5;
export const dmgScale = (t) => 1 + t / 420;

/** 시간 t초에 화면 주변에 유지할 적 수. 모자라면 빠르게 채운다. */
// 첫 1분은 초보도 버틸 만큼 완만하게 시작하고, 이후 빠르게 늘어난다
export const targetAlive = (t) => Math.min(MAX_ENEMIES, Math.round(5 + t * 0.3 + Math.max(0, t - 60) * 0.14 + (t / 200) ** 2 * 10));
/** 목표 수와 관계없이 꾸준히 나오는 초당 출현 수 */
export const trickleRate = (t) => 0.3 + t * 0.008;

/** 이 시간대에 나올 적 종류와 가중치 */
export function spawnTable(t) {
  const table = [];
  for (const [id, e] of Object.entries(ENEMIES)) {
    if (t < e.from) continue;
    const age = t - e.from;
    // 새 적은 서서히 비중이 늘고, 기본 적은 후반으로 갈수록 줄어든다
    let w = Math.min(1, 0.25 + age / 120);
    if (id === 'drone') w = Math.max(0.35, 1 - t / 700);
    if (id === 'brute') w *= 0.35;
    if (id === 'bomber') w *= 0.6;
    if (id === 'spitter') w *= 0.5;
    table.push([id, w]);
  }
  return table;
}

// 큰 무리 습격: 시간(초)과 형태
export const SWARMS = [
  { at: 150, enemy: 'drone', count: 24, form: 'ring' },
  { at: 250, enemy: 'dart', count: 30, form: 'ring' },
  { at: 270, enemy: 'drone', count: 50, form: 'line' },
  { at: 400, enemy: 'brute', count: 18, form: 'ring' },
  { at: 470, enemy: 'dart', count: 70, form: 'ring' },
  { at: 540, enemy: 'splitter', count: 30, form: 'ring' },
];
export const ELITE_EVERY = 60; // 초마다 엘리트 1마리 (보물상자 드랍)

// ───────── 드랍 ─────────
export const DROPS = { coin: 0.04, heart: 0.004, magnet: 0.0025, bomb: 0.0015 };
export const HEART_HEAL = 30;

// ───────── 영구 강화 (상점) ─────────
export const META = {
  power: { max: 5, base: 120, growth: 1.6, apply: (s, l) => { s.might += 0.05 * l; } },
  vitality: { max: 5, base: 100, growth: 1.55, apply: (s, l) => { s.maxHp += 10 * l; } },
  armor: { max: 3, base: 200, growth: 1.8, apply: (s, l) => { s.armor += l; } },
  recovery: { max: 5, base: 150, growth: 1.6, apply: (s, l) => { s.regen += 0.2 * l; } },
  haste: { max: 4, base: 220, growth: 1.7, apply: (s, l) => { s.haste *= 1 - 0.03 * l; } },
  speed: { max: 4, base: 140, growth: 1.6, apply: (s, l) => { s.speed *= 1 + 0.04 * l; } },
  magnet: { max: 4, base: 90, growth: 1.5, apply: (s, l) => { s.magnet *= 1 + 0.15 * l; } },
  greed: { max: 5, base: 160, growth: 1.65, apply: (s, l) => { s.greed += 0.1 * l; } },
  growth: { max: 5, base: 180, growth: 1.6, apply: (s, l) => { s.growth += 0.05 * l; } },
  reroll: { max: 3, base: 300, growth: 2, apply: () => {} },
  revival: { max: 1, base: 1500, growth: 1, apply: () => {} },
};
export const metaCost = (id, level) => Math.round(META[id].base * META[id].growth ** level / 10) * 10;

export const CHARACTERS = {
  nova: { weapon: 'blaster', cost: 0, color: '#3df2ff', mods: {} },
  rook: { weapon: 'orbit', cost: 700, color: '#7dff6a', mods: { maxHp: 20, speedMul: 0.95, area: 0.2 } },
  volt: { weapon: 'arc', cost: 1300, color: '#ffe14d', mods: { hasteMul: 0.9, maxHp: -10 } },
  vex: { weapon: 'missile', cost: 2200, color: '#ff8a3d', mods: { might: 0.1, maxHp: -15 } },
};

/** 판이 끝났을 때 받는 골드 (게임 중 주운 코인 별도) */
export const runBonusGold = ({ time, kills, won }) => Math.floor(time / 60) * 10 + Math.floor(kills / 25) + (won ? 300 : 0);

// ───────── 스테이지 ─────────
// 배율은 적 체력·속도·피해·출현 수와 판 종료 골드에 곱해진다. unlock 조건을 채우면 열린다.
export const STAGES = {
  grid: { order: 1, color: '#3df2ff', bg: '#06080f', grid: [80, 120, 200], hp: 1, speed: 1, dmg: 1, spawn: 1, gold: 1, unlock: null },
  rift: { order: 2, color: '#ff3d7f', bg: '#0f0509', grid: [220, 60, 100], hp: 1.4, speed: 1.08, dmg: 1.15, spawn: 1.15, gold: 1.6, unlock: { bestTime: 300 } },
  void: { order: 3, color: '#a66bff', bg: '#07040f', grid: [150, 100, 255], hp: 2, speed: 1.15, dmg: 1.3, spawn: 1.3, gold: 2.5, unlock: { wins: 1 } },
};

/** 승리 후 무한 모드: 10분 이후 체력이 더 가파르게 오른다 */
export const endlessHpScale = (t) => (t <= RUN_LENGTH ? 1 : 1 + ((t - RUN_LENGTH) / 120) ** 1.6);
