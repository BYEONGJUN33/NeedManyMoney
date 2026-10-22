// NOVA MERGE 캔버스: 통, 구슬(얼굴 포함), 조준선, 다음 구슬, 진화표, 효과. 배치 계산(layout)도 여기서 한다.
import { W, H, DEAD_Y, DROP_Y, RADII, MAX_TIER, COOLDOWN, OVER_TIME } from './logic.js';
import { TAU, clamp } from './math.js';

const BG = '#070912';
export const COLORS = ['#ff3d7f', '#ff8a3d', '#ffd23d', '#7dff6a', '#3df2ff', '#5aa8ff', '#a66bff', '#ff5ad1', '#3dffb0', '#ffb03d', '#ffffff'];

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprites = new Map();
    this.particles = [];
    this.rings = [];
    this.texts = [];
    this.flash = 0;
    this.shake = 0;
    this.overFade = 0;
    this.t = 0;
    this.bestTier = 0; // 진화표에서 밝게 보여 줄 단계 (기록 + 이번 판)
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.dpr = dpr;
    this.layout();
    this.sprites.clear();
  }

  /** 통 위치와 배율. 세로 화면은 아래에 진화표, 가로 화면은 왼쪽에 다음 구슬·오른쪽에 진화표 */
  layout() {
    const { w, h } = this;
    this.landscape = w > h * 1.1;
    if (this.landscape) {
      const top = 70;
      this.k = Math.min((h - top - 20) / H, (w * 0.46) / W);
      this.jx = Math.round((w - W * this.k) / 2);
      this.jy = Math.round(top + (h - top - 20 - H * this.k) / 2);
      const jw = W * this.k;
      this.nextBox = { x: this.jx - 70, y: this.jy + 70, size: 64 };
      const step = Math.min(52, (H * this.k) / (MAX_TIER + 1));
      this.evo = RADII.map((_, i) => ({ x: this.jx + jw + 46, y: this.jy + step * (i + 0.5), size: step * 0.42 * (0.7 + i * 0.03) }));
    } else {
      const top = 112;
      const bottom = 60;
      this.k = Math.min((w - 24) / W, (h - top - bottom - 16) / H);
      this.jx = Math.round((w - W * this.k) / 2);
      this.jy = Math.round(top + Math.max(0, (h - top - bottom - 16 - H * this.k) * 0.65)); // 남는 공간은 위쪽에 더 (손가락이 닿기 쉬운 아래로)
      this.nextBox = { x: w - 36, y: 80, size: 34, labelLeft: true };
      const span = Math.min(w - 24, 420);
      const step = span / (MAX_TIER + 1);
      const ey = this.jy + H * this.k + 10 + 22;
      this.evo = RADII.map((_, i) => ({ x: (w - span) / 2 + step * (i + 0.5), y: ey, size: step * 0.4 * (0.75 + i * 0.03) }));
    }
  }

  sx(x) { return this.jx + x * this.k; }
  sy(y) { return this.jy + y * this.k; }
  /** 화면 x → 통 안 x */
  toWorldX(x) { return (x - this.jx) / this.k; }

  /** 구슬 몸통 스프라이트 (단계·픽셀 반지름별로 한 번만 그린다) */
  orbSprite(tier, rad) {
    const R = Math.max(2, Math.round(rad));
    const key = `${tier}|${R}`;
    let s = this.sprites.get(key);
    if (s) return s;
    const pad = Math.ceil(R * 0.45) + 2;
    const full = R * 2 + pad * 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil(full * this.dpr);
    c.height = Math.ceil(full * this.dpr);
    const g = c.getContext('2d');
    g.scale(this.dpr, this.dpr);
    const cx = full / 2;
    const color = COLORS[tier];
    g.shadowColor = color;
    g.shadowBlur = R * 0.5;
    const grad = g.createRadialGradient(cx - R * 0.35, cx - R * 0.4, R * 0.1, cx, cx, R);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, color);
    grad.addColorStop(1, shade(color, -0.45));
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cx, R, 0, TAU);
    g.fill();
    g.shadowBlur = 0;
    // 큰 구슬은 무늬로 구분
    if (tier >= 4) {
      g.strokeStyle = 'rgba(255,255,255,0.22)';
      g.lineWidth = Math.max(1, R * 0.06);
      g.beginPath();
      g.arc(cx, cx, R * 0.72, 0, TAU);
      g.stroke();
    }
    if (tier >= 7) {
      g.save();
      g.translate(cx, cx);
      g.rotate(-0.35);
      g.scale(1, 0.32);
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = Math.max(1, R * 0.1);
      g.beginPath();
      g.arc(0, 0, R * 1.0, 0, TAU);
      g.stroke();
      g.restore();
    }
    if (tier === MAX_TIER) {
      // NOVA: 무지개 테두리
      const rg = g.createConicGradient ? g.createConicGradient(0, cx, cx) : null;
      if (rg) {
        COLORS.slice(0, 10).forEach((col, i) => rg.addColorStop(i / 10, col));
        rg.addColorStop(1, COLORS[0]);
        g.strokeStyle = rg;
      } else g.strokeStyle = '#ffd23d';
      g.lineWidth = Math.max(2, R * 0.1);
      g.beginPath();
      g.arc(cx, cx, R * 0.94, 0, TAU);
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.lineWidth = Math.max(1, R * 0.05);
    g.beginPath();
    g.arc(cx, cx, R - g.lineWidth / 2, 0, TAU);
    g.stroke();
    // 윗면 반사
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.ellipse(cx - R * 0.32, cx - R * 0.45, R * 0.32, R * 0.16, -0.5, 0, TAU);
    g.fill();
    s = { c, full };
    this.sprites.set(key, s);
    return s;
  }

  /** 화면 좌표에 구슬 하나 (얼굴 포함) */
  drawOrb(tier, x, y, rad, { id = 0, lookX = null, alpha = 1, face = true, gray = 0, base = rad } = {}) {
    const { ctx } = this;
    // 커지는 중인 구슬은 다 큰 크기(base) 스프라이트를 줄여 그려 스프라이트가 늘지 않게 한다
    const s = this.orbSprite(tier, base);
    const d = (s.full * rad) / Math.max(2, Math.round(base));
    ctx.globalAlpha = alpha;
    if (gray > 0) ctx.filter = `grayscale(${gray})`;
    ctx.drawImage(s.c, x - d / 2, y - d / 2, d, d);
    ctx.filter = 'none';
    if (face && rad >= 7) this.drawFace(x, y, rad, id, lookX);
    ctx.globalAlpha = 1;
  }

  drawFace(x, y, r, id, lookX) {
    const { ctx } = this;
    const ex = r * 0.3;
    const ey = -r * 0.02;
    const er = Math.max(1.6, r * 0.15);
    const blink = (this.t * 0.9 + id * 0.37) % 4 < 0.1;
    const look = lookX == null ? 0 : clamp((lookX - x) / 120, -1, 1);
    for (const sx of [-1, 1]) {
      const cx = x + sx * ex;
      const cy = y + ey;
      if (blink) {
        ctx.strokeStyle = 'rgba(10,12,30,0.85)';
        ctx.lineWidth = Math.max(1, er * 0.4);
        ctx.beginPath();
        ctx.moveTo(cx - er, cy);
        ctx.lineTo(cx + er, cy);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(cx, cy, er, er * 1.15, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#0a0c1e';
      ctx.beginPath();
      ctx.arc(cx + look * er * 0.4, cy + er * 0.15, er * 0.55, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(10,12,30,0.75)';
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    ctx.arc(x, y + r * 0.18, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  /* ───────── 효과 ───────── */

  consume(game) {
    for (const ev of game.events) this.onEvent(ev);
    game.events.length = 0;
  }

  onEvent(ev) {
    const x = this.sx(ev.x ?? 0);
    const y = this.sy(ev.y ?? 0);
    if (ev.type === 'merge') {
      const r = RADII[ev.tier] * this.k;
      this.burst(x, y, COLORS[ev.tier], 6 + ev.tier * 2, 120 + ev.tier * 25);
      this.rings.push({ x, y, r0: r * 0.8, r1: r * 1.8, life: 0.35, max: 0.35, color: COLORS[ev.tier] });
      this.texts.push({ x, y: y - r * 0.4, text: `+${ev.gained}`, size: 16 + ev.tier * 1.6, color: '#ffffff', life: 0.8, max: 0.8 });
      if (ev.tier >= 7) this.shake = Math.min(12, 3 + ev.tier);
    }
    if (ev.type === 'nova') {
      this.burst(x, y, '#ffffff', 60, 520);
      for (let i = 0; i < 6; i += 1) this.burst(x, y, COLORS[i * 2 % 10], 10, 380);
      this.rings.push({ x, y, r0: 20, r1: Math.max(this.w, this.h) * 0.6, life: 0.7, max: 0.7, color: '#ffffff' });
      this.flash = 0.6;
      this.shake = 16;
    }
    if (ev.type === 'clear') {
      for (const o of ev.orbs) this.burst(this.sx(o.x), this.sy(o.y), COLORS[o.tier], 8, 220);
      this.overFade = 0;
    }
  }

  burst(x, y, color, n, speed = 200) {
    for (let i = 0; i < n && this.particles.length < 800; i += 1) {
      const a = Math.random() * TAU;
      const v = speed * (0.3 + Math.random() * 0.8);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.45 + Math.random() * 0.45, max: 0.9, color, size: 2 + Math.random() * 4 });
    }
  }

  /** 통 가운데 큰 글씨 */
  shout(text, color = '#ffe14d') {
    this.texts.push({ x: this.sx(W / 2), y: this.sy(H * 0.36), text, size: Math.round(Math.min(56, 36 * this.k + 6)), color, life: 1.2, max: 1.2, shout: true });
  }

  /* ───────── 그리기 ───────── */

  draw(game, dt, { profileBest = 0 } = {}) {
    this.t += dt;
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, this.w, this.h);
    const g0 = ctx.createRadialGradient(this.w / 2, this.h * 0.3, 0, this.w / 2, this.h * 0.3, Math.max(this.w, this.h) * 0.7);
    g0.addColorStop(0, 'rgba(166, 107, 255, 0.10)');
    g0.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g0;
    ctx.fillRect(0, 0, this.w, this.h);

    this.shake = Math.max(0, this.shake - dt * 40);
    ctx.save();
    ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    this.drawJar(game);
    this.drawOrbs(game);
    this.drawHeld(game);
    ctx.restore();

    this.bestTier = Math.max(profileBest, game.best);
    this.drawNext(game);
    this.drawEvo(game);
    this.drawFx(dt);
  }

  drawJar(game) {
    const { ctx, k } = this;
    const x = this.jx;
    const y = this.jy;
    const jw = W * k;
    const jh = H * k;
    ctx.fillStyle = 'rgba(14, 20, 40, 0.75)';
    ctx.beginPath();
    ctx.roundRect(x - 6, y - 6, jw + 12, jh + 12, [8, 8, 22, 22]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110, 160, 255, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 6);
    ctx.lineTo(x - 6, y + jh - 16);
    ctx.quadraticCurveTo(x - 6, y + jh + 6, x + 16, y + jh + 6);
    ctx.lineTo(x + jw - 16, y + jh + 6);
    ctx.quadraticCurveTo(x + jw + 6, y + jh + 6, x + jw + 6, y + jh - 16);
    ctx.lineTo(x + jw + 6, y - 6);
    ctx.stroke();
    // 위험선
    const danger = game.danger / OVER_TIME;
    const ly = this.sy(DEAD_Y);
    const pulse = danger > 0 ? 0.5 + 0.5 * Math.sin(this.t * 18) : 0;
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2 + danger * 2;
    ctx.strokeStyle = danger > 0 ? `rgba(255, 79, 109, ${0.6 + pulse * 0.4})` : 'rgba(255, 79, 109, 0.35)';
    ctx.beginPath();
    ctx.moveTo(x, ly);
    ctx.lineTo(x + jw, ly);
    ctx.stroke();
    ctx.setLineDash([]);
    if (danger > 0) {
      ctx.fillStyle = `rgba(255, 79, 109, ${0.08 + danger * 0.18})`;
      ctx.fillRect(x, y, jw, ly - y);
    }
  }

  drawOrbs(game) {
    const lookX = game.ready ? this.sx(game.aimX) : null;
    if (game.over) this.overFade = Math.min(1, this.overFade + 0.03);
    for (const o of game.orbs) {
      this.drawOrb(o.tier, this.sx(o.x), this.sy(o.y), o.r * this.k, { id: o.id, lookX, gray: this.overFade * 0.8, base: RADII[o.tier] * this.k });
    }
  }

  drawHeld(game) {
    if (game.over) return;
    const { ctx } = this;
    const tier = game.current;
    const r = RADII[tier] * this.k;
    const x = this.sx(game.clampAim(game.aimX));
    const y = this.sy(DROP_Y);
    const grow = clamp(1 - game.cooldown / COOLDOWN, 0, 1);
    if (game.ready) {
      // 조준선: 처음 닿는 구슬이나 바닥까지
      let hitY = H;
      const wx = game.clampAim(game.aimX);
      for (const o of game.orbs) {
        const dx = Math.abs(o.x - wx);
        if (dx >= o.r + RADII[tier]) continue;
        hitY = Math.min(hitY, o.y - Math.sqrt((o.r + RADII[tier]) ** 2 - dx * dx));
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(x, y + r);
      ctx.lineTo(x, this.sy(Math.max(DROP_Y, hitY)) + r);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (grow > 0) this.drawOrb(tier, x, y, r * (0.4 + 0.6 * grow), { alpha: grow, id: 99, base: r });
  }

  drawNext(game) {
    const { ctx } = this;
    const b = this.nextBox;
    ctx.fillStyle = 'rgba(6, 10, 20, 0.7)';
    ctx.strokeStyle = 'rgba(110, 160, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size / 2 + 4, 0, TAU);
    ctx.fill();
    ctx.stroke();
    const r = (b.size / 2) * (0.45 + (0.55 * game.next) / 4);
    this.drawOrb(game.next, b.x, b.y, r, { id: 7 });
    ctx.font = '700 11px "Chakra Petch", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(232, 241, 255, 0.7)';
    if (b.labelLeft) {
      ctx.textAlign = 'right';
      ctx.fillText(this.nextLabel || 'NEXT', b.x - b.size / 2 - 10, b.y);
    } else ctx.fillText(this.nextLabel || 'NEXT', b.x, b.y + b.size / 2 + 14);
  }

  drawEvo(game) {
    const { ctx } = this;
    this.evo.forEach((e, i) => {
      const reached = i <= this.bestTier;
      if (reached) this.drawOrb(i, e.x, e.y, e.size, { face: false, alpha: i <= game.best ? 1 : 0.55 });
      else {
        ctx.fillStyle = 'rgba(120, 150, 220, 0.12)';
        ctx.strokeStyle = 'rgba(120, 150, 220, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(232, 241, 255, 0.35)';
        ctx.font = `700 ${Math.round(e.size)}px "Chakra Petch", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', e.x, e.y + 1);
      }
    });
  }

  drawFx(dt) {
    const { ctx } = this;
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      r.life -= dt;
      const a = clamp(r.life / r.max, 0, 1);
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * a + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r1 + (r.r0 - r.r1) * a, 0, TAU);
      ctx.stroke();
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      t.life -= dt;
      const a = clamp(t.life / 0.4, 0, 1);
      const rise = t.shout ? 0 : (t.max - t.life) * 50;
      const grow = t.shout ? 1 + Math.max(0, t.life - (t.max - 0.15)) * 3 : 1;
      ctx.globalAlpha = a;
      ctx.font = `700 ${Math.round(t.size * grow)}px "Chakra Petch", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(t.text, t.x, t.y - rise);
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = t.shout ? 18 : 6;
      ctx.fillText(t.text, t.x, t.y - rise);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    this.texts = this.texts.filter((t) => t.life > 0);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash})`;
      ctx.fillRect(0, 0, this.w, this.h);
      this.flash = Math.max(0, this.flash - dt * 1.5);
    }
  }
}

/** 색을 밝게(+)·어둡게(-) */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(clamp(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt, 0, 255));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}
