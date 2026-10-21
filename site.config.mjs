// 배포 전에 이 파일만 채우면 된다. 비어 있는 항목은 해당 기능을 끈다.
export default {
  name: '머니셈',
  tagline: '2026 연봉·퇴직금·대출·예적금·시급 계산기',

  // 사이트 주소 (끝에 / 없이). 커스텀 도메인을 연결하면 그 주소로 바꾼다.
  // GitHub Pages 기본 주소 예: https://<아이디>.github.io/<저장소>
  siteUrl: process.env.SITE_URL || 'https://byeongjun33.github.io/NeedManyMoney',

  // 문의 메일 (소개 페이지에 공개됨). AdSense 심사에 연락처가 있으면 유리하다.
  contactEmail: '',

  // ── 광고 ──
  // Google AdSense 게시자 ID. 예: 'ca-pub-1234567890123456'
  adsenseClient: process.env.ADSENSE_CLIENT || '',
  // 수동 광고 단위 슬롯 ID (계산기 아래 middle, 푸터 위 bottom). 비우면 자동 광고만 사용한다.
  adsenseSlots: { middle: '', bottom: '' },

  // 카카오 애드핏 광고 단위 ID (DAN-로 시작). 애드센스 승인 전 수익원으로 쓰기 좋다.
  // 애드센스 슬롯이 비어 있는 자리에만 들어간다. 광고 단위를 만들 때 고른 크기를 adfitSize에 맞춘다.
  adfitUnits: { middle: '', bottom: '' },
  adfitSize: [320, 100],

  // ── 분석·검색 등록 ──
  gaMeasurementId: process.env.GA_ID || '', // 'G-XXXXXXXXXX'
  googleSiteVerification: '',
  naverSiteVerification: '',
};
