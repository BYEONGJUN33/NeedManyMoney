// 한국어·영어 문구
const STR = {
  en: {
    tagline: 'Drop. Merge. Reach the NOVA.', play: 'Play', resume: 'Continue game', daily: 'Daily challenge', dailyBest: "Today's best {n}",
    settings: 'Settings', back: 'Back', best: 'Best', score: 'Score', paused: 'Paused', restart: 'Restart', menu: 'Menu',
    gameOver: 'The jar overflowed', newBest: 'New best!', reviveAd: 'Clear top half (ad)', retry: 'Play again', share: 'Share',
    popAd: 'Pop small orbs (ad)', adFailed: 'No ad available right now. Try again later.', adLoading: 'Loading ad…', loading: 'Loading…',
    sfx: 'Sound effects', music: 'Music', language: 'Language', howTo: 'Move to aim, release to drop. Two equal orbs merge into a bigger one. Don’t let them pile over the line.',
    next: 'NEXT', merges: 'Merges', biggest: 'Biggest orb', nova: 'NOVA!', bigMerge: 'BIG MERGE!', newOrb: 'NEW ORB!',
    shareText: 'I scored {score} in NOVA MERGE. Can you beat it?', copied: 'Copied to clipboard', shareFailed: 'Could not share.',
    dailyTag: 'Daily · {day}', moreGames: 'More free games', tier: 'Tier {n}',
  },
  ko: {
    tagline: '떨어뜨리고, 합치고, NOVA까지.', play: '시작', resume: '이어서 하기', daily: '일일 도전', dailyBest: '오늘 최고 {n}',
    settings: '설정', back: '뒤로', best: '최고', score: '점수', paused: '일시정지', restart: '다시 시작', menu: '메뉴',
    gameOver: '통이 넘쳤습니다', newBest: '최고 기록!', reviveAd: '광고 보고 위쪽 절반 비우기', retry: '다시 하기', share: '공유',
    popAd: '광고 보고 작은 구슬 터뜨리기', adFailed: '지금은 볼 수 있는 광고가 없습니다. 잠시 후 다시 시도하세요.', adLoading: '광고 불러오는 중…', loading: '불러오는 중…',
    sfx: '효과음', music: '음악', language: '언어', howTo: '좌우로 움직여 조준하고 손을 떼면 떨어집니다. 같은 구슬 두 개가 닿으면 더 큰 구슬이 됩니다. 선 위로 쌓이지 않게 하세요.',
    next: '다음', merges: '합친 횟수', biggest: '가장 큰 구슬', nova: 'NOVA!', bigMerge: '대형 합체!', newOrb: '새 구슬!',
    shareText: 'NOVA MERGE에서 {score}점! 이길 수 있어요?', copied: '복사했습니다', shareFailed: '공유하지 못했습니다.',
    dailyTag: '일일 도전 · {day}', moreGames: '다른 무료 게임', tier: '{n}단계',
  },
};

let lang = 'en';
export function detectLang(saved) {
  if (saved && STR[saved]) return saved;
  return (globalThis.navigator?.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}
export function setLang(l) { lang = STR[l] ? l : 'en'; }
export function getLang() { return lang; }
export const LANGS = { en: 'English', ko: '한국어' };
export function t(key, vars) {
  let s = STR[lang][key] ?? STR.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}
export { STR };
