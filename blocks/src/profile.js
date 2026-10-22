// 기록·설정·진행 중인 판 저장
const KEY = 'novablocks.v1';

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
    games: 0,
    lines: 0,
    daily: { day: '', best: 0 },
    settings: { sfx: 0.8, music: 0.4, lang: '' },
    tutorialDone: false,
    saved: null, // 진행 중인 일반 판 { cells, score, pieces, ... }
  };
}

export function normalize(raw) {
  const p = defaultProfile();
  if (!raw || typeof raw !== 'object') return p;
  p.best = int(raw.best, 0, 1e9);
  p.games = int(raw.games, 0, 1e9);
  p.lines = int(raw.lines, 0, 1e9);
  const d = raw.daily && typeof raw.daily === 'object' ? raw.daily : {};
  p.daily.day = typeof d.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.day) ? d.day : '';
  p.daily.best = int(d.best, 0, 1e9);
  const st = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  p.settings.sfx = num(st.sfx, 0, 1, 0.8);
  p.settings.music = num(st.music, 0, 1, 0.4);
  p.settings.lang = st.lang === 'ko' || st.lang === 'en' ? st.lang : '';
  p.tutorialDone = raw.tutorialDone === true;
  const s = raw.saved;
  if (s && Array.isArray(s.cells) && s.cells.length === 64 && Array.isArray(s.pieces) && s.pieces.length === 3) {
    p.saved = { ...s, cells: s.cells.map((v) => int(v, 0, 7)), score: int(s.score, 0, 1e9) };
  }
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

/** 판 결과 기록. 최고 기록 갱신 여부 */
export function recordGame(p, { score, lines, daily, day, count = true }) {
  if (count) p.games += 1;
  p.lines += lines;
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
