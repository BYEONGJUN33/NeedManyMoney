// 자동 플레이로 난이도 확인: node sim/run.mjs [판 수] [봇: greedy|smart]
// 판당 수(move)·점수·지운 줄을 본다. 사람은 smart 봇과 greedy 봇 사이 어딘가.
import { BlocksGame, SIZE, idx, canPlace, linesAfter } from '../src/logic.js';

const N = Number(process.argv[2] || 200);
const BOT = process.argv[3] || 'smart';

/** 판 모양 점수: 빈 칸이 덩어리로 모여 있을수록, 고립된 빈 칸이 적을수록 좋다 */
function boardScore(cells) {
  let holes = 0;
  let edges = 0;
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const v = cells[idx(r, c)];
      if (!v) {
        let n = 0;
        if (r === 0 || cells[idx(r - 1, c)]) n += 1;
        if (r === SIZE - 1 || cells[idx(r + 1, c)]) n += 1;
        if (c === 0 || cells[idx(r, c - 1)]) n += 1;
        if (c === SIZE - 1 || cells[idx(r, c + 1)]) n += 1;
        if (n >= 3) holes += 1;
      }
      if (c < SIZE - 1 && !!v !== !!cells[idx(r, c + 1)]) edges += 1;
      if (r < SIZE - 1 && !!v !== !!cells[idx(r + 1, c)]) edges += 1;
    }
  }
  return -holes * 6 - edges;
}

function apply(cells, piece, r0, c0) {
  const t = cells.slice();
  for (const [r, c] of piece) t[idx(r0 + r, c0 + c)] = 1;
  const { rows, cols } = linesAfter(t, [], 0, 0);
  for (const r of rows) for (let c = 0; c < SIZE; c += 1) t[idx(r, c)] = 0;
  for (const c of cols) for (let r = 0; r < SIZE; r += 1) t[idx(r, c)] = 0;
  return { t, lines: rows.length + cols.length };
}

function pickMove(g) {
  let best = null;
  g.pieces.forEach((p, i) => {
    if (!p) return;
    const piece = g.piece(i);
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (!canPlace(g.cells, piece, r, c)) continue;
        const { t, lines } = apply(g.cells, piece, r, c);
        const s = BOT === 'greedy' ? lines * 10 + Math.random() : lines * 30 + boardScore(t) + Math.random() * 0.1;
        if (!best || s > best.s) best = { s, i, r, c };
      }
    }
  });
  return best;
}

const res = [];
for (let n = 0; n < N; n += 1) {
  const g = new BlocksGame({ seed: 1000 + n });
  let guard = 0;
  while (!g.over && guard < 3000) {
    const m = pickMove(g);
    if (!m) break;
    g.place(m.i, m.r, m.c);
    g.events.length = 0;
    guard += 1;
  }
  res.push({ moves: g.moves, score: g.score, lines: g.linesTotal, combo: g.bestCombo, capped: guard >= 3000 });
}
const q = (arr, p) => arr.slice().sort((a, b) => a - b)[Math.floor((arr.length - 1) * p)];
const col = (k) => res.map((x) => x[k]);
for (const k of ['moves', 'score', 'lines', 'combo']) {
  const a = col(k);
  console.log(`${k.padEnd(6)} 평균 ${Math.round(a.reduce((s, x) => s + x, 0) / a.length)}  중앙 ${q(a, 0.5)}  하위10% ${q(a, 0.1)}  상위10% ${q(a, 0.9)}`);
}
console.log(`${BOT} 봇 ${N}판, 3000수 상한 도달 ${res.filter((x) => x.capped).length}판`);
