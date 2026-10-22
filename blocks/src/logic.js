// NOVA BLOCKS 규칙: 8×8 판, 블록 3개 묶음, 줄 지우기, 점수·콤보. DOM 없음.
import { SHAPES, SHAPE_BY_ID } from './pieces.js';
import { makeRng } from './math.js';

export const SIZE = 8;
export const CLEAR_BONUS = [0, 10, 30, 60, 100, 150, 210, 280, 360]; // 한 번에 지운 줄 수별
export const BOARD_CLEAR_BONUS = 300;
export const COMBO_WINDOW = 3; // 줄을 지운 뒤 이 횟수 안에 또 지우면 콤보 유지

export const idx = (r, c) => r * SIZE + c;

export function canPlace(cells, piece, r0, c0) {
  for (const [r, c] of piece) {
    const rr = r0 + r;
    const cc = c0 + c;
    if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE || cells[idx(rr, cc)]) return false;
  }
  return true;
}

/** 놓을 수 있는 자리 하나 (없으면 null) */
export function findFit(cells, piece) {
  for (let r = 0; r < SIZE; r += 1) for (let c = 0; c < SIZE; c += 1) if (canPlace(cells, piece, r, c)) return [r, c];
  return null;
}

/** 놓았을 때 지워질 줄 (판을 바꾸지 않는다) */
export function linesAfter(cells, piece, r0, c0) {
  const tmp = cells.slice();
  for (const [r, c] of piece) tmp[idx(r0 + r, c0 + c)] = 1;
  const rows = [];
  const cols = [];
  for (let i = 0; i < SIZE; i += 1) {
    let rf = true;
    let cf = true;
    for (let j = 0; j < SIZE; j += 1) {
      if (!tmp[idx(i, j)]) rf = false;
      if (!tmp[idx(j, i)]) cf = false;
    }
    if (rf) rows.push(i);
    if (cf) cols.push(i);
  }
  return { rows, cols };
}

export class BlocksGame {
  /** @param {{seed?: number, daily?: boolean}} o */
  constructor({ seed = 1, daily = false } = {}) {
    this.rng = makeRng(seed);
    this.daily = daily;
    this.cells = new Uint8Array(SIZE * SIZE);
    this.score = 0;
    this.combo = 0;
    this.sinceClear = COMBO_WINDOW;
    this.moves = 0;
    this.linesTotal = 0;
    this.bestCombo = 0;
    this.over = false;
    this.continues = 0;
    this.events = []; // 렌더러가 읽는 효과 이벤트
    this.pieces = [];
    this.deal();
  }

  /** 점수가 오를수록 큰 블록 비중을 늘린다 */
  weightOf(shape) {
    const level = Math.min(3, Math.floor(this.score / 1500));
    const tierBoost = shape.tier >= 2 ? 1 + level * 0.25 : 1;
    const smallCut = shape.tier === 0 ? Math.max(0.4, 1 - level * 0.2) : 1;
    return shape.weight * tierBoost * smallCut;
  }

  pickShape() {
    const total = SHAPES.reduce((s, sh) => s + this.weightOf(sh), 0);
    let r = this.rng() * total;
    for (const sh of SHAPES) {
      r -= this.weightOf(sh);
      if (r <= 0) return sh;
    }
    return SHAPES[0];
  }

