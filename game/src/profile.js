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
    settings: { sfx: 0.8, music: 0.5, shake: true, lang: '', gfx: 'auto' },
  };
}

const int = (v, lo, hi) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};
const num = (v, lo, hi, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};
const isChar = (c) => typeof c === 'string' && Object.hasOwn(CHARACTERS, c);

/** 저장본과 기본값을 합쳐 빠진 필드를 채우고 타입·범위를 바로잡는다 (손상된 저장본 대비) */
export function normalize(raw) {
  const d = defaultProfile();
  if (!raw || typeof raw !== 'object') return d;
  const p = d;
  p.gold = int(raw.gold, 0, 1e12);
  const meta = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
  for (const k of Object.keys(META)) p.meta[k] = int(meta[k], 0, META[k].max);
  p.characters = ['nova', ...new Set((Array.isArray(raw.characters) ? raw.characters : []).filter((c) => isChar(c) && c !== 'nova'))];
  p.character = isChar(raw.character) && p.characters.includes(raw.character) ? raw.character : 'nova';
  const best = raw.best && typeof raw.best === 'object' ? raw.best : {};
  for (const k of Object.keys(d.best)) p.best[k] = int(best[k], 0, 1e12);
  const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  for (const k of Object.keys(d.stats)) p.stats[k] = int(stats[k], 0, 1e12);
  const st = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  p.settings.sfx = num(st.sfx, 0, 1, d.settings.sfx);
  p.settings.music = num(st.music, 0, 1, d.settings.music);
  p.settings.shake = typeof st.shake === 'boolean' ? st.shake : true;
  p.settings.lang = st.lang === 'ko' || st.lang === 'en' ? st.lang : '';
  p.settings.gfx = ['auto', 'high', 'low'].includes(st.gfx) ? st.gfx : 'auto';
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
  if (!Object.hasOwn(META, id)) return null;
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
  if (!isChar(id)) return false;
  const c = CHARACTERS[id];
  if (p.characters.includes(id) || p.gold < c.cost) return false;
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
