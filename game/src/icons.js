// 무기·패시브·강화 아이콘 (작은 SVG). 색은 data.js의 무기 색을 쓴다.
import { WEAPONS, EVOLVED } from './data.js';

const svg = (body, color) => `<svg viewBox="0 0 32 32" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const WEAPON_ICON = {
  blaster: '<circle cx="9" cy="16" r="4" fill="currentColor"/><path d="M15 16h12M15 10l10-3M15 22l10 3"/>',
  orbit: '<circle cx="16" cy="16" r="3"/><circle cx="16" cy="16" r="11" stroke-dasharray="3 5"/><path d="M16 3l3 4h-6zM16 29l-3-4h6z" fill="currentColor"/>',
  aura: '<circle cx="16" cy="16" r="4" fill="currentColor"/><circle cx="16" cy="16" r="9" opacity=".7"/><circle cx="16" cy="16" r="13" opacity=".35"/>',
  arc: '<path d="M18 3L8 18h7l-2 11 11-16h-7z" fill="currentColor"/>',
  missile: '<path d="M6 26l6-2 13-13a3 3 0 0 0-4-4L8 20z"/><path d="M6 26l2-6M12 24l2 2"/>',
  beam: '<path d="M4 16h24" stroke-width="5"/><path d="M4 16h24" stroke="#fff" stroke-width="1.5"/><circle cx="6" cy="16" r="3" fill="currentColor"/>',
  wave: '<circle cx="16" cy="16" r="3" fill="currentColor"/><path d="M8 9a11 11 0 0 0 0 14M24 9a11 11 0 0 1 0 14M4 5a17 17 0 0 0 0 22M28 5a17 17 0 0 1 0 22"/>',
  drone: '<path d="M16 7l7 12H9z" fill="currentColor"/><circle cx="7" cy="24" r="2"/><circle cx="25" cy="24" r="2"/><path d="M16 19v6"/>',
};

const PASSIVE_ICON = {
  might: ['#ff4f6d', '<path d="M16 3l3 10h-6zM11 13h10l-5 16z" fill="currentColor"/>'],
  haste: ['#3df2ff', '<path d="M8 8l8 8-8 8M16 8l8 8-8 8"/>'],
  area: ['#a66bff', '<circle cx="16" cy="16" r="4"/><circle cx="16" cy="16" r="9"/><circle cx="16" cy="16" r="13" opacity=".5"/>'],
  vitality: ['#ff4f6d', '<path d="M16 27S5 20 5 12a5.5 5.5 0 0 1 11-1 5.5 5.5 0 0 1 11 1c0 8-11 15-11 15z" fill="currentColor"/>'],
  regen: ['#7dff6a', '<path d="M16 6v20M6 16h20" stroke-width="4"/>'],
  swift: ['#5aa8ff', '<path d="M4 20h14M8 14h14M12 8h14M20 24l8-8"/>'],
  magnet: ['#3df2ff', '<path d="M8 6v10a8 8 0 0 0 16 0V6"/><path d="M8 6h4M20 6h4" stroke="#ff4f6d"/>'],
  armor: ['#8aa0c4', '<path d="M16 3l11 4v8c0 7-5 12-11 14C10 27 5 22 5 15V7z"/>'],
  crit: ['#ffe14d', '<circle cx="16" cy="16" r="10"/><path d="M16 2v8M16 22v8M2 16h8M22 16h8"/>'],
  wisdom: ['#c6ff3d', '<path d="M16 4l3.5 7.5L28 13l-6 6 1.5 8.5L16 23l-7.5 4.5L10 19l-6-6 8.5-1.5z"/>'],
};

const META_ICON = {
  power: 'might', vitality: 'vitality', armor: 'armor', recovery: 'regen', haste: 'haste', speed: 'swift',
  magnet: 'magnet', greed: null, growth: 'wisdom', reroll: null, revival: null,
};

export function weaponIcon(id, evolved) {
  const color = evolved ? EVOLVED[evolved].color : WEAPONS[id].color;
  return svg(WEAPON_ICON[id].replaceAll('currentColor', color), color);
}

export function passiveIcon(id) {
  const [color, body] = PASSIVE_ICON[id];
  return svg(body.replaceAll('currentColor', color), color);
}

export function metaIcon(id) {
  if (META_ICON[id]) return passiveIcon(META_ICON[id]);
  if (id === 'greed') return svg('<path d="M9 5h14l5 11-5 11H9L4 16z" fill="#ffd23d"/>', '#ffd23d');
  if (id === 'reroll') return svg('<path d="M26 12a10 10 0 1 0 1 8"/><path d="M27 5v7h-7"/>', '#3df2ff');
  return svg('<path d="M16 27S5 20 5 12a5.5 5.5 0 0 1 11-1 5.5 5.5 0 0 1 11 1c0 8-11 15-11 15z"/><path d="M16 10v10M11 15h10" stroke="#fff"/>', '#ff4f6d');
}

export function choiceIcon(c) {
  if (c.type === 'weapon') return weaponIcon(c.id);
  if (c.type === 'evolve') return weaponIcon(c.id, c.into);
  if (c.type === 'passive') return passiveIcon(c.id);
  if (c.type === 'gold') return metaIcon('greed');
  return passiveIcon('regen');
}
