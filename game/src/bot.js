// 자동 플레이 봇: 위협을 피하고 보석을 줍는 단순한 정책. 난이도 측정용.
import { Game } from './game.js';
import { len } from './math.js';

const PASSIVE_PRIORITY = { haste: 35, might: 34, area: 30, vitality: 28, crit: 25, armor: 26, wisdom: 24, swift: 22, regen: 20, magnet: 18 };

export function pickChoice(game, choices) {
  const score = (c) => {
    if (c.type === 'evolve') return 100;
    if (c.type === 'weapon') return c.level > 1 ? 50 + c.level : (game.build.weapons.length < 4 ? 42 : 15);
    if (c.type === 'passive') return (PASSIVE_PRIORITY[c.id] || 10) + (c.level > 1 ? 6 : 0);
    return 1;
  };
  return [...choices].sort((a, b) => score(b) - score(a))[0];
}

/** 이번 프레임 이동 방향 */
export function steer(game, skill = 1) {
  const p = game.player;
  let mx = 0;
  let my = 0;
  for (const e of game.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d2 = dx * dx + dy * dy;
    const range = e.boss ? 420 : 240;
    if (d2 > range * range) continue;
    const d = Math.sqrt(d2) || 1;
    const w = (e.boss ? 6 : e.elite ? 3 : 1) / Math.max(30, d - e.r) ** 2;
    mx += (dx / d) * w;
    my += (dy / d) * w;
  }
  for (const b of game.bullets) {
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > 150 * 150) continue;
    const d = Math.sqrt(d2) || 1;
    // 탄의 진행 방향에 수직으로 피한다
    const side = Math.sign(dx * b.vy - dy * b.vx) || 1;
    const bl = len(b.vx, b.vy) || 1;
    mx += ((-b.vy / bl) * side * 2) / Math.max(20, d) ** 2;
    my += ((b.vx / bl) * side * 2) / Math.max(20, d) ** 2;
  }
  const threat = len(mx, my);
  // 위협이 적으면 가까운 보석·상자 쪽으로
  let target = null;
  let bd = 300 * 300;
  for (const g of [...game.items, ...game.gems.slice(0, 120)]) {
    const d2 = (g.x - p.x) ** 2 + (g.y - p.y) ** 2;
    if (d2 < bd) { bd = d2; target = g; }
  }
  let ax = 0;
  let ay = 0;
  if (target) {
    const d = Math.sqrt(bd) || 1;
    ax = (target.x - p.x) / d;
    ay = (target.y - p.y) / d;
  }
  let closest = Infinity;
  for (const e of game.enemies) {
    const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2 - e.r * e.r;
    if (d < closest) closest = d;
  }
  const calm = threat < 0.00015 / skill || closest > 110 * 110;
  let x = calm ? ax + mx * 4000 : mx / threat + ax * 0.35;
  let y = calm ? ay + my * 4000 : my / threat + ay * 0.35;
  // 넓게 원을 그리며 움직여 포위를 피한다
  x += Math.cos(game.t * 0.35) * 0.25;
  y += Math.sin(game.t * 0.35) * 0.25;
  const l = len(x, y) || 1;
  return { x: x / l, y: y / l };
}

/** 한 판을 끝까지 돌리고 요약을 돌려준다 */
export function simulate({ character = 'nova', meta = {}, seed = 1, maxTime = 660, dt = 1 / 30, revives = 0, skill = 1 } = {}) {
  const game = new Game({ character, meta, seed, fx: false });
  let adRevives = revives;
  const timeline = [];
  let nextMark = 60;
  while (game.t < maxTime) {
    if (game.state === 'levelup') { game.choose(pickChoice(game, game.choices)); continue; }
    if (game.state === 'chest') { game.choose(game.chest); continue; }
    if (game.state === 'dead') {
      if (game.useFreeRevive()) continue;
      if (adRevives > 0) { adRevives -= 1; game.revive(); continue; }
      break;
    }
    if (game.state === 'won') break;
    game.update(dt, steer(game, skill));
    if (game.t >= nextMark) {
      timeline.push({ t: nextMark, level: game.level, kills: game.kills, enemies: game.enemies.length, hp: Math.round(game.player.hp) });
      nextMark += 60;
    }
  }
  return { ...game.summary(), state: game.state, timeline };
}
