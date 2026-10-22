// 한국어·영어 문구. 브라우저 언어로 자동 선택하고 설정에서 바꿀 수 있다.
const STR = {
  en: {
    tagline: 'Survive the swarm for 10 minutes.',
    play: 'Play', upgrades: 'Upgrades', characters: 'Heroes', settings: 'Settings', back: 'Back',
    best: 'Best', gold: 'Gold', kills: 'Kills', level: 'Lv', time: 'Time',
    paused: 'Paused', resume: 'Resume', quit: 'Quit to menu', restart: 'Restart',
    levelUp: 'Level up!', chooseOne: 'Choose one', reroll: 'Reroll', rerollFree: 'Reroll ({n} free)', rerollAd: 'Reroll (watch ad)',
    new: 'NEW', evolve: 'EVOLVE', bossWarden: 'Warden', pause: 'Pause',
    daily: 'Daily reward', dailyDay: 'Day {n}', dailyClaim: 'Claim {n}', dailyAd: '×2 — watch ad', dailyGot: '+{n} gold!',
    tutMove: 'Move: drag anywhere or WASD / arrows', tutAuto: 'Your weapons fire on their own', tutGems: 'Grab green gems to level up and pick new powers',
    gfx: 'Graphics', gfxAuto: 'Auto', gfxHigh: 'High', gfxLow: 'Low (faster)', shareFailed: 'Could not share. Take a screenshot instead!', chest: 'Treasure!', take: 'Take it',
    youDied: 'You fell', reviveQ: 'Get back up?', reviveFree: 'Revive ({n} left)', reviveAd: 'Revive — watch ad', giveUp: 'Give up',
    victory: 'Swarm cleared!', gameOver: 'Run over', survived: 'Survived', goldEarned: 'Gold earned', bonus: 'Run bonus',
    doubleGold: 'Double gold — watch ad', doubled: 'Gold doubled!', share: 'Share', retry: 'Play again', menu: 'Menu',
    newBest: 'New best!', bossIncoming: 'Boss incoming', swarmIncoming: 'Swarm incoming', finalBoss: 'Final boss',
    buy: 'Buy', maxed: 'MAX', locked: 'Locked', unlock: 'Unlock', selected: 'Selected', select: 'Select',
    sfx: 'Sound effects', music: 'Music', shake: 'Screen shake', language: 'Language', on: 'On', off: 'Off',
    adFailed: 'No ad available right now. Try again later.', adLoading: 'Loading ad…',
    shareText: 'I survived {time} and destroyed {kills} enemies in NOVA SWARM. Can you beat it?', copied: 'Copied to clipboard',
    howTo: 'Move with WASD / arrows or drag. Weapons fire on their own.',
    loading: 'Loading…', notEnoughGold: 'Not enough gold',
    statDamage: 'Damage', statCooldown: 'Cooldown', statCount: 'Projectiles', statPierce: 'Pierce', statRadius: 'Radius', statSpin: 'Spin speed',
    statChains: 'Chains', statBlast: 'Blast radius', statWidth: 'Beam width', statLength: 'Beam length', statBeams: 'Beams', statMaxRadius: 'Wave size',
    statDrones: 'Drones', statSlow: 'Slow', statTick: 'Tick rate', statPush: 'Knockback', statSpeed: 'Speed', statSize: 'Size',
    goldFiller: '+{n} gold', healFiller: 'Restore {n} HP',
    weapons: {
      blaster: ['Pulse Blaster', 'Fires at the nearest enemy.'],
      orbit: ['Orbit Blades', 'Blades circle around you.'],
      aura: ['Nova Field', 'Damages and slows enemies close to you.'],
      arc: ['Arc Chain', 'Lightning jumps between enemies.'],
      missile: ['Seeker Missiles', 'Homing missiles that explode.'],
      beam: ['Prism Laser', 'A piercing beam toward enemies.'],
      wave: ['Shockwave', 'An expanding ring that knocks enemies back.'],
      drone: ['Helper Drones', 'Drones orbit you and shoot.'],
      hyperBlaster: ['Hyper Blaster', 'A storm of piercing bolts.'],
      sawHalo: ['Saw Halo', 'A wide ring of spinning saws.'],
      eventHorizon: ['Event Horizon', 'Pulls enemies in and crushes them.'],
      stormcall: ['Stormcall', 'Lightning chains across the screen.'],
      novaBarrage: ['Nova Barrage', 'A volley of huge explosions.'],
    },
    passives: {
      might: ['Might', '+10% damage'], haste: ['Overclock', '-8% weapon cooldown'], area: ['Amplifier', '+10% area'],
      vitality: ['Vitality', '+20 max HP'], regen: ['Nanites', '+0.3 HP per second'], swift: ['Thrusters', '+8% move speed'],
      magnet: ['Magnet', '+30% pickup range'], armor: ['Plating', '-1 damage taken'], crit: ['Focus', '+5% critical chance'],
      wisdom: ['Wisdom', '+8% experience'],
    },
    evolveHint: 'Max level + {passive} → evolves',
    meta: {
      power: ['Power', '+5% damage'], vitality: ['Vitality', '+10 max HP'], armor: ['Armor', '-1 damage taken'],
      recovery: ['Recovery', '+0.2 HP per second'], haste: ['Haste', '-3% cooldown'], speed: ['Speed', '+4% move speed'],
      magnet: ['Magnet', '+15% pickup range'], greed: ['Greed', '+10% gold'], growth: ['Growth', '+5% experience'],
      reroll: ['Reroll', '+1 free reroll each run'], revival: ['Revival', 'Revive once per run for free'],
    },
    chars: {
      nova: ['Nova', 'Balanced. Starts with Pulse Blaster.'],
      rook: ['Rook', 'Tough. Orbit Blades, +20 HP, +20% area, a bit slower.'],
      volt: ['Volt', 'Fast casts. Arc Chain, -10% cooldown, -10 HP.'],
      vex: ['Vex', 'Glass cannon. Seeker Missiles, +10% damage, -15 HP.'],
    },
  },
  ko: {
    tagline: '10분 동안 몰려오는 적을 버텨라.',
    play: '시작', upgrades: '강화', characters: '영웅', settings: '설정', back: '뒤로',
    best: '최고', gold: '골드', kills: '처치', level: 'Lv', time: '시간',
    paused: '일시정지', resume: '계속하기', quit: '메뉴로 나가기', restart: '다시 시작',
    levelUp: '레벨 업!', chooseOne: '하나를 고르세요', reroll: '다시 뽑기', rerollFree: '다시 뽑기 (무료 {n}회)', rerollAd: '다시 뽑기 (광고 보기)',
    new: '신규', evolve: '진화', bossWarden: '워든', pause: '일시정지',
    daily: '출석 보상', dailyDay: '{n}일째', dailyClaim: '{n} 골드 받기', dailyAd: '광고 보고 2배', dailyGot: '골드 +{n}!',
    tutMove: '이동: 화면을 끌거나 WASD·방향키', tutAuto: '무기는 자동으로 발사됩니다', tutGems: '초록 보석을 모아 레벨업하고 새 능력을 고르세요',
    gfx: '그래픽', gfxAuto: '자동', gfxHigh: '높음', gfxLow: '낮음 (빠름)', shareFailed: '공유하지 못했습니다. 화면을 캡처해 자랑해 보세요!', chest: '보물 상자!', take: '받기',
    youDied: '쓰러졌습니다', reviveQ: '다시 일어나시겠습니까?', reviveFree: '부활 ({n}회 남음)', reviveAd: '광고 보고 부활', giveUp: '포기하기',
    victory: '스웜 섬멸!', gameOver: '게임 오버', survived: '생존 시간', goldEarned: '획득 골드', bonus: '판 보너스',
    doubleGold: '광고 보고 골드 2배', doubled: '골드 2배 획득!', share: '공유', retry: '다시 하기', menu: '메뉴',
    newBest: '최고 기록!', bossIncoming: '보스 등장', swarmIncoming: '대규모 습격', finalBoss: '최종 보스',
    buy: '구매', maxed: '최대', locked: '잠김', unlock: '잠금 해제', selected: '선택됨', select: '선택',
    sfx: '효과음', music: '음악', shake: '화면 흔들림', language: '언어', on: '켜기', off: '끄기',
    adFailed: '지금은 볼 수 있는 광고가 없습니다. 잠시 후 다시 시도하세요.', adLoading: '광고 불러오는 중…',
    shareText: 'NOVA SWARM에서 {time} 버티고 적 {kills}마리를 처치했어요. 이길 수 있어요?', copied: '복사했습니다',
    howTo: 'WASD·방향키 또는 드래그로 이동. 무기는 자동으로 발사됩니다.',
    loading: '불러오는 중…', notEnoughGold: '골드가 부족합니다',
    statDamage: '피해', statCooldown: '쿨다운', statCount: '발사 수', statPierce: '관통', statRadius: '반경', statSpin: '회전 속도',
    statChains: '연쇄', statBlast: '폭발 범위', statWidth: '광선 굵기', statLength: '광선 길이', statBeams: '광선 수', statMaxRadius: '충격파 크기',
    statDrones: '드론 수', statSlow: '감속', statTick: '공격 주기', statPush: '밀쳐내기', statSpeed: '속도', statSize: '크기',
    goldFiller: '골드 +{n}', healFiller: '체력 {n} 회복',
    weapons: {
      blaster: ['펄스 블래스터', '가장 가까운 적에게 발사합니다.'],
      orbit: ['궤도 칼날', '칼날이 주위를 돕니다.'],
      aura: ['노바 필드', '가까운 적에게 피해를 주고 느리게 합니다.'],
      arc: ['아크 체인', '번개가 적 사이를 튑니다.'],
      missile: ['추적 미사일', '적을 쫓아가 폭발합니다.'],
      beam: ['프리즘 레이저', '적을 꿰뚫는 광선을 쏩니다.'],
      wave: ['충격파', '퍼져 나가며 적을 밀쳐냅니다.'],
      drone: ['지원 드론', '주위를 도는 드론이 사격합니다.'],
      hyperBlaster: ['하이퍼 블래스터', '꿰뚫는 탄환의 폭풍.'],
      sawHalo: ['톱날 후광', '넓게 도는 톱날 고리.'],
      eventHorizon: ['사건의 지평선', '적을 끌어당겨 짓누릅니다.'],
      stormcall: ['폭풍 소환', '화면을 가로지르는 연쇄 번개.'],
      novaBarrage: ['노바 폭격', '거대한 폭발을 연달아 터뜨립니다.'],
    },
    passives: {
      might: ['파괴력', '피해 +10%'], haste: ['오버클럭', '무기 쿨다운 -8%'], area: ['증폭기', '범위 +10%'],
      vitality: ['생명력', '최대 체력 +20'], regen: ['나노봇', '초당 체력 +0.3'], swift: ['추진기', '이동 속도 +8%'],
      magnet: ['자석', '줍는 범위 +30%'], armor: ['장갑', '받는 피해 -1'], crit: ['집중', '치명타 확률 +5%'],
      wisdom: ['지혜', '경험치 +8%'],
    },
    evolveHint: '최대 레벨 + {passive} → 진화',
    meta: {
      power: ['공격력', '피해 +5%'], vitality: ['체력', '최대 체력 +10'], armor: ['방어력', '받는 피해 -1'],
      recovery: ['회복', '초당 체력 +0.2'], haste: ['가속', '쿨다운 -3%'], speed: ['이동 속도', '이동 속도 +4%'],
      magnet: ['자석', '줍는 범위 +15%'], greed: ['탐욕', '골드 +10%'], growth: ['성장', '경험치 +5%'],
      reroll: ['다시 뽑기', '판마다 무료 다시 뽑기 +1'], revival: ['부활', '판마다 한 번 무료 부활'],
    },
    chars: {
      nova: ['노바', '균형형. 펄스 블래스터로 시작.'],
      rook: ['루크', '탱커. 궤도 칼날, 체력 +20, 범위 +20%, 조금 느림.'],
      volt: ['볼트', '연사형. 아크 체인, 쿨다운 -10%, 체력 -10.'],
      vex: ['벡스', '공격형. 추적 미사일, 피해 +10%, 체력 -15.'],
    },
  },
};

let lang = 'en';

export function detectLang(saved) {
  if (saved && STR[saved]) return saved;
  const nav = (globalThis.navigator?.language || 'en').toLowerCase();
  return nav.startsWith('ko') ? 'ko' : 'en';
}

export function setLang(l) { lang = STR[l] ? l : 'en'; }
export function getLang() { return lang; }
export const LANGS = { en: 'English', ko: '한국어' };

/** t('rerollFree', { n: 2 }) */
export function t(key, vars) {
  let s = STR[lang][key] ?? STR.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

export const nameOf = (group, id) => (STR[lang][group]?.[id] || STR.en[group]?.[id] || [id, ''])[0];
export const descOf = (group, id) => (STR[lang][group]?.[id] || STR.en[group]?.[id] || [id, ''])[1];
export { STR };
