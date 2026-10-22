// 균일 격자 공간 해시. 매 프레임 적을 다시 넣고 주변 칸만 조회해 충돌 검사 비용을 줄인다.
export class SpatialGrid {
  constructor(cell = 64) {
    this.cell = cell;
    this.map = new Map();
  }

  clear() {
    for (const bucket of this.map.values()) bucket.length = 0;
  }

  key(cx, cy) {
    return (cx + 32768) * 65536 + (cy + 32768);
  }

  insert(e) {
    const k = this.key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell));
    let b = this.map.get(k);
    if (!b) {
      b = [];
      this.map.set(k, b);
    }
    b.push(e);
  }

  /** (x, y) 반경 r 안의 후보를 out 배열에 담는다 (정확한 거리 판정은 호출자가 한다) */
  query(x, y, r, out) {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((x - r) / c);
    const x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c);
    const y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx += 1) {
      for (let cy = y0; cy <= y1; cy += 1) {
        const b = this.map.get(this.key(cx, cy));
        if (b) for (let i = 0; i < b.length; i += 1) out.push(b[i]);
      }
    }
    return out;
  }
}
