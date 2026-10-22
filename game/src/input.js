// 키보드·터치 입력. 화면 아무 곳이나 누르고 끌면 가상 조이스틱이 생긴다.
export class Input {
  constructor(target, stickEl) {
    this.keys = new Set();
    this.stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.stickEl = stickEl;
    this.onPause = () => {};
    this.enabled = true;
    addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!this.enabled) return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { this.onPause(); return; }
      this.keys.add(e.key.toLowerCase());
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => { this.keys.clear(); this.release(); });
    addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

    target.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.stick.active) return;
      this.stick = { active: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      target.setPointerCapture?.(e.pointerId);
      this.showStick(e.clientX, e.clientY, 0, 0);
    });
    target.addEventListener('pointermove', (e) => {
      const s = this.stick;
      if (!s.active || e.pointerId !== s.id) return;
      const dx = e.clientX - s.ox;
      const dy = e.clientY - s.oy;
      const max = 56;
      const d = Math.hypot(dx, dy);
      // 손가락이 멀리 가면 조이스틱 중심도 따라간다
      if (d > max * 1.6) {
        s.ox = e.clientX - (dx / d) * max * 1.6;
        s.oy = e.clientY - (dy / d) * max * 1.6;
      }
      const k = d > max ? max / d : 1;
      s.x = (dx * k) / max;
      s.y = (dy * k) / max;
      this.showStick(s.ox, s.oy, dx * k, dy * k);
    });
    const end = (e) => { if (e.pointerId === this.stick.id) this.release(); };
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  }

  release() {
    this.stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
    if (this.stickEl) this.stickEl.hidden = true;
  }

  showStick(x, y, kx, ky) {
    if (!this.stickEl) return;
    this.stickEl.hidden = false;
    this.stickEl.style.transform = `translate(${x}px, ${y}px)`;
    this.stickEl.firstElementChild.style.transform = `translate(${kx}px, ${ky}px)`;
  }

  get move() {
    let x = 0;
    let y = 0;
    const k = this.keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y -= 1;
    if (k.has('s') || k.has('arrowdown')) y += 1;
    if (this.stick.active) { x += this.stick.x; y += this.stick.y; }
    const l = Math.hypot(x, y);
    return l > 1 ? { x: x / l, y: y / l } : { x, y };
  }
}
