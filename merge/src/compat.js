// 오래된 브라우저 보완 (iOS 15 초기 Safari, 2021년 이전 Chrome 등). 없으면 게임이 시작되지 않는 기능만 채운다.
if (!Object.hasOwn) Object.hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const C = globalThis.CanvasRenderingContext2D?.prototype;
if (C && !C.roundRect) {
  // r: 숫자 하나 또는 [왼위, 오위, 오아래, 왼아래] (CSS border-radius와 같은 1~4개 규칙)
  C.roundRect = function roundRect(x, y, w, h, r = 0) {
    const a = Array.isArray(r) ? r : [r];
    const [tl, tr, br, bl] = a.length === 1 ? [a[0], a[0], a[0], a[0]]
      : a.length === 2 ? [a[0], a[1], a[0], a[1]]
        : a.length === 3 ? [a[0], a[1], a[2], a[1]] : a;
    const m = Math.min(Math.abs(w), Math.abs(h)) / 2;
    const k = (v) => Math.max(0, Math.min(m, +v || 0));
    this.moveTo(x + k(tl), y);
    this.arcTo(x + w, y, x + w, y + h, k(tr));
    this.arcTo(x + w, y + h, x, y + h, k(br));
    this.arcTo(x, y + h, x, y, k(bl));
    this.arcTo(x, y, x + w, y, k(tl));
    this.closePath();
  };
}
