// 계산 기준값. 요율이 바뀌면 이 파일만 고치면 모든 계산기와 연봉표에 반영된다.
export const BASIS = {
  label: '2026년 10월',
  updated: '2026-10-21',
};

// 4대보험 근로자 부담분
export const INSURANCE = {
  // 국민연금 9.5%의 절반. 기준소득월액 상·하한은 2026.7 ~ 2027.6 적용분
  pension: { rate: 0.0475, minBase: 410_000, maxBase: 6_590_000 },
  // 건강보험 7.09% → 7.19% (2026)
  health: { rate: 0.03595, totalRate: 0.0719 },
  // 장기요양 소득 대비 0.9448%, 건강보험료 대비 13.14%
  care: { incomeRate: 0.009448 },
  employment: { rate: 0.009 },
};

export const LOCAL_TAX_RATE = 0.1;

// 근로소득 간이세액표의 8세 이상 20세 이하 자녀 공제 (2026.3.1 이후 지급분)
export const CHILD_CREDIT = { one: 20_830, two: 45_830, extra: 33_330 };

export const MIN_WAGE = {
  2026: 10_320,
  2027: 10_700,
};

// 이자소득 원천징수 세율
export const INTEREST_TAX = {
  normal: { label: '일반과세 15.4%', rate: 0.154 },
  preferential: { label: '세금우대 9.5%', rate: 0.095 },
  exempt: { label: '비과세', rate: 0 },
};

// 종합소득세 기본세율 (2023년 귀속분부터)
export const TAX_BRACKETS = [
  { upTo: 14_000_000, rate: 0.06, deduction: 0 },
  { upTo: 50_000_000, rate: 0.15, deduction: 1_260_000 },
  { upTo: 88_000_000, rate: 0.24, deduction: 5_760_000 },
  { upTo: 150_000_000, rate: 0.35, deduction: 15_440_000 },
  { upTo: 300_000_000, rate: 0.38, deduction: 19_940_000 },
  { upTo: 500_000_000, rate: 0.40, deduction: 25_940_000 },
  { upTo: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
  { upTo: Infinity, rate: 0.45, deduction: 65_940_000 },
];
