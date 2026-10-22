// NOVA BLOCKS 캔버스: 판, 블록 트레이, 끌기 미리보기, 효과. 배치 계산(layout)도 여기서 한다.
import { SIZE, idx, canPlace, linesAfter } from './logic.js';
import { SHAPE_BY_ID, COLORS, extent } from './pieces.js';
import { TAU, clamp } from './math.js';

const BG = '#070912';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprites = new Map();
    this.particles = [];
    this.texts = [];
    this.flashes = [];
    this.shake = 0;
    this.drag = null; // { i, x, y, offY, r, c, valid, lines }
    this.returning = []; // 놓지 못한 블록이 트레이로 돌아가는 애니메이션
    this.pop = new Map(); // 새로 놓인 칸 → 등장 애니메이션 시작 시각
    this.overFade = 0;
    this.t = 0;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    this.layout();
    this.sprites.clear();
  }

  /** 판과 트레이 위치. 세로 화면은 위아래, 가로 화면은 좌우로 둔다 */
  layout() {
    const { w, h } = this;
    const top = 92; // HUD
    const pad = 16;
    const landscape = w > h * 1.15;
    if (landscape) {
      const size = Math.min(h - top - pad * 2, w * 0.58);
      this.cell = Math.floor(size / SIZE);
      const board = this.cell * SIZE;
      const trayW = Math.min(w - board - pad * 3, board * 0.6);
      const total = board + pad * 2 + trayW;
      this.bx = Math.round((w - total) / 2);
      this.by = Math.round(top + (h - top - board) / 2 - 8);
      const sx = this.bx + board + pad * 2;
      const slotH = board / 3;
      this.slots = [0, 1, 2].map((i) => ({ x: sx, y: this.by + i * slotH, w: trayW, h: slotH }));
    } else {
      const trayH = Math.min(170, h * 0.2);
      const size = Math.min(w - pad * 2, h - top - trayH - pad * 3, 560);
      this.cell = Math.floor(size / SIZE);
      const board = this.cell * SIZE;
      this.bx = Math.round((w - board) / 2);
      this.by = Math.round(top + Math.max(0, (h - top - trayH - board - pad * 2) / 2));
      const ty = this.by + board + pad * 1.5;
      const slotW = Math.min(w - pad * 2, board + 40) / 3;
      const sx = (w - slotW * 3) / 2;
      this.slots = [0, 1, 2].map((i) => ({ x: sx + i * slotW, y: ty, w: slotW, h: trayH }));
    }
    this.trayCell = Math.min(this.cell * 0.56, Math.min(...this.slots.map((s) => Math.min(s.w, s.h))) / 5.4);
  }

  /** 화면 좌표의 트레이 칸 번호 */
  slotAt(x, y) {
    return this.slots.findIndex((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
  }

  /** 끄는 중인 블록의 왼쪽 위 칸 (판 좌표, 반올림) */
  snap(cells, x, y) {
    const { h, w } = extent(cells);
    const left = x - (w * this.cell) / 2;
    const topY = y - (h * this.cell) / 2;
    return { r: Math.round((topY - this.by) / this.cell), c: Math.round((left - this.bx) / this.cell) };
  }

  updateDrag(game, x, y) {
    const d = this.drag;
    if (!d) return;
    d.x = x;
    d.y = y;
    const cells = game.piece(d.i);
    const { r, c } = this.snap(cells, x, y - d.offY);
    d.r = r;
    d.c = c;
    d.valid = canPlace(game.cells, cells, r, c);
    d.lines = d.valid ? linesAfter(game.cells, cells, r, c) : null;
  }

  /** 칸 스프라이트: 색별로 한 번만 그린다 */
  cellSprite(color, size, ghost = false) {
    const key = `${color}|${size}|${ghost}`;
    let s = this.sprites.get(key);
    if (s) return s;
    const pad = Math.ceil(size * 0.35);
    const full = size + pad * 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil(full * this.dpr);
    c.height = Math.ceil(full * this.dpr);
    const g = c.getContext('2d');
    g.scale(this.dpr, this.dpr);
    const x = pad + size * 0.06;
    const y = pad + size * 0.06;
    const sz = size * 0.88;
    const rad = size * 0.18;
    const rr = () => { g.beginPath(); g.roundRect(x, y, sz, sz, rad); };
    if (!ghost) {
      g.shadowColor = color;
      g.shadowBlur = size * 0.35;
    }
    rr();
    const grad = g.createLinearGradient(x, y, x, y + sz);
    grad.addColorStop(0, ghost ? `${color}55` : color);
    grad.addColorStop(1, ghost ? `${color}33` : `${color}bb`);
    g.fillStyle = grad;
    g.fill();
    g.shadowBlur = 0;
    if (!ghost) {
      // 윗면 반사
      g.beginPath();
      g.roundRect(x + sz * 0.12, y + sz * 0.1, sz * 0.76, sz * 0.22, rad * 0.6);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fill();
    }
    rr();
    g.lineWidth = Math.max(1.5, size * 0.06);
    g.strokeStyle = ghost ? `${color}aa` : 'rgba(255,255,255,0.55)';
    g.stroke();
    s = { c, pad, full };
    this.sprites.set(key, s);
    return s;
  }

  drawCell(color, x, y, size, { ghost = false, scale = 1, alpha = 1 } = {}) {
    const s = this.cellSprite(color, size, ghost);
    const { ctx } = this;
    ctx.globalAlpha = alpha;
    const d = s.full * scale;
    ctx.drawImage(s.c, x + size / 2 - d / 2, y + size / 2 - d / 2, d, d);
    ctx.globalAlpha = 1;
  }

  /* ───────── 효과 ───────── */

  consume(game) {
    for (const ev of game.events) this.onEvent(ev);
    game.events.length = 0;
  }

  onEvent(ev) {
    if (ev.type === 'place') {
      const now = this.t;
      for (const [r, c] of ev.piece) this.pop.set(idx(ev.r + r, ev.c + c), now);
      ev.cleared.forEach((k, n) => {
        const r = Math.floor(k / SIZE);
        const c = k % SIZE;
        const color = COLORS[ev.colorsCleared[n]] || '#ffffff';
        this.burst(this.bx + (c + 0.5) * this.cell, this.by + (r + 0.5) * this.cell, color, 7);
      });
      for (const r of ev.rows) this.flashes.push({ x: this.bx, y: this.by + r * this.cell, w: this.cell * SIZE, h: this.cell, life: 0.35 });
      for (const c of ev.cols) this.flashes.push({ x: this.bx + c * this.cell, y: this.by, w: this.cell, h: this.cell * SIZE, life: 0.35 });
      const { h, w } = extent(ev.piece);
      const cx = this.bx + (ev.c + w / 2) * this.cell;
      const cy = this.by + (ev.r + h / 2) * this.cell;
      this.texts.push({ x: cx, y: cy, text: `+${ev.gained}`, size: ev.lines ? 30 : 20, color: ev.lines ? '#ffe14d' : '#ffffff', life: 0.9 });
      if (ev.lines) this.shake = Math.min(14, 3 + ev.lines * 3);
    }
    if (ev.type === 'revive') {
      for (const k of ev.cleared) this.burst(this.bx + ((k % SIZE) + 0.5) * this.cell, this.by + (Math.floor(k / SIZE) + 0.5) * this.cell, '#ffffff', 5);
      this.overFade = 0;
    }
  }

  burst(x, y, color, n) {
    for (let i = 0; i < n && this.particles.length < 700; i += 1) {
      const a = Math.random() * TAU;
      const v = 80 + Math.random() * 260;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 3 + Math.random() * 4 });
    }
  }

  /** 화면 가운데 큰 글씨 (콤보, 칭찬) */
  shout(text, color = '#ffe14d') {
    this.texts.push({ x: this.bx + (this.cell * SIZE) / 2, y: this.by + (this.cell * SIZE) * 0.42, text, size: Math.round(this.cell * 0.75), color, life: 1.1, shout: true });
  }

  /* ───────── 그리기 ───────── */

  draw(game, dt) {
    this.t += dt;
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, this.w, this.h);
    this.drawBackdrop();

    this.shake = Math.max(0, this.shake - dt * 40);
    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    ctx.save();
    ctx.translate(sx, sy);
    this.drawBoard(game);
    ctx.restore();

    this.drawTray(game);
    this.drawReturning(dt);
    this.drawDrag(game);
    this.drawFx(dt);
  }

  drawBackdrop() {
    const { ctx } = this;
    const g = ctx.createRadialGradient(this.w / 2, this.h * 0.35, 0, this.w / 2, this.h * 0.35, Math.max(this.w, this.h) * 0.7);
    g.addColorStop(0, 'rgba(61, 90, 255, 0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  drawBoard(game) {
    const { ctx, cell, bx, by } = this;
    const size = cell * SIZE;
    // 판 바탕
    ctx.fillStyle = 'rgba(14, 20, 40, 0.92)';
    ctx.strokeStyle = 'rgba(110, 160, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx - 6, by - 6, size + 12, size + 12, 14);
    ctx.fill();
    ctx.stroke();
    // 빈 칸
    ctx.fillStyle = 'rgba(120, 150, 220, 0.07)';
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        ctx.beginPath();
        ctx.roundRect(bx + c * cell + cell * 0.08, by + r * cell + cell * 0.08, cell * 0.84, cell * 0.84, cell * 0.14);
        ctx.fill();
      }
    }
    // 지워질 줄 강조
    const d = this.drag;
    const hl = d?.valid && d.lines ? d.lines : null;
    if (hl) {
      ctx.fillStyle = 'rgba(255, 225, 77, 0.16)';
      for (const r of hl.rows) ctx.fillRect(bx, by + r * cell, size, cell);
      for (const c of hl.cols) ctx.fillRect(bx + c * cell, by, cell, size);
    }
    // 놓인 칸
    const over = game.over;
    if (over) this.overFade = Math.min(1, this.overFade + 0.03);
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const v = game.cells[idx(r, c)];
        if (!v) continue;
        const k = idx(r, c);
        const born = this.pop.get(k);
        let scale = 1;
        if (born !== undefined) {
          const a = (this.t - born) / 0.18;
          if (a >= 1) this.pop.delete(k);
          else scale = 0.6 + 0.4 * (1 - (1 - a) ** 3) + Math.sin(a * Math.PI) * 0.08;
        }
        const inLine = hl && (hl.rows.includes(r) || hl.cols.includes(c));
        const color = over ? '#4a5470' : COLORS[v];
        this.drawCell(color, bx + c * cell, by + r * cell, cell, { scale: inLine ? 1.06 : scale, alpha: over ? 1 - this.overFade * 0.3 : 1 });
      }
    }
    // 놓일 자리 미리보기
    if (d?.valid) {
      const cells = game.piece(d.i);
      const color = COLORS[game.pieces[d.i].color];
      for (const [r, c] of cells) this.drawCell(color, bx + (d.c + c) * cell, by + (d.r + r) * cell, cell, { ghost: true });
    }
  }

  drawPiece(cells, color, cx, cy, size, alpha = 1) {
    const { h, w } = extent(cells);
    const x0 = cx - (w * size) / 2;
    const y0 = cy - (h * size) / 2;
    for (const [r, c] of cells) this.drawCell(color, x0 + c * size, y0 + r * size, size, { alpha });
  }

  drawTray(game) {
    const { ctx } = this;
    game.pieces.forEach((p, i) => {
      const s = this.slots[i];
      if (!p || this.drag?.i === i || this.returning.some((rt) => rt.i === i)) return;
      const cells = SHAPE_BY_ID[p.id].cells;
      const fits = game.canFitIndex(i);
      const bob = Math.sin(this.t * 2 + i) * 2;
      this.drawPiece(cells, fits ? COLORS[p.color] : '#4a5470', s.x + s.w / 2, s.y + s.h / 2 + bob, this.trayCell, fits ? 1 : 0.55);
    });
    void ctx;
  }

  drawDrag(game) {
    const d = this.drag;
    if (!d) return;
    const p = game.pieces[d.i];
    if (!p) return;
    this.drawPiece(SHAPE_BY_ID[p.id].cells, COLORS[p.color], d.x, d.y - d.offY, this.cell * 0.92, 0.95);
  }

  /** 놓지 못한 블록을 트레이로 돌려보낸다 */
  sendBack(game, i, x, y) {
    const p = game.pieces[i];
    if (!p) return;
    this.returning.push({ i, id: p.id, color: p.color, x, y, t: 0 });
  }

  drawReturning(dt) {
    for (const rt of this.returning) {
      rt.t += dt / 0.18;
      const s = this.slots[rt.i];
      const a = Math.min(1, rt.t);
      const e = 1 - (1 - a) ** 3;
      const x = rt.x + (s.x + s.w / 2 - rt.x) * e;
      const y = rt.y + (s.y + s.h / 2 - rt.y) * e;
      const size = this.cell * 0.92 + (this.trayCell - this.cell * 0.92) * e;
      this.drawPiece(SHAPE_BY_ID[rt.id].cells, COLORS[rt.color], x, y, size);
    }
    this.returning = this.returning.filter((rt) => rt.t < 1);
  }

  drawFx(dt) {
    const { ctx } = this;
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.flashes) {
      f.life -= dt;
      ctx.globalAlpha = clamp(f.life / 0.35, 0, 1) * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(f.x, f.y, f.w, f.h);
    }
    this.flashes = this.flashes.filter((f) => f.life > 0);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 600 * dt;
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
      const a = clamp(t.life / 0.5, 0, 1);
      const rise = t.shout ? 0 : (1 - t.life) * 40;
      const grow = t.shout ? 1 + Math.max(0, t.life - 0.9) * 2 : 1;
      ctx.globalAlpha = a;
      ctx.font = `700 ${Math.round(t.size * grow)}px "Chakra Petch", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(t.text, t.x, t.y - rise);
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = t.shout ? 18 : 8;
      ctx.fillText(t.text, t.x, t.y - rise);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    this.texts = this.texts.filter((t) => t.life > 0);
  }
}
