// 한국어·영어 문구
const STR = {
  en: {
    tagline: 'Drag. Drop. Clear the lines.', play: 'Play', resume: 'Continue game', daily: 'Daily challenge', dailyBest: "Today's best {n}",
    settings: 'Settings', back: 'Back', best: 'Best', score: 'Score', paused: 'Paused', restart: 'Restart', menu: 'Menu',
    gameOver: 'No more moves', newBest: 'New best!', reviveAd: 'Clear 3 lines — watch ad', retry: 'Play again', share: 'Share',
    shuffleAd: 'New blocks — watch ad', adFailed: 'No ad available right now. Try again later.', adLoading: 'Loading ad…', loading: 'Loading…',
    sfx: 'Sound effects', music: 'Music', language: 'Language', howTo: 'Drag blocks onto the board. Fill a row or column to clear it.',
    combo: 'COMBO ×{n}', good: 'GOOD!', great: 'GREAT!', amazing: 'AMAZING!', perfect: 'PERFECT CLEAR!',
    shareText: 'I scored {score} in NOVA BLOCKS. Can you beat it?', copied: 'Copied to clipboard', shareFailed: 'Could not share.',
    lines: 'Lines', bestCombo: 'Best combo', dailyTag: 'Daily · {day}', pause: 'Pause', moreGames: 'More free games',
  },
  ko: {
    tagline: '끌어서 놓고, 줄을 지워라.', play: '시작', resume: '이어서 하기', daily: '일일 도전', dailyBest: '오늘 최고 {n}',
    settings: '설정', back: '뒤로', best: '최고', score: '점수', paused: '일시정지', restart: '다시 시작', menu: '메뉴',
    gameOver: '더 놓을 곳이 없습니다', newBest: '최고 기록!', reviveAd: '광고 보고 3줄 지우기', retry: '다시 하기', share: '공유',
    shuffleAd: '광고 보고 블록 바꾸기', adFailed: '지금은 볼 수 있는 광고가 없습니다. 잠시 후 다시 시도하세요.', adLoading: '광고 불러오는 중…', loading: '불러오는 중…',
    sfx: '효과음', music: '음악', language: '언어', howTo: '블록을 판으로 끌어 놓으세요. 가로나 세로 한 줄을 채우면 사라집니다.',
    combo: '콤보 ×{n}', good: '좋아요!', great: '훌륭해요!', amazing: '대단해요!', perfect: '판 전체 클리어!',
    shareText: 'NOVA BLOCKS에서 {score}점! 이길 수 있어요?', copied: '복사했습니다', shareFailed: '공유하지 못했습니다.',
    lines: '지운 줄', bestCombo: '최고 콤보', dailyTag: '일일 도전 · {day}', pause: '일시정지', moreGames: '다른 무료 게임',
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
