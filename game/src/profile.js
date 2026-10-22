// 영구 진행 상황(골드, 상점 강화, 캐릭터, 기록, 설정) 저장·불러오기와 구매 규칙.
import { META, metaCost, CHARACTERS } from './data.js';

const KEY = 'novaswarm.v1';

export function defaultProfile() {
  return {
    v: 1,
    gold: 0,
    meta: Object.fromEntries(Object.keys(META).map((k) => [k, 0])),
    characters: ['nova'],
    character: 'nova',
    best: { time: 0, kills: 0, level: 0 },
    stats: { runs: 0, wins: 0, kills: 0, goldEarned: 0 },
    settings: { sfx: 0.8, music: 0.5, shake: true, lang: '' },
  };
}

/** 저장본과 기본값을 합쳐 빠진 필드를 채운다 (버전이 바뀌어도 깨지지 않게) */
export function normalize(raw) {
  const d = defaultProfile();
  if (!raw || typeof raw !== 'object') return d;
  const p = { ...d, ...raw };
  p.meta = { ...d.meta, ...(raw.meta || {}) };
  for (const k of Object.keys(p.meta)) p.meta[k] = Math.max(0, Math.min(META[k]?.max ?? 0, Math.floor(p.meta[k] || 0)));
  p.characters = Array.isArray(raw.characters) ? [...new Set(['nova', ...raw.characters.filter((c) => CHARACTERS[c])])] : ['nova'];
  if (!p.characters.includes(p.character)) p.character = 'nova';
  p.best = { ...d.best, ...(raw.best || {}) };
  p.stats = { ...d.stats, ...(raw.stats || {}) };
  p.settings = { ...d.settings, ...(raw.settings || {}) };
  p.gold = Math.max(0, Math.floor(Number(p.gold) || 0));
  return p;
}

export function loadProfile(storage = globalThis.localStorage) {
  try {
    return normalize(JSON.parse(storage?.getItem(KEY) || 'null'));
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

export function nextMetaCost(p, id) {
  const lvl = p.meta[id] || 0;
  return lvl >= META[id].max ? null : metaCost(id, lvl);
}

export function buyMeta(p, id) {
  const cost = nextMetaCost(p, id);
  if (cost == null || p.gold < cost) return false;
  p.gold -= cost;
  p.meta[id] += 1;
  return true;
}

export function unlockCharacter(p, id) {
  const c = CHARACTERS[id];
  if (!c || p.characters.includes(id) || p.gold < c.cost) return false;
  p.gold -= c.cost;
  p.characters.push(id);
  return true;
}

/** 판 결과 기록. 최고 기록 갱신 여부를 돌려준다. */
export function recordRun(p, { time, kills, level, gold, won }) {
  const newBest = time > p.best.time;
  if (newBest) p.best.time = time;
  p.best.kills = Math.max(p.best.kills, kills);
  p.best.level = Math.max(p.best.level, level);
  p.stats.runs += 1;
  if (won) p.stats.wins += 1;
  p.stats.kills += kills;
  p.stats.goldEarned += gold;
  p.gold += gold;
  return newBest;
}
