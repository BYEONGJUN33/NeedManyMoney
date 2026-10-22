import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BlocksGame, canPlace, findFit, linesAfter, SIZE, idx, CLEAR_BONUS, BOARD_CLEAR_BONUS, dailySeed } from '../src/logic.js';
import { SHAPES, SHAPE_BY_ID, extent } from '../src/pieces.js';

test('모양: 중복 없는 id, 모든 칸이 0 기준', () => {
  assert.equal(new Set(SHAPES.map((s) => s.id)).size, SHAPES.length);
  for (const s of SHAPES) {
    assert.ok(s.cells.length >= 1);
    assert.ok(s.cells.some(([r]) => r === 0) && s.cells.some(([, c]) => c === 0), s.id);
    const { h, w } = extent(s.cells);
    assert.ok(h <= 5 && w <= 5);
  }
});

test('놓기 판정: 경계와 겹침', () => {
  const cells = new Uint8Array(64);
  const sq = SHAPE_BY_ID.o2.cells;
  assert.ok(canPlace(cells, sq, 6, 6));
  assert.ok(!canPlace(cells, sq, 7, 6));
  cells[idx(3, 3)] = 1;
  assert.ok(!canPlace(cells, sq, 2, 2));
  assert.deepEqual(findFit(cells, sq), [0, 0]);
});

test('줄 지우기 점수와 콤보', () => {
  const g = new BlocksGame({ seed: 1 });
  // 0행을 7칸 채우고 1칸 블록으로 완성
  for (let c = 0; c < 7; c += 1) g.cells[idx(0, c)] = 1;
  g.cells[idx(7, 7)] = 1; // 판이 완전히 비지 않게 (전체 비우기 보너스 제외)
  g.pieces = [{ id: 'dot', color: 1 }, { id: 'dot', color: 2 }, { id: 'o3', color: 3 }];
  const r = g.place(0, 0, 7);
  assert.equal(r.lines, 1);
  assert.equal(r.gained, 1 + CLEAR_BONUS[1]);
  assert.equal(g.combo, 1);
  // 다음 수에 또 지우면 콤보 2
  for (let c = 0; c < 7; c += 1) g.cells[idx(5, c)] = 1;
  const r2 = g.place(1, 5, 7);
  assert.equal(r2.combo, 2);
  assert.equal(r2.gained, 1 + CLEAR_BONUS[1] * 2);
  assert.equal(g.cells[idx(5, 3)], 0);
});

test('가로·세로 동시 + 판 전체 비우기 보너스', () => {
  const g = new BlocksGame({ seed: 2 });
  for (let c = 0; c < 8; c += 1) if (c !== 4) g.cells[idx(4, c)] = 1;
  for (let r = 0; r < 8; r += 1) if (r !== 4) g.cells[idx(r, 4)] = 1;
  g.pieces = [{ id: 'dot', color: 1 }, null, { id: 'dot', color: 1 }];
  const res = g.place(0, 4, 4);
  assert.equal(res.lines, 2);
  assert.equal(res.boardClear, true);
  assert.equal(res.gained, 1 + CLEAR_BONUS[2] + BOARD_CLEAR_BONUS);
});

test('세 개를 다 놓으면 새 묶음, 놓을 곳이 없으면 게임 오버', () => {
  const g = new BlocksGame({ seed: 3 });
  g.pieces = [{ id: 'dot', color: 1 }, { id: 'dot', color: 1 }, { id: 'dot', color: 1 }];
  g.place(0, 0, 0); g.place(1, 0, 2); g.place(2, 0, 4);
  assert.equal(g.pieces.filter(Boolean).length, 3);
  // 체스판 무늬로 채우면 2칸 이상 블록은 못 놓는다
  const h = new BlocksGame({ seed: 4 });
  for (let r = 0; r < SIZE; r += 1) for (let c = 0; c < SIZE; c += 1) h.cells[idx(r, c)] = (r + c) % 2 ? 1 : 0;
  h.pieces = [{ id: 'i2h', color: 1 }, { id: 'o2', color: 1 }, null];
  assert.equal(h.checkOver(), true);
  h.revive();
  assert.equal(h.over, false);
  assert.equal(h.continues, 1);
  assert.ok(h.pieces.some((p, i) => p && findFit(h.cells, h.piece(i))));
});

test('묶음에는 놓을 수 있는 블록이 최소 하나 (가능할 때)', () => {
  for (let seed = 1; seed < 40; seed += 1) {
    const g = new BlocksGame({ seed });
    for (let k = 0; k < 64; k += 1) g.cells[k] = k % 3 === 0 ? 0 : 1; // 띄엄띄엄 빈 칸
    for (let r = 0; r < SIZE; r += 1) g.cells[idx(r, 0)] = 1;
    g.deal();
    assert.ok(g.pieces.some((p, i) => findFit(g.cells, g.piece(i))), `seed ${seed}`);
  }
});

test('일일 시드는 날짜마다 다르고 같은 날은 같다', () => {
  assert.equal(dailySeed('2026-10-22'), dailySeed('2026-10-22'));
  assert.notEqual(dailySeed('2026-10-22'), dailySeed('2026-10-23'));
  const a = new BlocksGame({ seed: dailySeed('2026-10-22'), daily: true });
  const b = new BlocksGame({ seed: dailySeed('2026-10-22'), daily: true });
  assert.deepEqual(a.pieces, b.pieces);
});

test('자동 플레이: 탐욕 정책으로 끝까지 진행해도 오류 없이 끝난다', () => {
  let total = 0;
  for (let seed = 1; seed <= 20; seed += 1) {
    const g = new BlocksGame({ seed });
    let guard = 0;
    while (!g.over && guard < 2000) {
      guard += 1;
      let best = null;
      g.pieces.forEach((p, i) => {
        if (!p) return;
        const cells = g.piece(i);
        for (let r = 0; r < SIZE; r += 1) for (let c = 0; c < SIZE; c += 1) {
          if (!canPlace(g.cells, cells, r, c)) continue;
          const { rows, cols } = linesAfter(g.cells, cells, r, c);
          const score = (rows.length + cols.length) * 10 - r * 0.1;
          if (!best || score > best.score) best = { i, r, c, score };
        }
      });
      if (!best) break;
      assert.ok(g.place(best.i, best.r, best.c));
    }
    total += g.score;
  }
  assert.ok(total / 20 > 200, `avg ${total / 20}`);
});

test('저장·복원: 같은 판으로 이어진다', async () => {
  const { normalize, defaultProfile, recordGame } = await import('../src/profile.js');
  const g = new BlocksGame({ seed: 9 });
  g.place(0, ...findFit(g.cells, g.piece(0)));
  const snap = JSON.parse(JSON.stringify(g.snapshot()));
  const p = normalize({ saved: snap });
  const h = BlocksGame.restore(p.saved);
  assert.deepEqual(Array.from(h.cells), Array.from(g.cells));
  assert.equal(h.score, g.score);
  assert.deepEqual(h.pieces, g.pieces);
  assert.equal(normalize({ saved: { cells: [1, 2], pieces: [] } }).saved, null);
  const q = defaultProfile();
  assert.equal(recordGame(q, { score: 500, lines: 4 }), true);
  assert.equal(recordGame(q, { score: 400, lines: 4 }), false);
  assert.equal(recordGame(q, { score: 100, lines: 1, daily: true, day: '2026-10-22' }), true);
  assert.equal(q.daily.best, 100);
  assert.equal(recordGame(q, { score: 50, lines: 1, daily: true, day: '2026-10-23' }), true);
  assert.equal(q.daily.best, 50);
});
