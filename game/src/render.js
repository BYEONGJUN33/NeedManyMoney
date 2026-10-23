// Canvas 렌더러. 게임 상태를 읽어 그리기만 한다. 빛번짐은 미리 그린 스프라이트로 처리해 빠르게 그린다.
import { WEAPONS, EVOLVED, HITBOX, GRAZE_RANGE } from './data.js';
import { TAU, clamp } from './math.js';

const BG = '#06080f';

function makeCanvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  return c;
}

function shapePath(ctx, shape, r) {
  ctx.beginPath();
  switch (shape) {
    case 'circle': ctx.arc(0, 0, r, 0, TAU); break;
    case 'triangle': for (let i = 0; i < 3; i += 1) { const a = -Math.PI / 2 + (i / 3) * TAU; ctx.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15); } break;
    case 'square': ctx.rect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7); break;
    case 'diamond': ctx.moveTo(0, -r * 1.2); ctx.lineTo(r, 0); ctx.lineTo(0, r * 1.2); ctx.lineTo(-r, 0); break;
    case 'hex': for (let i = 0; i < 6; i += 1) { const a = (i / 6) * TAU; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } break;
    case 'star': for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + (i / 10) * TAU; const rr = i % 2 ? r * 0.5 : r * 1.2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } break;
    case 'octo': for (let i = 0; i < 8; i += 1) { const a = Math.PI / 8 + (i / 8) * TAU; ctx.lineTo(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05); } break;
    default: ctx.arc(0, 0, r, 0, TAU);
  }
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.sprites = new Map();
    this.particles = [];
    this.texts = [];
    this.flashes = [];
    this.arcs = [];
    this.cam = { x: 0, y: 0 };
    this.shake = 0;
    this.shakeOn = true;
    this.quality = 1; // 1 = 높음, 0 = 낮음 (프레임이 떨어지면 자동으로 낮춘다)
    this.font = '"Chakra Petch", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    this.resize();
  }

  resize() {
    // 휴대폰은 높은 품질에서도 1.5배까지만 (2배와 화질 차이는 작고 채우는 픽셀은 1.8배)
    const coarse = globalThis.matchMedia?.('(pointer: coarse)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality ? (coarse ? 1.5 : 2) : 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    // 화면이 작은 휴대폰에서는 조금 멀리서 보이게 한다
    this.zoom = clamp(Math.min(w, h) / 720, 0.62, 1);
  }

  get viewRadius() { return Math.hypot(this.w, this.h) / 2 / this.zoom; }

  /** 빛번짐이 들어간 도형 스프라이트 (색·크기별로 한 번만 만든다) */
  sprite(shape, color, r, { outline = null, white = false } = {}) {
    const lo = this.quality === 0;
    const key = `${shape}|${color}|${Math.round(r)}|${outline}|${white}|${lo}`;
    let s = this.sprites.get(key);
    if (s) return s;
    // 낮은 품질은 빛번짐 없이 작게 만들어 채우는 픽셀을 크게 줄인다
    const pad = lo ? 4 : Math.ceil(r * 0.9 + 10);
    const size = Math.ceil(r * 2.6 + pad * 2);
    const c = makeCanvas(size, size);
    const g = c.getContext('2d');
    g.translate(size / 2, size / 2);
    g.shadowColor = white ? '#ffffff' : color;
    g.shadowBlur = lo ? 0 : r * 0.9 + 6;
    shapePath(g, shape, r);
    g.fillStyle = white ? '#ffffff' : color;
    g.globalAlpha = 0.35;
    g.fill();
    g.globalAlpha = 1;
    g.lineWidth = Math.max(2, r * 0.18);
    g.strokeStyle = white ? '#ffffff' : color;
    g.stroke();
    g.shadowBlur = 0;
    shapePath(g, shape, r * 0.45);
    g.fillStyle = white ? '#ffffff' : color;
    g.fill();
    if (outline) {
      shapePath(g, shape, r + 4);
      g.lineWidth = 2;
      g.strokeStyle = outline;
      g.stroke();
    }
    s = { c, half: size / 2 };
    this.sprites.set(key, s);
    return s;
  }

  glow(color, r) {
    const key = `glow|${color}|${Math.round(r)}`;
    let s = this.sprites.get(key);
    if (s) return s;
    const size = Math.ceil(r * 2);
    const c = makeCanvas(size, size);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, `${color}88`);
    grad.addColorStop(1, `${color}00`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    s = { c, half: r };
    this.sprites.set(key, s);
    return s;
  }

  /** 적 탄 스프라이트: 색 테두리 + 흰 심 (겹쳐도 한 알씩 보이게 덧칠하지 않고 그린다) */
  bulletSprite(kind, color, r) {
    const lo = this.quality === 0;
    const key = `b|${kind}|${color}|${Math.round(r)}|${lo}`;
    let s = this.sprites.get(key);
    if (s) return s;
    const reach = (kind === 'rice' ? r * 1.7 : kind === 'star' ? r * 1.35 : r) * 1.18;
    const pad = lo ? 3 : Math.ceil(r * 1.2 + 4);
    const size = Math.ceil(reach * 2 + pad * 2);
    const c = makeCanvas(size, size);
    const g = c.getContext('2d');
    g.translate(size / 2, size / 2);
    const body = (k) => {
      g.beginPath();
      if (kind === 'rice') g.ellipse(0, 0, r * 1.7 * k, r * 0.8 * k, 0, 0, TAU);
      else if (kind === 'star') shapePath(g, 'star', r * 1.1 * k);
      else g.arc(0, 0, r * k, 0, TAU);
    };
    if (!lo) {
      g.shadowColor = color;
      g.shadowBlur = r * 1.4 + 4;
    }
    // 어두운 테두리 → 진한 색 몸통 → 흰 심. 밝은 적·보석 위에서도 탄 모양이 떨어져 보인다
    body(1.18);
    g.fillStyle = 'rgba(6, 8, 15, 0.85)';
    g.fill();
    g.shadowBlur = 0;
    body(1);
    g.fillStyle = color;
    g.fill();
    body(0.5);
    g.fillStyle = '#ffffff';
    g.fill();
    s = { c, half: size / 2 };
    this.sprites.set(key, s);
    return s;
  }

  /* ───────────── 효과 ───────────── */

  consume(game) {
    for (const ev of game.fx) this.onFx(ev, game);
    game.fx.length = 0;
  }

  onFx(ev, game) {
    const q = this.quality;
    switch (ev.type) {
      case 'dmg':
        if (this.texts.length < (q ? 70 : 30)) this.texts.push({ x: ev.x + (Math.random() - 0.5) * 10, y: ev.y, n: ev.n, crit: ev.crit, life: 0.6, vy: -50 });
        this.burst(ev.x, ev.y, ev.color || '#ffffff', q ? 2 : 1, 120, 0.25, 2);
        break;
      case 'die':
        this.burst(ev.x, ev.y, ev.color, ev.boss ? 80 : (q ? 9 : 4), ev.boss ? 420 : 200, ev.boss ? 1.1 : 0.45, ev.boss ? 5 : 3);
        if (ev.boss) { this.flashes.push({ x: ev.x, y: ev.y, r: 400, life: 0.6, max: 0.6, color: ev.color }); this.addShake(18); }
        break;
      case 'boom':
        this.flashes.push({ x: ev.x, y: ev.y, r: ev.r, life: 0.3, max: 0.3, color: ev.color });
        this.burst(ev.x, ev.y, ev.color, q ? 14 : 6, 260, 0.4, 3);
        this.addShake(3);
        break;
      case 'nova':
        this.flashes.push({ x: ev.x, y: ev.y, r: ev.r, life: 0.5, max: 0.5, color: ev.color, ring: true });
        this.addShake(12);
        break;
      case 'arc':
        this.arcs.push({ pts: ev.pts.map((p) => ({ x: p.x, y: p.y })), life: 0.16, max: 0.16, color: ev.color });
        break;
      case 'hurt':
        this.addShake(7);
        this.burst(ev.x, ev.y, '#ff3d5a', 8, 220, 0.35, 3);
        this.hurtFlash = 0.25;
        break;
      case 'heal':
        this.texts.push({ x: ev.x, y: ev.y - 20, n: `+${ev.n}`, heal: true, life: 0.8, vy: -40 });
        break;
      case 'graze':
        if (this.particles.length < (q ? 700 : 250)) {
          // 플레이어 쪽에서 탄 쪽으로 튀는 작은 불꽃
          const a = Math.atan2(ev.y - ev.py, ev.x - ev.px);
          for (let i = 0; i < (q ? 3 : 1); i += 1) {
            const aa = a + (Math.random() - 0.5) * 1.2;
            const v = 160 + Math.random() * 140;
            this.particles.push({ x: (ev.x + ev.px) / 2, y: (ev.y + ev.py) / 2, vx: Math.cos(aa) * v, vy: Math.sin(aa) * v, life: 0.22, max: 0.22, color: '#e8fdff', size: 2.2 });
          }
        }
        this.grazeGlow = 0.18;
        break;
      case 'cancel':
        for (const pt of ev.pts) {
          if (this.particles.length >= (q ? 900 : 350)) break;
          this.particles.push({ x: pt.x, y: pt.y, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 60, life: 0.5, max: 0.5, color: pt.color, size: 3 });
          if (q) this.particles.push({ x: pt.x, y: pt.y, vx: 0, vy: 0, life: 0.25, max: 0.25, color: '#ffffff', size: 6 });
        }
        break;
      case 'burst':
        this.flashes.push({ x: ev.x, y: ev.y, r: ev.r * 1.6, life: 0.6, max: 0.6, color: '#9ffcff', ring: true });
        this.flashes.push({ x: ev.x, y: ev.y, r: ev.r, life: 0.45, max: 0.45, color: '#ffffff', ring: true });
        this.flashes.push({ x: ev.x, y: ev.y, r: ev.r * 0.8, life: 0.4, max: 0.4, color: '#3df2ff' });
        this.burst(ev.x, ev.y, '#e8fdff', q ? 70 : 24, 520, 0.7, 3.5);
        this.screenFlash = 0.35;
        this.addShake(14);
        break;
      case 'phase':
        this.flashes.push({ x: ev.x, y: ev.y, r: 520, life: 0.8, max: 0.8, color: ev.color, ring: true });
        this.flashes.push({ x: ev.x, y: ev.y, r: ev.r * 3, life: 0.5, max: 0.5, color: '#ffffff' });
        this.burst(ev.x, ev.y, ev.color, q ? 50 : 18, 380, 0.8, 4);
        this.screenFlash = 0.2;
        this.addShake(12);
        break;
      case 'evolve':
        this.flashes.push({ x: ev.x, y: ev.y, r: 300, life: 0.8, max: 0.8, color: '#ffffff', ring: true });
        this.burst(ev.x, ev.y, '#fff3a3', 60, 380, 1, 4);
        this.addShake(10);
        break;
      default:
    }
    void game;
  }

  burst(x, y, color, n, speed, life, size) {
    const cap = this.quality ? 900 : 350;
    for (let i = 0; i < n && this.particles.length < cap; i += 1) {
      const a = Math.random() * TAU;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), max: life, color, size: size * (0.6 + Math.random() * 0.8) });
    }
  }

  addShake(n) { if (this.shakeOn) this.shake = Math.min(24, this.shake + n); }

  /* ───────────── 그리기 ───────────── */

  /** @param {boolean} frozen 일시정지·레벨업 등 멈춘 화면: 흔들림·붉은빛 없이 그대로 그린다 */
  draw(game, dt, frozen = false) {
    const { ctx } = this;
    const p = game.player;
    if (frozen) { this.shake = 0; this.hurtFlash = 0; this.screenFlash = 0; }
    this.cam.x += (p.x - this.cam.x) * Math.min(1, dt * 10);
    this.cam.y += (p.y - this.cam.y) * Math.min(1, dt * 10);
    this.shake = Math.max(0, this.shake - dt * 40);
    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = game.sm?.bg || BG;
    ctx.fillRect(0, 0, this.w, this.h);

    const z = this.zoom;
    const ox = this.w / 2 - this.cam.x * z + sx;
    const oy = this.h / 2 - this.cam.y * z + sy;
    this.drawGrid(ox, oy, z, game.sm);
    ctx.setTransform(this.dpr * z, 0, 0, this.dpr * z, ox * this.dpr, oy * this.dpr);

    const vw = this.w / z / 2 + 80;
    const vh = this.h / z / 2 + 80;
    const inView = (x, y) => Math.abs(x - this.cam.x) < vw && Math.abs(y - this.cam.y) < vh;

    // 보석·아이템
    for (const g of game.gems) {
      if (!inView(g.x, g.y)) continue;
      const big = g.value >= 5;
      const tiny = g.value < 1; // 지운 탄에서 나온 보석
      const s = this.sprite('diamond', big ? '#3dd8ff' : tiny ? '#c8fbff' : '#7dff6a', big ? 7 : tiny ? 3 : 4.5);
      ctx.drawImage(s.c, g.x - s.half, g.y - s.half);
    }
    for (const it of game.items) {
      if (!inView(it.x, it.y)) continue;
      this.drawItem(it, game.t);
    }

    // 무기: 오라
    for (const w of game.build.weapons) {
      const st = game.weaponState.get(w.id);
      if (!st) continue;
      const color = w.evolved ? EVOLVED[w.evolved].color : WEAPONS[w.id].color;
      if (w.id === 'aura' && st.radius) {
        ctx.globalCompositeOperation = 'lighter';
        const pulse = 1 + Math.sin(game.t * 6) * 0.03;
        const gl = this.glow(color, 64);
        ctx.globalAlpha = 0.28;
        ctx.drawImage(gl.c, p.x - st.radius * pulse, p.y - st.radius * pulse, st.radius * 2 * pulse, st.radius * 2 * pulse);
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, st.radius * pulse, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // 충격파
    ctx.globalCompositeOperation = 'lighter';
    for (const r of game.rings) {
      ctx.globalAlpha = clamp(1 - r.r / r.max, 0, 1) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // 적
    for (const e of game.enemies) {
      if (!inView(e.x, e.y)) continue;
      if (e.boss) { this.drawBoss(e, game.t); continue; }
      const s = this.sprite(e.shape, e.color, e.r, { outline: e.elite ? '#ffd23d' : null, white: e.flash > 0 });
      const turn = e.shape === 'triangle' || e.shape === 'star';
      if (!turn && e.state !== 1) { ctx.drawImage(s.c, e.x - s.half, e.y - s.half); continue; }
      ctx.save();
      ctx.translate(e.x, e.y);
      if (turn) ctx.rotate(Math.atan2(p.y - e.y, p.x - e.x) + Math.PI / 2);
      if (e.state === 1) ctx.scale(1.25, 1.25); // 돌진 예고
      ctx.drawImage(s.c, -s.half, -s.half);
      ctx.restore();
    }

    // 플레이어 공격
    ctx.globalCompositeOperation = 'lighter';
    for (const s of game.shots) {
      if (!inView(s.x, s.y)) continue;
      if (s.kind === 'missile') {
        const sp = this.sprite('triangle', s.color, 6);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(Math.atan2(s.vy, s.vx) + Math.PI / 2);
        ctx.drawImage(sp.c, -sp.half, -sp.half);
        ctx.restore();
        if (this.quality && Math.random() < 0.6) this.particles.push({ x: s.x, y: s.y, vx: -s.vx * 0.1, vy: -s.vy * 0.1, life: 0.3, max: 0.3, color: s.color, size: 2.5 });
      } else {
        const gl = this.glow(s.color, 16);
        const rr = s.r * 2.4;
        ctx.drawImage(gl.c, s.x - rr, s.y - rr, rr * 2, rr * 2);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 0.55, 0, TAU);
        ctx.fill();
      }
    }
    for (const b of game.beams) {
      const a = b.life / b.max;
      ctx.globalAlpha = a;
      ctx.strokeStyle = b.color;
      ctx.lineCap = 'round';
      ctx.lineWidth = b.width * (0.6 + a * 0.6);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.ex, b.ey);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = b.width * 0.3;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const arc of this.arcs) {
      ctx.globalAlpha = arc.life / arc.max;
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < arc.pts.length; i += 1) {
        const pt = arc.pts[i];
        if (i === 0) { ctx.moveTo(pt.x, pt.y); continue; }
        const prev = arc.pts[i - 1];
        // 지그재그 번개
        for (let k = 1; k <= 3; k += 1) {
          const t = k / 4;
          ctx.lineTo(prev.x + (pt.x - prev.x) * t + (Math.random() - 0.5) * 18, prev.y + (pt.y - prev.y) * t + (Math.random() - 0.5) * 18);
        }
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 회전 칼날·드론
    for (const w of game.build.weapons) {
      const st = game.weaponState.get(w.id);
      if (!st) continue;
      const color = w.evolved ? EVOLVED[w.evolved].color : WEAPONS[w.id].color;
      if (w.id === 'orbit' && st.blades) {
        const sp = this.sprite('diamond', color, w.evolved ? 13 : 9 * game.stats.area);
        for (const b of st.blades) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.a * 3);
          ctx.drawImage(sp.c, -sp.half, -sp.half);
          ctx.restore();
        }
      }
      if (w.id === 'drone') {
        const sp = this.sprite('triangle', color, 7);
        for (const d of st.drones) if (d.x !== undefined) ctx.drawImage(sp.c, d.x - sp.half, d.y - sp.half);
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // 플레이어
    this.drawPlayer(game);

    ctx.globalCompositeOperation = 'lighter';
    // 파티클·섬광
    for (const f of this.flashes) {
      const a = f.life / f.max;
      if (f.ring) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 10 * a + 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * (1 - a * 0.7), 0, TAU);
        ctx.stroke();
      } else {
        const gl = this.glow(f.color, 64);
        ctx.globalAlpha = a * 0.8;
        const rr = f.r * (1.2 - a * 0.4);
        ctx.drawImage(gl.c, f.x - rr, f.y - rr, rr * 2, rr * 2);
      }
    }
    for (const pt of this.particles) {
      ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // 적 탄 (파티클 위에 그려 항상 보이게): 예고(아직 무해) → 고리만, 날아가는 탄 → 스프라이트. 가장 가까운 탄 거리로 판정점을 보여 준다
    let nearest = Infinity;
    for (const b of game.bullets) {
      if (!inView(b.x, b.y)) continue;
      if (b.delay > 0) {
        ctx.globalAlpha = 0.65;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * (1 + b.delay * 5), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      const d2 = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
      if (d2 < nearest) nearest = d2;
      const sp = this.bulletSprite(b.kind, b.color, b.r);
      if (b.kind === 'orb') { ctx.drawImage(sp.c, b.x - sp.half, b.y - sp.half); continue; }
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.kind === 'rice' ? Math.atan2(b.vy, b.vx) : game.t * 5);
      ctx.drawImage(sp.c, -sp.half, -sp.half);
      ctx.restore();
    }
    if (nearest < 150 * 150 && game.state !== 'dead') this.drawHitbox(game, Math.sqrt(nearest));

    // 피해 숫자: 휴대폰처럼 화면을 줄여 보여도 읽히도록 글자를 줌만큼 키운다
    ctx.textAlign = 'center';
    const fs = 1 / Math.max(this.zoom, 0.75);
    for (const big of [false, true]) {
      ctx.font = `700 ${Math.round((big ? 20 : 14) * fs)}px ${this.font}`;
      for (const t of this.texts) {
        if (!!t.crit !== big) continue;
        ctx.globalAlpha = clamp(t.life / 0.4, 0, 1);
        ctx.fillStyle = t.heal ? '#7dff6a' : t.crit ? '#ffe14d' : '#ffffff';
        ctx.fillText(String(t.n), t.x, t.y);
      }
    }
    ctx.globalAlpha = 1;

    // 화면 고정 요소
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (game.boss && !game.boss.dead) this.drawBossPointer(game.boss, z);
    this.drawVignette(game);
    if (!frozen) this.step(dt);
  }

  step(dt) {
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.92;
      pt.vy *= 0.92;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y += t.vy * dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const f of this.flashes) f.life -= dt;
    this.flashes = this.flashes.filter((f) => f.life > 0);
    for (const a of this.arcs) a.life -= dt;
    this.arcs = this.arcs.filter((a) => a.life > 0);
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.screenFlash > 0) this.screenFlash -= dt;
    if (this.grazeGlow > 0) this.grazeGlow -= dt;
  }

  /** 탄이 가까울 때 실제 판정점(흰 점)과 스침 고리를 보여 준다 */
  drawHitbox(game, near) {
    const { ctx } = this;
    const p = game.player;
    const hr = p.r * HITBOX;
    const close = clamp(1 - (near - 30) / 120, 0, 1);
    ctx.globalAlpha = 0.25 * close + (this.grazeGlow > 0 ? 0.35 : 0);
    ctx.strokeStyle = '#e8fdff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, hr + 6 + GRAZE_RANGE, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.6 + close * 0.4;
    ctx.fillStyle = '#06080f';
    ctx.beginPath();
    ctx.arc(p.x, p.y, hr + 2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, hr, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawGrid(ox, oy, z, sm) {
    const { ctx } = this;
    const [r, g, b] = sm?.grid || [80, 120, 200];
    const step = 64 * z;
    const x0 = ((ox % step) + step) % step;
    const y0 = ((oy % step) + step) % step;
    const cx = Math.floor(-ox / step);
    const cy = Math.floor(-oy / step);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0, i = 0; x < this.w; x += step, i += 1) { if ((cx + i) % 4) { ctx.moveTo(x, 0); ctx.lineTo(x, this.h); } }
    for (let y = y0, i = 0; y < this.h; y += step, i += 1) { if ((cy + i) % 4) { ctx.moveTo(0, y); ctx.lineTo(this.w, y); } }
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.07)`;
    ctx.stroke();
    ctx.beginPath();
    for (let x = x0, i = 0; x < this.w; x += step, i += 1) { if (!((cx + i) % 4)) { ctx.moveTo(x, 0); ctx.lineTo(x, this.h); } }
    for (let y = y0, i = 0; y < this.h; y += step, i += 1) { if (!((cy + i) % 4)) { ctx.moveTo(0, y); ctx.lineTo(this.w, y); } }
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.13)`;
    ctx.stroke();
  }

  drawItem(it, t) {
    const { ctx } = this;
    const bob = Math.sin(t * 4 + it.x) * 2;
    const map = {
      coin: ['hex', '#ffd23d', 6],
      heart: ['circle', '#ff4f6d', 8],
      magnet: ['square', '#3df2ff', 7],
      bomb: ['star', '#ff8a3d', 9],
      chest: ['square', '#ffd23d', 14],
    };
    const [shape, color, r] = map[it.kind];
    const s = this.sprite(shape, color, r);
    ctx.drawImage(s.c, it.x - s.half, it.y - s.half + bob);
    if (it.kind === 'chest') {
      ctx.globalCompositeOperation = 'lighter';
      const gl = this.glow('#ffd23d', 40);
      ctx.globalAlpha = 0.5 + Math.sin(t * 5) * 0.2;
      ctx.drawImage(gl.c, it.x - 40, it.y - 40 + bob);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  drawPlayer(game) {
    const { ctx } = this;
    const p = game.player;
    const color = game.characterColor || '#3df2ff';
    const blink = p.iframes > 0 && Math.floor(p.iframes * 20) % 2 === 0;
    ctx.globalCompositeOperation = 'lighter';
    const gl = this.glow(color, 48);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(gl.c, p.x - 48, p.y - 48);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (!blink) {
      const s = this.sprite('circle', color, p.r);
      ctx.drawImage(s.c, p.x - s.half, p.y - s.half);
      // 바라보는 방향 표시
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x + p.fx * (p.r + 5), p.y + p.fy * (p.r + 5), 3, 0, TAU);
      ctx.fill();
    }
    // 체력 막대
    const ratio = p.hp / game.stats.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(p.x - 20, p.y + p.r + 8, 40, 5);
    ctx.fillStyle = ratio > 0.5 ? '#7dff6a' : ratio > 0.25 ? '#ffd23d' : '#ff3d5a';
    ctx.fillRect(p.x - 20, p.y + p.r + 8, 40 * ratio, 5);
  }

  drawBoss(e, t) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.globalCompositeOperation = 'lighter';
    const gl = this.glow(e.color, 96);
    ctx.globalAlpha = 0.45;
    ctx.drawImage(gl.c, -e.r * 2, -e.r * 2, e.r * 4, e.r * 4);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const spin = 0.8 + (e.phase || 0) * 0.6; // 단계가 오를수록 빨리 돈다
    ctx.rotate(t * spin);
    const s = this.sprite(e.type === 'warden' ? 'hex' : 'star', e.color, e.r, { white: e.flash > 0 || e.shield > 0 });
    ctx.drawImage(s.c, -s.half, -s.half);
    ctx.rotate(-t * spin * 2.5);
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 1.35, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    if (e.shield > 0) {
      // 단계 전환 중 무적: 흰 보호막
      ctx.globalAlpha = 0.45 + Math.sin(t * 30) * 0.25;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      shapePath(ctx, 'hex', e.r * 1.6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawBossPointer(boss, z) {
    const { ctx } = this;
    const dx = (boss.x - this.cam.x) * z;
    const dy = (boss.y - this.cam.y) * z;
    if (Math.abs(dx) < this.w / 2 - 20 && Math.abs(dy) < this.h / 2 - 20) return;
    const a = Math.atan2(dy, dx);
    const r = Math.min(this.w, this.h) / 2 - 36;
    const x = this.w / 2 + Math.cos(a) * r;
    const y = this.h / 2 + Math.sin(a) * r;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = boss.color;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawVignette(game) {
    const { ctx } = this;
    if (this.screenFlash > 0) {
      ctx.fillStyle = `rgba(220, 252, 255, ${Math.min(0.5, this.screenFlash)})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    const low = game.player.hp / game.stats.maxHp < 0.3;
    const hurt = this.hurtFlash > 0 ? this.hurtFlash / 0.25 : 0;
    // 낮은 품질에서는 전체 화면 그라디언트를 피격·위험할 때만 그린다
    if (!this.quality && !low && !hurt) return;
    const grad = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    const red = Math.max(hurt * 0.45, low ? 0.25 + Math.sin(game.t * 6) * 0.1 : 0);
    grad.addColorStop(1, red > 0 ? `rgba(255, 30, 60, ${red})` : 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.w, this.h);
  }
}
