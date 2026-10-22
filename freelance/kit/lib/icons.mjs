// 선 아이콘 (24×24, 직접 그린 것이라 라이선스 걱정 없음). 사용: icon('coffee')
const P = {
  coffee: 'M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Zm12 1h1.5a2.5 2.5 0 0 1 0 5H16M7 3c0 1.5 1 1.5 1 3M11 3c0 1.5 1 1.5 1 3',
  leaf: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14H5Zm0 0 8-8',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M12 8l1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5L12 8Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2',
  pin: 'M12 21s-7-6-7-11a7 7 0 1 1 14 0c0 5-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  chat: 'M4 5h16v11H9l-5 4V5Zm4 5h.01M12 10h.01M16 10h.01',
  calendar: 'M4 6h16v14H4V6Zm0 4h16M8 3v4M16 3v4M8 14h3',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8-4.3-4.1 5.9-.9L12 3.5Z',
  heart: 'M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11Z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Zm-3.5 9 2.5 2.5 4.5-5',
  home: 'M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5',
  ruler: 'M3 16 16 3l5 5L8 21l-5-5Zm4-1 2 2M10 12l2 2M13 9l2 2',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M18 14a6 6 0 0 1 4 6',
  chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  lock: 'M6 11h12v9H6v-9Zm2 0V8a4 4 0 1 1 8 0v3',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Zm4 4h4',
  wallet: 'M4 7h15a1 1 0 0 1 1 1v11H4a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2h11v3M16 13h.01',
  check: 'M5 12.5 10 17l9-10',
  gift: 'M4 11h16v9H4v-9Zm-1-4h18v4H3V7Zm9 0v13M12 7c-1-3-5-4-5-1.5S10 7 12 7Zm0 0c1-3 5-4 5-1.5S14 7 12 7Z',
  truck: 'M3 6h11v10H3V6Zm11 4h4l3 3v3h-7v-6ZM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
  wave: 'M3 9c3-3 6 3 9 0s6-3 9 0M3 15c3-3 6 3 9 0s6-3 9 0',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  zap: 'M13 3 5 13h6l-1 8 8-10h-6l1-8Z',
  camera: 'M4 8h4l2-3h4l2 3h4v11H4V8Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  award: 'M12 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm-4 0-2 8 6-3 6 3-2-8',
  smile: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-4-7a5 5 0 0 0 8 0M9 9.5h.01M15 9.5h.01',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm5-9.5h.01',
  mail: 'M3 6h18v12H3V6Zm0 0 9 7 9-7',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  car: 'M5 16h14v-4l-2-5H7l-2 5v4Zm0 0v3m14-3v3M5 12h14M8 14h.01M16 14h.01',
};

export const ICONS = Object.keys(P);

export function icon(name, cls = 'ico') {
  const d = P[name];
  if (!d) throw new Error(`없는 아이콘: ${name} (사용 가능: ${ICONS.join(', ')})`);
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
