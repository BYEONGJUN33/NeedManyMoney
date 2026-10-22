// 사용법: node sim/run.mjs [판 수] [meta 프리셋: none|mid|max] [캐릭터]
import { simulate } from '../src/bot.js';
import { META } from '../src/data.js';

const runs = Number(process.argv[2] || 8);
const preset = process.argv[3] || 'none';
const character = process.argv[4] || 'nova';
const meta = Object.fromEntries(Object.entries(META).map(([k, m]) => [k, preset === 'max' ? m.max : preset === 'mid' ? Math.ceil(m.max / 2) : 0]));
if (preset !== 'max') meta.revival = 0;

const started = Date.now();
const results = [];
for (let i = 0; i < runs; i += 1) results.push(simulate({ character, meta, seed: 1000 + i }));
const avg = (f) => results.reduce((s, r) => s + f(r), 0) / results.length;
console.log(JSON.stringify({
  preset, character, runs,
  avgTime: Math.round(avg((r) => r.time)), minTime: Math.min(...results.map((r) => r.time)), maxTime: Math.max(...results.map((r) => r.time)),
  wins: results.filter((r) => r.won).length, avgLevel: +avg((r) => r.level).toFixed(1), avgKills: Math.round(avg((r) => r.kills)),
  avgGold: Math.round(avg((r) => r.gold)), ms: Date.now() - started,
}));
console.log(results.map((r) => `${r.time}s L${r.level} k${r.kills} ${r.weapons.map((w) => `${w.evolved || w.id}${w.evolved ? '' : w.level}`).join(',')}`).join('\n'));
console.log(JSON.stringify(results[0].timeline));
