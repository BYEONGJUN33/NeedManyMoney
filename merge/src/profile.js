// 기록·설정·진행 중인 판 저장
import { MAX_TIER } from './logic.js';
import { LANGS } from './i18n.js';

const KEY = 'novamerge.v1';

const int = (v, lo, hi) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};
const num = (v, lo, hi, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

export function defaultProfile() {
  return {
    v: 1,
    best: 0,
    bestTier: 0, // 지금까지 만든 가장 큰 구슬 단계
    games: 0,
    daily: { day: '', best: 0 },
    settings: { sfx: 0.8, music: 0.4, lang: '' },
    tutorialDone: false,
    saved: null, // 진행 중인 일반 판 (MergeGame.snapshot)
  };
}

export function normalize(raw) {
  const p = defaultProfile();
  if (!raw || typeof raw !== 'object') return p;
  p.best = int(raw.best, 0, 1e9);
  p.bestTier = int(raw.bestTier, 0, MAX_TIER);
  p.games = int(raw.games, 0, 1e9);
  const d = raw.daily && typeof raw.daily === 'object' ? raw.daily : {};
  p.daily.day = typeof d.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.day) ? d.day : '';
  p.daily.best = int(d.best, 0, 1e9);
  const st = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  p.settings.sfx = num(st.sfx, 0, 1, 0.8);
  p.settings.music = num(st.music, 0, 1, 0.4);
  p.settings.lang = typeof st.lang === 'string' && Object.hasOwn(LANGS, st.lang) ? st.lang : '';
  p.tutorialDone = raw.tutorialDone === true;
  const s = raw.saved;
  if (s && Array.isArray(s.orbs) && s.orbs.length <= 200) p.saved = { ...s, score: int(s.score, 0, 1e9) };
  return p;
}

export function loadProfile(storage = globalThis.localStorage) {
  try { return normalize(JSON.parse(storage?.getItem(KEY) || 'null')); } catch { return defaultProfile(); }
}

export function saveProfile(p, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify(p)); return true; } catch { return false; }
}

export function localDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 판 결과 기록. 최고 기록 갱신 여부. count=false면 이어하기 뒤 같은 판이라 판 수를 더하지 않는다 */
export function recordGame(p, { score, tier, daily, day, count = true }) {
  if (count) p.games += 1;
  p.bestTier = Math.max(p.bestTier, tier);
  let newBest = false;
  if (daily) {
    if (p.daily.day !== day) p.daily = { day, best: 0 };
    if (score > p.daily.best) { p.daily.best = score; newBest = true; }
  } else if (score > p.best) {
    p.best = score;
    newBest = true;
  }
  return newBest;
}
