// 적 탄막 패턴. 탄을 game.bullets에 넣기만 한다 (그리기·판정은 game.js·render.js).
// 탄 필드: x y vx vy r dmg life color kind(orb|rice|star) accel(속도 변화 px/s²) turn(회전 rad/s) delay(예고 시간, 그동안은 무해) maxSpeed
import { TAU } from './math.js';

export const MAX_BULLETS = 520;

function push(g, b) {
  if (g.bullets.length >= MAX_BULLETS) return;
  g.bullets.push({ kind: 'orb', r: 7, life: 6, accel: 0, turn: 0, delay: 0, grazed: false, ...b });
}

const aimAt = (g, src) => Math.atan2(g.player.y - src.y, g.player.x - src.x);

function shoot(g, src, a, speed, o) {
  push(g, {
    x: src.x + Math.cos(a) * (o.from || 0), y: src.y + Math.sin(a) * (o.from || 0),
    vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
    r: o.r ?? 7, dmg: o.dmg, color: o.color || src.color, kind: o.kind || 'orb',
    accel: o.accel || 0, turn: o.turn || 0, delay: o.delay || 0, maxSpeed: o.maxSpeed, life: o.life || 6,
  });
}

/**
 * 패턴 하나를 쏜다. src: 쏘는 적 {x,y,color,state}, o: 패턴 값. st: 패턴별 상태(회전 각 등)
 * 모든 패턴은 빈틈을 남긴다: 링은 탄 사이가 넓고, 부채꼴은 옆이 비고, 나선은 회전 사이가 빈다.
 */
export function fire(g, src, o, st = {}) {
  const dmg = o.dmg ?? 10;
  const base = { ...o, dmg };
  switch (o.pattern) {
    case 'aimed': { // 플레이어를 노린 연속 탄 (n발을 같은 방향으로, 속도만 조금씩 다르게)
      const a = aimAt(g, src);
      for (let i = 0; i < (o.n || 1); i += 1) shoot(g, src, a, o.speed * (1 + i * 0.12), base);
      break;
    }
    case 'fan': { // 플레이어를 향한 부채꼴
      const a = aimAt(g, src) + (o.offset || 0);
      const n = o.n || 3;
      for (let i = 0; i < n; i += 1) shoot(g, src, a + (n > 1 ? (i / (n - 1) - 0.5) * o.spread : 0), o.speed, base);
      break;
    }
    case 'ring': { // 원형. 매번 반 칸씩 돌려 같은 자리에 서 있으면 맞게 한다
      st.flip = !st.flip;
      const n = o.n || 12;
      const off = (o.aim ? aimAt(g, src) + Math.PI / n : 0) + (st.flip ? Math.PI / n : 0) + (o.offset || 0);
      for (let i = 0; i < n; i += 1) shoot(g, src, off + (i / n) * TAU, o.speed, base);
      break;
    }
    case 'spiral': { // 회전하는 팔 (짧은 간격으로 계속 부른다)
      st.angle = (st.angle ?? g.rng() * TAU) + (o.step || 0.32) * (st.dir || 1);
      if (o.reverse && (st.count = (st.count || 0) + 1) % o.reverse === 0) st.dir = -(st.dir || 1);
      const arms = o.arms || 2;
      for (let i = 0; i < arms; i += 1) shoot(g, src, st.angle + (i / arms) * TAU, o.speed, base);
      break;
    }
    case 'flower': { // 휘어 나가는 꽃잎: 같은 각도에서 시계·반시계로 휘는 탄을 함께 쏜다
      const n = o.n || 8;
      st.angle = (st.angle ?? 0) + Math.PI / n;
      for (let i = 0; i < n; i += 1) {
        const a = st.angle + (i / n) * TAU;
        shoot(g, src, a, o.speed, { ...base, turn: o.curve });
        shoot(g, src, a, o.speed, { ...base, turn: -o.curve });
      }
      break;
    }
    case 'bloom': { // 천천히 퍼지다 가속하는 링 (처음엔 촘촘해 보이지만 피할 틈이 벌어진다)
      const n = o.n || 16;
      const off = g.rng() * TAU;
      for (let i = 0; i < n; i += 1) shoot(g, src, off + (i / n) * TAU, o.speed, { ...base, accel: o.accel, maxSpeed: o.maxSpeed });
      break;
    }
    case 'wall': { // 화면 밖 한쪽에서 밀려오는 탄의 벽. 가운데쯤 한 곳이 뚫려 있다
      const p = g.player;
      const side = g.rng() * TAU;
      const nx = Math.cos(side);
      const ny = Math.sin(side);
      const d = Math.min(g.viewR, 620) * 0.95;
      const n = o.n || 22;
      const gap = Math.floor(n * (0.3 + g.rng() * 0.4));
      for (let i = 0; i < n; i += 1) {
        if (Math.abs(i - gap) <= 1) continue;
        const off = (i - (n - 1) / 2) * (o.space || 34);
        push(g, {
          x: p.x + nx * d - ny * off, y: p.y + ny * d + nx * off, vx: -nx * o.speed, vy: -ny * o.speed,
          r: o.r ?? 8, dmg, color: o.color || src.color, kind: 'rice', delay: o.delay ?? 0.6, life: (d * 2) / o.speed + 0.8,
        });
      }
      break;
    }
    default:
  }
  g.emitSfx(o.sfx || 'bossfire');
}

/** 탄 이동 (가속·회전·예고). 예고 중인 탄은 움직이지 않는다 */
export function moveBullet(b, dt) {
  if (b.delay > 0) { b.delay -= dt; return; }
  b.life -= dt;
  if (b.turn) {
    const c = Math.cos(b.turn * dt);
    const s = Math.sin(b.turn * dt);
    const vx = b.vx * c - b.vy * s;
    b.vy = b.vx * s + b.vy * c;
    b.vx = vx;
  }
  if (b.accel) {
    const sp = Math.hypot(b.vx, b.vy) || 1;
    const next = Math.max(20, Math.min(b.maxSpeed || 400, sp + b.accel * dt));
    b.vx *= next / sp;
    b.vy *= next / sp;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
}
