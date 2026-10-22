// 업적: 판 결과와 누적 기록으로 판정한다. 달성하면 골드를 준다.
import { CHARACTERS } from './data.js';

/** run: 방금 끝난 판의 요약 (없으면 누적 기록만 본다), p: 프로필 */
export const ACHIEVEMENTS = [
  { id: 'kills100', gold: 50, test: (p, r) => r && r.kills >= 100 },
  { id: 'survive3', gold: 100, test: (p, r) => r && r.time >= 180 },
  { id: 'survive5', gold: 150, test: (p, r) => r && r.time >= 300 },
  { id: 'level20', gold: 120, test: (p, r) => r && r.level >= 20 },
  { id: 'warden', gold: 200, test: (p, r) => r && r.bossKills >= 1 },
  { id: 'evolve1', gold: 150, test: (p, r) => r && r.evolved >= 1 },
  { id: 'fullBuild', gold: 150, test: (p, r) => r && r.weaponCount >= 6 },
  { id: 'untouched', gold: 300, test: (p, r) => r && r.noHitTime >= 120 },
  { id: 'kills1000', gold: 200, test: (p, r) => r && r.kills >= 1000 },
  { id: 'clearGrid', gold: 500, test: (p, r) => r && r.won && r.stage === 'grid' },
  { id: 'evolve3', gold: 400, test: (p, r) => r && r.evolved >= 3 },
  { id: 'level40', gold: 300, test: (p, r) => r && r.level >= 40 },
  { id: 'clearRift', gold: 800, test: (p, r) => r && r.won && r.stage === 'rift' },
  { id: 'endless15', gold: 600, test: (p, r) => r && r.time >= 900 },
  { id: 'clearVoid', gold: 1500, test: (p, r) => r && r.won && r.stage === 'void' },
  { id: 'runs10', gold: 100, test: (p) => p.stats.runs >= 10 },
  { id: 'runs50', gold: 400, test: (p) => p.stats.runs >= 50 },
  { id: 'totalKills10k', gold: 300, test: (p) => p.stats.kills >= 10000 },
  { id: 'totalKills100k', gold: 1200, test: (p) => p.stats.kills >= 100000 },
  { id: 'shopper', gold: 150, test: (p) => Object.values(p.meta).reduce((s, v) => s + v, 0) >= 10 },
  { id: 'allHeroes', gold: 500, test: (p) => Object.keys(CHARACTERS).every((c) => p.characters.includes(c)) },
  { id: 'streak7', gold: 500, test: (p) => p.daily.streak >= 7 },
];

/** 새로 달성한 업적을 기록하고 보상을 지급한다. 달성 목록을 돌려준다. */
export function checkAchievements(p, run = null) {
  const done = new Set(p.achievements);
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (done.has(a.id)) continue;
    if (a.test(p, run)) {
      p.achievements.push(a.id);
      p.gold += a.gold;
      fresh.push(a);
    }
  }
  return fresh;
}