  /** 새 블록 3개. 판에 놓을 수 있는 블록이 최소 1개는 나오게 한다 (가능할 때) */
  deal() {
    let set = null;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      set = [this.pickShape(), this.pickShape(), this.pickShape()];
      if (set.some((s) => findFit(this.cells, s.cells))) break;
    }
    if (!set.some((s) => findFit(this.cells, s.cells))) {
      // 무작위로 안 되면 들어가는 가장 작은 모양을 하나 넣는다
      const fit = [...SHAPES].sort((a, b) => a.cells.length - b.cells.length).find((s) => findFit(this.cells, s.cells));
      if (fit) set[0] = fit;
    }
    this.pieces = set.map((s) => ({ id: s.id, color: 1 + Math.floor(this.rng() * 7) }));
    this.checkOver();
  }

  piece(i) {
    const p = this.pieces[i];
    return p ? SHAPE_BY_ID[p.id].cells : null;
  }

  /** 블록 i를 판 어딘가에 놓을 수 있는지 */
  canFitIndex(i) {
    const cells = this.piece(i);
    return !!cells && !!findFit(this.cells, cells);
  }

  /** 저장해 둔 진행 상황으로 되돌린다 (새로고침해도 이어서 하기) */
  static restore(snap, seed = 1) {
    const g = new BlocksGame({ seed });
    g.cells = Uint8Array.from(snap.cells);
    g.score = snap.score | 0;
    g.pieces = snap.pieces.map((p) => (p && SHAPE_BY_ID[p.id] ? { id: p.id, color: p.color | 0 } : null));
    g.combo = snap.combo | 0;
    g.sinceClear = snap.sinceClear ?? COMBO_WINDOW;
    g.moves = snap.moves | 0;
    g.linesTotal = snap.linesTotal | 0;
    g.bestCombo = snap.bestCombo | 0;
    g.continues = snap.continues | 0;
    g.events.length = 0;
    if (g.pieces.every((p) => p === null)) g.deal();
    g.checkOver();
    return g;
  }

  canPlaceIndex(i, r, c) {
    const cells = this.piece(i);
    return !!cells && !this.over && canPlace(this.cells, cells, r, c);
  }

  /** 블록 i를 (r,c)에 놓는다. 성공하면 결과, 아니면 null */
  place(i, r0, c0) {
    if (!this.canPlaceIndex(i, r0, c0)) return null;
    const cells = this.piece(i);
    const color = this.pieces[i].color;
    for (const [r, c] of cells) this.cells[idx(r0 + r, c0 + c)] = color;
    this.pieces[i] = null;
    this.moves += 1;

    const { rows, cols } = linesAfter(this.cells, [], 0, 0);
    const cleared = [];
    for (const r of rows) for (let c = 0; c < SIZE; c += 1) cleared.push(idx(r, c));
    for (const c of cols) for (let r = 0; r < SIZE; r += 1) cleared.push(idx(r, c));
    const unique = [...new Set(cleared)];
    const lines = rows.length + cols.length;

    let gained = cells.length;
    if (lines > 0) {
      if (this.sinceClear < COMBO_WINDOW) this.combo += 1;
      else this.combo = 1;
      this.sinceClear = 0;
      const lineScore = CLEAR_BONUS[Math.min(lines, CLEAR_BONUS.length - 1)] * Math.max(1, this.combo);
      gained += lineScore;
      this.linesTotal += lines;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
    } else {
      this.sinceClear += 1;
      if (this.sinceClear >= COMBO_WINDOW) this.combo = 0;
    }
    const colorsCleared = unique.map((k) => this.cells[k]);
    for (const k of unique) this.cells[k] = 0;
    const boardClear = lines > 0 && this.cells.every((v) => v === 0);
    if (boardClear) gained += BOARD_CLEAR_BONUS;
    this.score += gained;

    const result = { piece: cells, r: r0, c: c0, color, rows, cols, cleared: unique, colorsCleared, lines, gained, combo: this.combo, boardClear };
    this.events.push({ type: 'place', ...result });
    if (this.pieces.every((p) => p === null)) this.deal();
    else this.checkOver();
    return result;
  }

  checkOver() {
    const left = this.pieces.map((p, i) => (p ? this.piece(i) : null)).filter(Boolean);
    this.over = left.length > 0 && !left.some((cells) => findFit(this.cells, cells));
    if (this.over) this.events.push({ type: 'over' });
    return this.over;
  }

  /** 남은 블록을 새로 뽑는다 (광고 보상) */
  shuffle() {
    const n = this.pieces.filter(Boolean).length || 3;
    this.deal();
    if (n < 3) for (let i = n; i < 3; i += 1) this.pieces[i] = null;
    if (this.pieces.every((p) => p === null)) this.deal();
    this.checkOver();
  }

  /** 이어하기 (광고 보상): 가장 꽉 찬 줄 3개를 지우고 블록을 새로 준다. 점수는 그대로 */
  revive() {
    const counts = [];
    for (let i = 0; i < SIZE; i += 1) {
      let rf = 0;
      let cf = 0;
      for (let j = 0; j < SIZE; j += 1) { if (this.cells[idx(i, j)]) rf += 1; if (this.cells[idx(j, i)]) cf += 1; }
      counts.push({ type: 'row', i, n: rf }, { type: 'col', i, n: cf });
    }
    counts.sort((a, b) => b.n - a.n);
    const cleared = [];
    for (const line of counts.slice(0, 3)) {
      for (let j = 0; j < SIZE; j += 1) {
        const k = line.type === 'row' ? idx(line.i, j) : idx(j, line.i);
        if (this.cells[k]) cleared.push(k);
        this.cells[k] = 0;
      }
    }
    this.continues += 1;
    this.over = false;
    this.deal();
    this.events.push({ type: 'revive', cleared });
  }

  snapshot() {
    return { cells: Array.from(this.cells), score: this.score, pieces: this.pieces, combo: this.combo, sinceClear: this.sinceClear, moves: this.moves, linesTotal: this.linesTotal, bestCombo: this.bestCombo, continues: this.continues };
  }
}

/** 오늘 날짜로 정해지는 일일 도전 시드 (모두 같은 블록 순서) */
export function dailySeed(day) {
  let h = 2166136261;
  for (const ch of `nova-blocks-${day}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
