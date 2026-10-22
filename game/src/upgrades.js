// 레벨업 선택지, 무기·패시브 레벨, 진화, 최종 능력치 계산. 순수 로직 (테스트 대상).
import {
  WEAPONS, PASSIVES, EVOLUTIONS, EVOLVED, MAX_WEAPONS, MAX_PASSIVES, PLAYER_BASE, META, CHARACTERS,
} from './data.js';
import { weightedSample } from './math.js';

/** 무기 id·레벨의 누적 스탯. evolved가 있으면 진화 스탯으로 덮어쓴다. */
export function weaponStats(id, level, evolved = null) {
  const def = WEAPONS[id];
  const s = {};
  for (let i = 0; i < Math.min(level, def.maxLevel); i += 1) Object.assign(s, def.levels[i]);
  if (evolved) Object.assign(s, EVOLVED[evolved].stats);
  return s;
}

/** 캐릭터·영구 강화·패시브를 모두 반영한 플레이어 능력치 */
export function computeStats({ character = 'nova', passives = {}, meta = {} } = {}) {
  const s = { ...PLAYER_BASE };
  for (const [id, lvl] of Object.entries(meta)) if (META[id] && lvl > 0) META[id].apply(s, lvl);
  const mods = CHARACTERS[character]?.mods || {};
  if (mods.maxHp) s.maxHp += mods.maxHp;
  if (mods.speedMul) s.speed *= mods.speedMul;
  if (mods.hasteMul) s.haste *= mods.hasteMul;
  if (mods.might) s.might += mods.might;
  for (const [id, lvl] of Object.entries(passives)) if (PASSIVES[id] && lvl > 0) PASSIVES[id].apply(s, lvl);
  s.maxHp = Math.max(20, Math.round(s.maxHp));
  return s;
}

/** 지금 진화할 수 있는 무기 목록 */
export function readyEvolutions(build) {
  return build.weapons
    .filter((w) => !w.evolved && EVOLUTIONS[w.id] && w.level >= WEAPONS[w.id].maxLevel && (build.passives[EVOLUTIONS[w.id].passive] || 0) > 0)
    .map((w) => ({ type: 'evolve', id: w.id, into: EVOLUTIONS[w.id].into }));
}

/** 가능한 모든 선택지 (가중치 포함) */
export function allOptions(build) {
  const opts = [];
  for (const e of readyEvolutions(build)) opts.push({ ...e, weight: 6 });
  for (const w of build.weapons) {
    if (!w.evolved && w.level < WEAPONS[w.id].maxLevel) opts.push({ type: 'weapon', id: w.id, level: w.level + 1, weight: 3 });
  }
  if (build.weapons.length < MAX_WEAPONS) {
    for (const id of Object.keys(WEAPONS)) {
      if (!build.weapons.some((w) => w.id === id)) opts.push({ type: 'weapon', id, level: 1, weight: 1.6 });
    }
  }
  const owned = Object.keys(build.passives).filter((id) => build.passives[id] > 0);
  for (const id of owned) {
    if (build.passives[id] < PASSIVES[id].maxLevel) opts.push({ type: 'passive', id, level: build.passives[id] + 1, weight: 2 });
  }
  if (owned.length < MAX_PASSIVES) {
    for (const id of Object.keys(PASSIVES)) {
      if (!build.passives[id]) opts.push({ type: 'passive', id, level: 1, weight: 1.3 });
    }
  }
  return opts;
}

/** 레벨업 선택지 n개. 더 고를 것이 없으면 골드·회복으로 채운다. */
export function levelUpChoices(build, rng, n = 3) {
  const picks = weightedSample(allOptions(build), (o) => o.weight, n, rng).map(({ weight, ...o }) => o);
  const fillers = [{ type: 'gold', amount: 25 }, { type: 'heal', amount: 40 }];
  let i = 0;
  while (picks.length < n && i < fillers.length) picks.push(fillers[i++]);
  return picks;
}

/** 선택을 빌드에 반영한다 (build를 직접 바꾼다) */
export function applyChoice(build, choice) {
  if (choice.type === 'weapon') {
    const w = build.weapons.find((x) => x.id === choice.id);
    if (w) w.level = Math.min(WEAPONS[w.id].maxLevel, w.level + 1);
    else if (build.weapons.length < MAX_WEAPONS) build.weapons.push({ id: choice.id, level: 1, evolved: null });
  } else if (choice.type === 'passive') {
    build.passives[choice.id] = Math.min(PASSIVES[choice.id].maxLevel, (build.passives[choice.id] || 0) + 1);
  } else if (choice.type === 'evolve') {
    const w = build.weapons.find((x) => x.id === choice.id);
    if (w) w.evolved = choice.into;
  }
  return build;
}

/** 보물상자: 진화가 가능하면 진화, 아니면 무작위 강화 1개 */
export function chestReward(build, rng) {
  const evo = readyEvolutions(build);
  if (evo.length) return evo[0];
  const ups = allOptions(build).filter((o) => o.type !== 'evolve' && (o.level > 1));
  if (ups.length) {
    const { weight, ...o } = weightedSample(ups, (x) => x.weight, 1, rng)[0];
    return o;
  }
  return levelUpChoices(build, rng, 1)[0];
}
