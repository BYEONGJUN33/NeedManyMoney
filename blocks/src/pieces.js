// 블록 모양 정의. 각 모양은 [행, 열] 칸 목록이다. weight는 기본 출현 비중, tier는 크기 등급(점수가 오르면 큰 블록 비중이 늘어난다).
const S = (rows) => {
  const cells = [];
  rows.forEach((line, r) => [...line].forEach((ch, c) => { if (ch === '#') cells.push([r, c]); }));
  return cells;
};

export const SHAPES = [
  { id: 'dot', cells: S(['#']), weight: 3, tier: 0 },
  { id: 'i2h', cells: S(['##']), weight: 5, tier: 0 },
  { id: 'i2v', cells: S(['#', '#']), weight: 5, tier: 0 },
  { id: 'i3h', cells: S(['###']), weight: 6, tier: 1 },
  { id: 'i3v', cells: S(['#', '#', '#']), weight: 6, tier: 1 },
  { id: 'i4h', cells: S(['####']), weight: 4, tier: 2 },
  { id: 'i4v', cells: S(['#', '#', '#', '#']), weight: 4, tier: 2 },
  { id: 'i5h', cells: S(['#####']), weight: 2, tier: 3 },
  { id: 'i5v', cells: S(['#', '#', '#', '#', '#']), weight: 2, tier: 3 },
  { id: 'o2', cells: S(['##', '##']), weight: 6, tier: 1 },
  { id: 'o3', cells: S(['###', '###', '###']), weight: 2, tier: 3 },
  { id: 'r23', cells: S(['###', '###']), weight: 2, tier: 2 },
  { id: 'r32', cells: S(['##', '##', '##']), weight: 2, tier: 2 },
  { id: 'c2a', cells: S(['#.', '##']), weight: 4, tier: 1 },
  { id: 'c2b', cells: S(['.#', '##']), weight: 4, tier: 1 },
  { id: 'c2c', cells: S(['##', '#.']), weight: 4, tier: 1 },
  { id: 'c2d', cells: S(['##', '.#']), weight: 4, tier: 1 },
  { id: 'c3a', cells: S(['#..', '#..', '###']), weight: 2, tier: 3 },
  { id: 'c3b', cells: S(['..#', '..#', '###']), weight: 2, tier: 3 },
  { id: 'c3c', cells: S(['###', '#..', '#..']), weight: 2, tier: 3 },
  { id: 'c3d', cells: S(['###', '..#', '..#']), weight: 2, tier: 3 },
  { id: 'l1', cells: S(['#.', '#.', '##']), weight: 3, tier: 2 },
  { id: 'l2', cells: S(['.#', '.#', '##']), weight: 3, tier: 2 },
  { id: 'l3', cells: S(['##', '#.', '#.']), weight: 3, tier: 2 },
  { id: 'l4', cells: S(['##', '.#', '.#']), weight: 3, tier: 2 },
  { id: 'l5', cells: S(['###', '#..']), weight: 3, tier: 2 },
  { id: 'l6', cells: S(['###', '..#']), weight: 3, tier: 2 },
  { id: 'l7', cells: S(['#..', '###']), weight: 3, tier: 2 },
  { id: 'l8', cells: S(['..#', '###']), weight: 3, tier: 2 },
  { id: 't1', cells: S(['###', '.#.']), weight: 3, tier: 2 },
  { id: 't2', cells: S(['.#.', '###']), weight: 3, tier: 2 },
  { id: 't3', cells: S(['#.', '##', '#.']), weight: 3, tier: 2 },
  { id: 't4', cells: S(['.#', '##', '.#']), weight: 3, tier: 2 },
  { id: 's1', cells: S(['.##', '##.']), weight: 2, tier: 2 },
  { id: 's2', cells: S(['##.', '.##']), weight: 2, tier: 2 },
  { id: 's3', cells: S(['#.', '##', '.#']), weight: 2, tier: 2 },
  { id: 's4', cells: S(['.#', '##', '#.']), weight: 2, tier: 2 },
  { id: 'd2a', cells: S(['#.', '.#']), weight: 1, tier: 1 },
  { id: 'd2b', cells: S(['.#', '#.']), weight: 1, tier: 1 },
];

export const SHAPE_BY_ID = Object.fromEntries(SHAPES.map((s) => [s.id, s]));

/** 모양의 행·열 크기 */
export function extent(cells) {
  let h = 0;
  let w = 0;
  for (const [r, c] of cells) { h = Math.max(h, r + 1); w = Math.max(w, c + 1); }
  return { h, w };
}

/** 블록 색 (번호 1~7). 0은 빈 칸 */
export const COLORS = ['', '#3df2ff', '#7dff6a', '#ffd23d', '#ff3d7f', '#a66bff', '#ff8a3d', '#5aa8ff'];
